import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCourseDto } from './dto';

import { ContributionsService } from '../contributions/contributions.service';
import { StatsService } from '../stats/stats.service';

@Injectable()
export class CoursesService {
    // XP awarded per correctly answered course challenge
    private static readonly CHALLENGE_XP = 10;

    constructor(
        private readonly prisma: PrismaService,
        private readonly contributionsService: ContributionsService,
        private readonly statsService: StatsService,
    ) { }

    // Create a full course hierarchy
    // Structure:
    // 1. COURSE: Top level (e.g. "Spanish")
    //    -> 2. UNITS: Chapters/Sections (e.g. "Unit 1: Introductions")
    //       -> 3. LESSONS: Individual learning modules (e.g. "Lesson 1: Hola")
    //          -> 4. CHALLENGES: Specific questions/exercises (e.g. "Translate 'Hello'")
    async create(createCourseDto: CreateCourseDto) {
        return this.prisma.course.create({
            data: {
                title: createCourseDto.title,
                imageSrc: createCourseDto.imageSrc,
                description: createCourseDto.description,
                isPublished: createCourseDto.isPublished ?? false,
                units: {
                    create: createCourseDto.units?.map((unit, uIndex) => ({
                        title: unit.title,
                        description: unit.description,
                        order: unit.order ?? uIndex + 1,
                        lessons: {
                            create: unit.lessons?.map((lesson, lIndex) => ({
                                title: lesson.title,
                                description: lesson.description,
                                difficulty: lesson.difficulty || 'EASY',
                                order: lesson.order ?? lIndex + 1,
                                challenges: {
                                    create: lesson.challenges?.map((challenge, cIndex) => ({
                                        question: challenge.question,
                                        type: challenge.type || 'SELECT',
                                        order: challenge.order ?? cIndex + 1,
                                        options: {
                                            create: challenge.options,
                                        },
                                    })),
                                },
                            })),
                        },
                    })),
                },
            },
            include: {
                units: {
                    include: {
                        lessons: {
                            include: {
                                challenges: true,
                            },
                        },
                    },
                },
            },
        });
    }

    // Find all published courses
    async findAll() {
        return this.prisma.course.findMany({
            where: { isPublished: true },
            include: {
                units: {
                    orderBy: { order: 'asc' },
                    include: {
                        lessons: {
                            orderBy: { order: 'asc' },
                        },
                    },
                },
            },
        });
    }

    // Find one course with structure
    // Find one course with structure
    async findOne(id: number, userId?: number) {
        const course = await this.prisma.course.findUnique({
            where: { id },
            include: {
                units: {
                    orderBy: { order: 'asc' },
                    include: {
                        lessons: {
                            orderBy: { order: 'asc' },
                            include: {
                                challenges: {
                                    orderBy: { order: 'asc' },
                                    include: {
                                        options: true,
                                    }
                                }
                            }
                        },
                    },
                },
            },
        });

        if (!course) throw new NotFoundException('Course not found');

        // If no user, return course as is (all locked/default)
        if (!userId) {
            return course;
        }

        // Fetch user's completed challenges for this course context
        let progress = await this.prisma.challengeProgress.findMany({
            where: {
                userId,
                isCompleted: true,
                challenge: {
                    lesson: {
                        unit: {
                            courseId: id
                        }
                    }
                }
            },
            select: { challengeId: true }
        });

        // Debug/Dev "Smart Fallback": If current user has NO progress, try to borrow from "Debug User".
        // This solves the common issue where a dev logs in as a new user but wants to see unlocked content from previous tests.
        if (progress.length === 0) {
            const debugUser = await this.getDebugUser();
            if (debugUser && debugUser.id !== userId) {
                const debugProgress = await this.prisma.challengeProgress.findMany({
                    where: {
                        userId: debugUser.id,
                        isCompleted: true,
                        challenge: {
                            lesson: {
                                unit: {
                                    courseId: id
                                }
                            }
                        }
                    },
                    select: { challengeId: true }
                });

                if (debugProgress.length > 0) {
                    console.log(`[CoursesService] User ${userId} has 0 progress. Inheriting ${debugProgress.length} items from Debug User ${debugUser.id} for testing.`);
                    progress = debugProgress;
                }
            }
        }

        const completedChallengeIds = new Set(progress.map(p => p.challengeId));

        // Enrich course data with completion status
        const enrichedUnits = course.units.map(unit => ({
            ...unit,
            lessons: unit.lessons.map(lesson => {
                const isCompleted = lesson.challenges.length > 0 &&
                    lesson.challenges.every(c => completedChallengeIds.has(c.id));

                return {
                    ...lesson,
                    isCompleted
                };
            })
        }));

        return {
            ...course,
            units: enrichedUnits
        };
    }

    // Add a Unit to an existing Course
    // Units are like "Chapters" or "Sections" in a textbook.
    // Example: In a "Maths" course, a Unit could be "Algebra".
    async addUnit(courseId: number, createUnitDto: any) {
        // Check if course exists
        const course = await this.prisma.course.findUnique({ where: { id: courseId } });
        if (!course) throw new NotFoundException(`Course with ID ${courseId} not found`);

        return this.prisma.unit.create({
            data: {
                courseId,
                title: createUnitDto.title,
                description: createUnitDto.description,
                order: createUnitDto.order ?? 1,
                lessons: {
                    create: createUnitDto.lessons?.map((lesson: any, lIndex: number) => ({
                        title: lesson.title,
                        description: lesson.description,
                        order: lesson.order ?? lIndex + 1,
                        challenges: {
                            create: lesson.challenges?.map((challenge: any, cIndex) => ({
                                question: challenge.question,
                                explanation: challenge.explanation,
                                solution: challenge.solution,
                                type: challenge.type || 'SELECT',
                                order: challenge.order ?? cIndex + 1,
                                options: {
                                    create: challenge.options,
                                },
                            })),
                        },
                    })),
                },
            },
            include: {
                lessons: {
                    include: {
                        challenges: true,
                    }
                }
            }
        });
    }

    // Add a Lesson to an existing Unit
    // Lessons are the actual study sessions within a Unit.
    // Example: In "Algebra" unit, a Lesson could be "Solving Linear Equations".
    // A Lesson contains multiple Challenges (questions).
    async addLesson(unitId: number, createLessonDto: any) {
        // Check if unit exists
        const unit = await this.prisma.unit.findUnique({ where: { id: unitId } });
        if (!unit) throw new NotFoundException(`Unit with ID ${unitId} not found`);

        return this.prisma.lesson.create({
            data: {
                unitId,
                title: createLessonDto.title,
                description: createLessonDto.description,
                difficulty: createLessonDto.difficulty || 'EASY',
                order: createLessonDto.order ?? 1,
                challenges: {
                    create: createLessonDto.challenges?.map((challenge: any, cIndex: number) => ({
                        question: challenge.question,
                        explanation: challenge.explanation,
                        solution: challenge.solution,
                        type: challenge.type || 'SELECT',
                        order: challenge.order ?? cIndex + 1,
                        options: {
                            create: challenge.options,
                        },
                    })),
                },
            },
            include: {
                challenges: {
                    include: {
                        options: true,
                    }
                }
            }
        });
    }

    // Bulk Import Content from JSON
    async importContent(courseId: number, data: any) {
        const course = await this.prisma.course.findUnique({ where: { id: courseId } });
        if (!course) throw new NotFoundException(`Course with ID ${courseId} not found`);

        // data.units should be an array of units
        if (data.units && Array.isArray(data.units)) {
            for (let uIndex = 0; uIndex < data.units.length; uIndex++) {
                const unitData = data.units[uIndex];
                await this.prisma.unit.create({
                    data: {
                        courseId,
                        title: unitData.title,
                        description: unitData.description || '',
                        order: unitData.order ?? uIndex + 1,
                        lessons: {
                            create: unitData.lessons?.map((lesson: any, lIndex: number) => ({
                                title: lesson.title,
                                description: lesson.description,
                                difficulty: lesson.difficulty || 'EASY',
                                order: lesson.order ?? lIndex + 1,
                                challenges: {
                                    create: lesson.challenges?.map((challenge: any, cIndex: number) => ({
                                        question: challenge.question,
                                        explanation: challenge.explanation,
                                        solution: challenge.solution,
                                        type: challenge.type || 'SELECT',
                                        order: challenge.order ?? cIndex + 1,
                                        options: {
                                            create: challenge.options?.map((option: any) => ({
                                                text: option.text,
                                                correct: option.correct || false,
                                                imageSrc: option.imageSrc,
                                                audioSrc: option.audioSrc,
                                            })),
                                        },
                                    })),
                                },
                            })),
                        },
                    },
                });
            }
        }

        return { success: true, message: 'Content imported successfully' };
    }

    // Check Challenge Answer & Update Progress
    async checkChallenge(userId: number, dto: any) {
        const { challengeId, optionId } = dto;

        // 1. Fetch Challenge & Option
        const challenge = await this.prisma.challenge.findUnique({
            where: { id: challengeId },
            include: { options: true, lesson: { include: { unit: true } } }
        });

        if (!challenge) throw new NotFoundException('Challenge not found');

        const selectedOption = challenge.options.find(o => o.id === optionId);
        if (!selectedOption) throw new NotFoundException('Option not found');

        const isCorrect = selectedOption.correct;

        // 2. Record Progress
        // Upsert progress: meaningful if we want to track retries or just completion
        await this.prisma.challengeProgress.upsert({
            where: {
                userId_challengeId: {
                    userId,
                    challengeId
                }
            },
            update: {
                isCompleted: isCorrect ? true : undefined, // Only mark completed if correct
                completedAt: isCorrect ? new Date() : undefined
            },
            create: {
                userId,
                challengeId,
                isCompleted: isCorrect,
                completedAt: isCorrect ? new Date() : null
            }
        });

        // 3. Update User Stats / Currency
        if (isCorrect) {
            // Log activity for heatmap
            await this.contributionsService.logActivity(userId);

            // Award XP — this feeds UserStats.xp, which drives the leaderboard
            await this.statsService.updateStats(userId, {
                xp: CoursesService.CHALLENGE_XP,
            });
        }

        return {
            correct: isCorrect,
            message: isCorrect ? 'Correct!' : 'Incorrect',
            explanation: challenge.explanation, // Show explanation after answer
            solution: challenge.solution
        };
    }

    // Get User Progress for a Course
    // Returns list of completed challenge IDs, lesson completion status, etc.
    async getUserProgress(userId: number, courseId: number) {
        // 1. Get all completed challenges for this user in this course
        // We filter by course via simple join or just fetch all user's challenge progress and map in memory
        // A optimized query would be:
        const progress = await this.prisma.challengeProgress.findMany({
            where: {
                userId,
                isCompleted: true,
                challenge: {
                    lesson: {
                        unit: {
                            courseId
                        }
                    }
                }
            },
            select: {
                challengeId: true
            }
        });

        const completedChallengeIds = progress.map(p => p.challengeId);

        return {
            completedChallengeIds
        };

    }

    // Get Single Lesson with Challenges
    async findLesson(id: number) {
        const lesson = await this.prisma.lesson.findUnique({
            where: { id },
            include: {
                challenges: {
                    orderBy: { order: 'asc' },
                    include: {
                        options: true
                    }
                }
            }
        });

        if (!lesson) throw new NotFoundException('Lesson not found');
        return lesson;
    }

    // Get Lesson Info (for Pre-Quiz Modal)
    async getLessonInfo(id: number) {
        const lesson = await this.prisma.lesson.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                description: true,
                difficulty: true,
                _count: {
                    select: { challenges: true }
                }
            }
        });

        if (!lesson) throw new NotFoundException('Lesson not found');

        return {
            ...lesson,
            questionCount: lesson._count.challenges,
            _count: undefined
        };
    }

    async getDebugUser() {
        return this.prisma.user.findFirst();
    }
}

