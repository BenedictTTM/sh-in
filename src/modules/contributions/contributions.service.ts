import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContributionsService {
    constructor(private readonly prisma: PrismaService)

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
}
