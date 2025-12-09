import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get aggregated user stats for dashboard
     */
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
            // Create empty stats if missing (lazy initialization)
            return this.initializeUserStats(userId);
        }

        // Calculate Global Rank (Count users with more XP)
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

    /**
     * Get activity heatmap data for a specific year
     */
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

    /**
     * Log user activity (called by other modules)
     */
    async logActivity(
        userId: number,
        type: 'study' | 'quiz',
        value: number, // seconds or count
    ) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const updateData: any = {
            // Only update if existing, handled by upsert
        };

        if (type === 'study') {
            // Increment global stats
            await this.prisma.userStats.update({
                where: { userId },
                data: {
                    totalStudyTimeSeconds: { increment: value },
                    lastActivityAt: new Date(),
                }
            });
        }

        // Upsert daily log
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

    /**
     * Initialize stats for a new user
     */
    async initializeUserStats(userId: number) {
        // Check if user exists
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        const stats = await this.prisma.userStats.create({
            data: {
                userId,
            },
        });

        return {
            ...stats,
            globalRank: -1, // New user
            quizzesSolved: 0
        };
    }
}
