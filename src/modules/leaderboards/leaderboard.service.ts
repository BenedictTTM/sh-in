import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LeaderboardService {
    constructor(private prisma: PrismaService) { }

    async getGlobalLeaderboard(limit: number = 10) {
        // Aggregate from UserStats.xp — the single source of truth for a user's
        // total XP (updated by BOTH quiz finishes and course challenge completions).
        const leaderboard = await this.prisma.userStats.findMany({
            select: {
                userId: true,
                xp: true,
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        school: true,
                        profilePicture: true,
                    },
                },
            },
            orderBy: {
                xp: 'desc',
            },
            take: limit,
        });

        return leaderboard.map((entry, index) => ({
            rank: index + 1,
            score: entry.xp,
            user: entry.user
                ? {
                    id: entry.user.id,
                    firstName: entry.user.firstName,
                    lastName: entry.user.lastName,
                    school: entry.user.school || undefined,
                    profilePicture: entry.user.profilePicture || undefined,
                }
                : { id: entry.userId, firstName: 'Unknown', lastName: 'User' },
        }));
    }

    async getUserRank(userId: number) {
        const userStats = await this.prisma.userStats.findUnique({
            where: { userId },
            select: { xp: true },
        });

        const userXp = userStats?.xp ?? 0;

        // Count users with strictly higher XP → rank = that count + 1
        const higherCount = await this.prisma.userStats.count({
            where: { xp: { gt: userXp } },
        });

        return {
            userId,
            rank: higherCount + 1,
            score: userXp,
        };
    }

    async getQuizRank(quizId: number, score: number): Promise<number> {
        const count = await this.prisma.attempt.count({
            where: {
                quizId,
                status: 'completed',
                score: { gt: score },
            },
        });

        return count + 1;
    }
}
