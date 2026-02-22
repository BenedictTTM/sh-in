import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AttemptCompletedEvent } from './attempt-completed.event';
import { PrismaService } from '../../../prisma/prisma.service';
import { StatsService } from '../../stats/stats.service';
import { LeaderboardService } from '../../leaderboards/leaderboard.service';
import { DiamondsService } from '../../diamonds/diamonds.service';
import { TransactionReason } from '../../../common/enums/currency.enum';

@Injectable()
export class AttemptEventsListener {
    private readonly logger = new Logger(AttemptEventsListener.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly statsService: StatsService,
        private readonly leaderboardService: LeaderboardService,
        private readonly diamondsService: DiamondsService,
    ) { }

    @OnEvent('attempt.completed', { async: true })
    async handleAttemptCompleted(event: AttemptCompletedEvent) {
        const { userId, quizId, attemptId, score, maxScore, passed, totalAnswers, correctAnswers } = event;

        this.logger.log(
            `Processing post-completion for attempt ${attemptId} — ` +
            `user=${userId}, quiz=${quizId}, score=${score}/${maxScore}, passed=${passed}`,
        );

        // 1. Log daily activity
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            await this.prisma.userActivityLog.upsert({
                where: {
                    userId_activityDate: { userId, activityDate: today },
                },
                update: { quizzesSolved: { increment: 1 } },
                create: { userId, activityDate: today, quizzesSolved: 1 },
            });
        } catch (error) {
            this.logger.error(`Failed to log activity for user ${userId}`, error);
        }

        // 2. Award XP & gems
        try {
            await this.statsService.updateStats(userId, {
                xp: score,
                gems: passed ? 10 : 1,
            });
        } catch (error) {
            this.logger.error(`Failed to update stats for user ${userId}`, error);
        }

        // 3. Update level if passed
        try {
            if (passed) {
                this.logger.log(`User ${userId} passed. Updating level for quiz ${quizId}...`);
                await this.statsService.updateLevel(userId, quizId);
            }
        } catch (error) {
            this.logger.error(`Failed to update level for user ${userId}`, error);
        }

        // 4. Update streak
        try {
            await this.statsService.updateStreak(userId);
        } catch (error) {
            this.logger.error(`Failed to update streak for user ${userId}`, error);
        }

        // 5. Check leaderboard rank → increment top3
        try {
            const rank = await this.leaderboardService.getQuizRank(quizId, score);
            if (rank <= 3) {
                await this.statsService.incrementTop3(userId);
                this.logger.log(`User ${userId} ranked #${rank} on quiz ${quizId} — top3 incremented`);
            }
        } catch (error) {
            this.logger.error(`Failed to check leaderboard for user ${userId}`, error);
        }

        // 6. Grant diamond for perfect score
        try {
            if (score === maxScore && maxScore > 0) {
                await this.diamondsService.grantDiamonds(userId, 1, TransactionReason.REWARD, {
                    quizId,
                    score,
                    details: 'Perfect Score Reward',
                });
                this.logger.log(`User ${userId} achieved perfect score! Granted 1 Diamond.`);
            }
        } catch (error) {
            this.logger.error(`Failed to grant diamond for user ${userId}`, error);
        }

        this.logger.log(`Post-completion processing finished for attempt ${attemptId}`);
    }
}
