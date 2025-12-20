import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StatsService {
    constructor(private prisma: PrismaService)

    async getStats(userId: number) {
        const stats = await this.prisma.userStats.findUnique({
            where: { userId },
        });

        if (!stats) {
            return this.prisma.userStats.create({
                data: { userId }
            });
        }

        return stats;
    }

    async updateStats(userId: number, data: { xp?: number; gems?: number }) {
        return this.prisma.userStats.update({
            where: { userId },
            data: {
                xp: data.xp ? { increment: data.xp } : undefined,
                gems: data.gems ? { increment: data.gems } : undefined,
            },
        });
    }

    async updateStreak(userId: number) {
        const stats = await this.getStats(userId);
        const now = new Date();
        const lastActivity = stats.lastActivityAt ? new Date(stats.lastActivityAt) : null;

        let newStreak = stats.dayStreak;

        if (lastActivity) {
            const isSameDay = now.toDateString() === lastActivity.toDateString();
            const isYesterday = new Date(now.getTime() - 86400000).toDateString() === lastActivity.toDateString();

            if (isYesterday) {
                newStreak += 1;
            } else if (!isSameDay) {

                newStreak = 1;
            }

        } else {

            newStreak = 1;
        }

        return this.prisma.userStats.update({
            where: { userId },
            data: {
                dayStreak: newStreak,
                lastActivityAt: now,
            },
        });
    }

    async incrementTop3(userId: number) {
        return this.prisma.userStats.update({
            where: { userId },
            data: {
                top3Finishes: { increment: 1 },
            },
        });
    }

    async updateLevel(userId: number, quizId: number) {
        console.log(`[StatsService] Updating level for user ${userId} after finishing quiz ${quizId}`);

        const stats = await this.getStats(userId);



        const allQuizzes = await this.prisma.quiz.findMany({
            where: { isPublished: true, deletedAt: null },
            orderBy: { publishedAt: 'asc' },
            select: { id: true }
        });

        const quizIndex = allQuizzes.findIndex(q => q.id === quizId);
        if (quizIndex === -1) {
            console.log(`[StatsService] Quiz ${quizId} not found in published list.`);
            return;
        }

        const levelNumber = quizIndex + 1;
        console.log(`[StatsService] Quiz ${quizId} is Level ${levelNumber}. User current level: ${stats.currentLevel}`);




        if (levelNumber >= stats.currentLevel) {
            const newLevel = levelNumber + 1;
            console.log(`[StatsService] User completed Level ${levelNumber} (Current: ${stats.currentLevel}). Updating to Level ${newLevel}.`);
            await this.prisma.userStats.update({
                where: { userId },
                data: {
                    currentLevel: newLevel
                }
            });
        } else {
            console.log(`[StatsService] Quiz Level ${levelNumber} < Current Level ${stats.currentLevel}. No update needed.`);
        }
    }
}
