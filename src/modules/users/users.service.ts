import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserProfileDto } from './dto/user-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(private readonly prisma: PrismaService) { }


    async getUserStats(userId: number) {
        const stats = await this.prisma.userStats.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });

        if (!stats) {

            return this.initializeUserStats(userId);
        }


        const rank = await this.prisma.userStats.count({
            where: {
                xp: { gt: stats.xp },
            },
        });

        const quizzesSolved = await this.prisma.attempt.count({
            where: {
                userId,
                status: 'completed'
            }
        });


        return {
            ...stats,
            totalStudyTimeSeconds: Number(stats.totalStudyTimeSeconds),
            globalRank: rank + 1,
            quizzesSolved,
        };
    }


    async getHeatmap(userId: number, year: number = new Date().getFullYear()) {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year + 1, 0, 1);

        const logs = await this.prisma.userActivityLog.findMany({
            where: {
                userId,
                activityDate: {
                    gte: startDate,
                    lt: endDate,
                },
            },
            select: {
                activityDate: true,
                studySeconds: true,
                quizzesSolved: true,
            },
            orderBy: {
                activityDate: 'asc',
            },
        });

        return logs.map((log) => ({
            date: log.activityDate.toISOString().split('T')[0],
            count: log.quizzesSolved + Math.ceil(log.studySeconds / 60), // Weighted score for heatmap intensity
            details: {
                studySeconds: log.studySeconds,
                quizzesSolved: log.quizzesSolved,
            },
        }));
    }


    async logActivity(
        userId: number,
        type: 'study' | 'quiz',
        value: number,
    ) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const updateData: any = {};

        if (type === 'study') {

            await this.prisma.userStats.update({
                where: { userId },
                data: {
                    totalStudyTimeSeconds: { increment: value },
                    lastActivityAt: new Date(),
                }
            });
        }


        return this.prisma.userActivityLog.upsert({
            where: {
                userId_activityDate: {
                    userId,
                    activityDate: today,
                },
            },
            create: {
                userId,
                activityDate: today,
                studySeconds: type === 'study' ? value : 0,
                quizzesSolved: type === 'quiz' ? value : 0,
            },
            update: {
                studySeconds: type === 'study' ? { increment: value } : undefined,
                quizzesSolved: type === 'quiz' ? { increment: value } : undefined,
            },
        });
    }


    async initializeUserStats(userId: number) {

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        const stats = await this.prisma.userStats.create({
            data: {
                userId,
            },
        });

        return {
            ...stats,
            globalRank: -1,
            quizzesSolved: 0
        };
    }


    async getUserProfile(userId: number): Promise<UserProfileDto> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                firstName: true,
                lastName: true,
                school: true,
                profilePicture: true,
                email: true,
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return {
            name: `${user.firstName} ${user.lastName}`,
            school: user.school,
            profilePicture: user.profilePicture,
            email: user.email,
        };
    }

    async updateProfile(userId: number, updateDto: UpdateProfileDto): Promise<UserProfileDto> {
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                ...updateDto,
            },
            select: {
                firstName: true,
                lastName: true,
                school: true,
                profilePicture: true,
                email: true,
            },
        });

        return {
            name: `${user.firstName} ${user.lastName}`,
            school: user.school,
            profilePicture: user.profilePicture,
            email: user.email,
        };
    }
}
