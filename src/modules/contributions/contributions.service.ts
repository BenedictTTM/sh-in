import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContributionsService {
    constructor(private readonly prisma: PrismaService) {
        // Service initialized
    }

    async getUserContributions(userId: number) {
        const logs = await this.prisma.userActivityLog.findMany({
            where: {
                userId,
            },
            orderBy: {
                activityDate: 'asc',
            },
            select: {
                activityDate: true,
                quizzesSolved: true,
            },
        });

        return logs.map((log) => ({
            date: log.activityDate.toISOString().split('T')[0],
            count: log.quizzesSolved,
        }));
    }

    async syncUserContributions(userId: number) {
        const attempts = await this.prisma.attempt.findMany({
            where: {
                userId,
                status: 'completed',
                finishedAt: { not: null },
            },
            select: { finishedAt: true },
        });

        const activityMap = new Map<string, number>();
        attempts.forEach((attempt) => {
            // We filtered for finishedAt not null, so this is safe
            if (!attempt.finishedAt) return;
            const date = attempt.finishedAt.toISOString().split('T')[0];
            activityMap.set(date, (activityMap.get(date) || 0) + 1);
        });

        const results: any[] = [];
        for (const [dateStr, count] of activityMap) {
            const date = new Date(dateStr);
            console.log(`[Contributions] Syncing ${dateStr}: ${count} quizzes`);
            const result = await this.prisma.userActivityLog.upsert({
                where: {
                    userId_activityDate: {
                        userId,
                        activityDate: date,
                    },
                },
                update: {
                    quizzesSolved: count,
                },
                create: {
                    userId,
                    activityDate: date,
                    quizzesSolved: count,
                    studySeconds: 0,
                },
            });
            results.push(result);
        }


        return { syncedDays: results.length, totalAttempts: attempts.length };
    }

    async logActivity(userId: number) {
        const today = new Date();
        // Normalize to midnight UTC or local as per app convention. 
        // Prisma @db.Date stores YYYY-MM-DD. 
        // We'll use the date part of ISO string to match sync logic logic: "YYYY-MM-DD"
        // But for Date object creation in Prisma:
        const dateStr = today.toISOString().split('T')[0];
        const date = new Date(dateStr);

        return this.prisma.userActivityLog.upsert({
            where: {
                userId_activityDate: {
                    userId,
                    activityDate: date,
                },
            },
            update: {
                quizzesSolved: { increment: 1 },
            },
            create: {
                userId,
                activityDate: date,
                quizzesSolved: 1,
                studySeconds: 0,
            },
        });
    }
}
