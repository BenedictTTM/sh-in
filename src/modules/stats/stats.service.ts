import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StatsService {
    constructor(private prisma: PrismaService) { }

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
                // Missed a day (or more)
                newStreak = 1;
            }
            // If same day, do nothing (keep current streak)
        } else {
            // First activity ever
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
}
