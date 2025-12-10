import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LeaderboardService {
    constructor(private prisma: PrismaService) { }

    private getCurrentMonthRange() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { startOfMonth, endOfMonth };
    }

    async getGlobalLeaderboard(limit: number = 10) {
        const { startOfMonth, endOfMonth } = this.getCurrentMonthRange();

        // Aggregate scores by user for the current month
        const leaderboard = await this.prisma.attempt.groupBy({
            by: ['userId'],
            where: {
                finishedAt: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
            },
            _sum: {
                score: true,
            },
            orderBy: {
                _sum: {
                    score: 'desc',
                },
            },
            take: limit,
        });

        // Fetch user details for the leaderboard entries
        const userIds = leaderboard.map((entry) => entry.userId);
        const users = await this.prisma.user.findMany({
            where: {
                id: { in: userIds },
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                school: true,
                profilePicture: true,
            },
        });

        // Merge score data with user data
        return leaderboard.map((entry, index) => {
            const user = users.find((u) => u.id === entry.userId);
            return {
                rank: index + 1,
                score: entry._sum.score || 0,
                user: user
                    ? {
                        id: user.id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        school: user.school || undefined,
                        profilePicture: user.profilePicture || undefined,
                    }
                    : {
                        id: entry.userId,
                        firstName: 'Unknown',
                        lastName: 'User',
                    },
            };
        });
    }

    async getUserRank(userId: number) {
        const { startOfMonth, endOfMonth } = this.getCurrentMonthRange();

        // Get current user's total score for the month
        const userScoreAgg = await this.prisma.attempt.aggregate({
            where: {
                userId: userId,
                finishedAt: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
            },
            _sum: {
                score: true,
            },
        });

        const userScore = userScoreAgg._sum.score || 0;

        const rankResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM (
        SELECT "user_id", SUM(score) as total_score
        FROM attempts
        WHERE "finished_at" >= ${startOfMonth} AND "finished_at" <= ${endOfMonth}
        GROUP BY "user_id"
        HAVING SUM(score) > ${userScore}
      ) as higher_scores
    `;

        const rank = Number(rankResult[0].count) + 1;

        return {
            userId,
            rank,
            score: userScore,
            month: startOfMonth.toLocaleString('default', { month: 'long' }),
            year: startOfMonth.getFullYear(),
        };
    }

    async getQuizRank(quizId: number, score: number) {
        // Count how many attempts for this quiz have a higher score
        // We only consider the BEST score for each user? Or just all attempts?
        // "Top 3 finishes" usually implies "I finished 1st, 2nd, or 3rd on the leaderboard for this quiz"
        // Let's assume we compare against all other attempts for simplicity, or distinct users.
        // Let's go with: Rank among all attempts for this quiz.

        const count = await this.prisma.attempt.count({
            where: {
                quizId: quizId,
                status: 'completed',
                score: { gt: score }
            }
        });

        return count + 1;
    }
}
