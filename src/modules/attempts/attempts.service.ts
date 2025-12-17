import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitAnswerDto } from './dto';
import * as crypto from 'crypto';

import { EnergyService } from '../energy/energy.service';
import { StatsService } from '../stats/stats.service';
import { LeaderboardService } from '../leaderboards/leaderboard.service';
import { TransactionReason } from '../../common/enums/currency.enum';
import { DiamondsService } from '../diamonds/diamonds.service';

@Injectable()
export class AttemptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly energyService: EnergyService,
    private readonly statsService: StatsService,
    private readonly leaderboardService: LeaderboardService,
    private readonly diamondsService: DiamondsService,
  ) { }

  async startAttempt(
    quizId: number,
    userId: number,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId, deletedAt: null },
      include: {
        questions: {
          select: {
            id: true,
            points: true,
          },
        },
        attempts: {
          where: {
            userId,
            status: { in: ['in_progress', 'completed'] },
          },
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    if (!quiz.isPublished) {
      throw new ForbiddenException('Quiz is not published');
    }

    // Verify Previous Level Completion
    // distinct: Check if there's a quiz published BEFORE this one that must be completed first
    const previousQuiz = await this.prisma.quiz.findFirst({
      where: {
        isPublished: true,
        deletedAt: null,
        publishedAt: {
          lt: quiz.publishedAt || new Date()
        }
      },
      orderBy: {
        publishedAt: 'desc'
      }
    });

    if (previousQuiz) {
      const isPreviousCompleted = await this.prisma.attempt.count({
        where: {
          quizId: previousQuiz.id,
          userId,
          status: 'completed'
        }
      });

      if (isPreviousCompleted === 0) {
        throw new ForbiddenException(`You must complete "${previousQuiz.title}" before starting this level.`);
      }
    }

    if (quiz.maxAttempts) {
      const completedAttempts = quiz.attempts.filter(
        (a) => a.status === 'completed',
      ).length;

      if (completedAttempts >= quiz.maxAttempts) {
        throw new BadRequestException(
          `Maximum attempts (${quiz.maxAttempts}) reached for this quiz`,
        );
      }
    }

    // Consume Energy
    await this.energyService.consumeEnergy(userId, {
      amount: 5, // Deduct 5 energy bars per quiz
      reason: TransactionReason.QUIZ_PLAY,
    });


    const maxScore = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    const attemptToken = this.generateAttemptToken(quizId, userId);
    const expiresAt = quiz.timeLimit
      ? new Date(Date.now() + quiz.timeLimit * 1000)
      : null;

    const attempt = await this.prisma.attempt.create({
      data: {
        quizId,
        userId,
        attemptToken,
        maxScore,
        expiresAt,
        ipAddress,
        userAgent,
      },
      select: {
        id: true,
        attemptToken: true,
        expiresAt: true,
        startedAt: true,
      },
    });

    return {
      attemptId: attempt.id,
      attemptToken: attempt.attemptToken,
      expiresAt: attempt.expiresAt,
      startedAt: attempt.startedAt,
    };
  }

  async submitAnswer(
    attemptId: number,
    submitAnswerDto: SubmitAnswerDto,
    attemptToken: string,
  ) {
    const { questionId, selectedChoiceId, idempotencyKey } = submitAnswerDto;

    const existingAnswer = await this.prisma.answer.findUnique({
      where: { idempotencyKey },
      include: {
        choice: true,
      },
    });

    if (existingAnswer) {
      return {
        isCorrect: existingAnswer.isCorrect,
        pointsAwarded: existingAnswer.pointsAwarded,
        currentScore:
          (
            await this.prisma.attempt.findUnique({
              where: { id: attemptId },
              select: { score: true },
            })
          )?.score || 0,
        cached: true,
      };
    }

    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            questions: {
              where: { id: questionId },
              include: {
                choices: {
                  where: { id: selectedChoiceId },
                },
              },
            },
          },
        },
        answers: {
          where: { questionId },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with ID ${attemptId} not found`);
    }

    if (attempt.attemptToken !== attemptToken) {
      throw new ForbiddenException('Invalid attempt token');
    }

    if (attempt.status !== 'in_progress') {
      throw new BadRequestException(
        `Cannot submit answer to ${attempt.status} attempt`,
      );
    }

    if (attempt.expiresAt && new Date() > attempt.expiresAt) {
      await this.prisma.attempt.update({
        where: { id: attemptId },
        data: { status: 'expired', finishedAt: new Date() },
      });
      throw new BadRequestException('Attempt has expired');
    }

    if (attempt.answers.length > 0) {
      throw new ConflictException(
        `Answer already submitted for question ${questionId} in this attempt`,
      );
    }

    const question = attempt.quiz.questions[0];
    if (!question) {
      throw new BadRequestException(
        `Question ${questionId} not found in quiz ${attempt.quizId}`,
      );
    }

    const choice = question.choices[0];
    if (!choice) {
      throw new BadRequestException(
        `Choice ${selectedChoiceId} not found in question ${questionId}`,
      );
    }

    const isCorrect = choice.isCorrect;
    const pointsAwarded = isCorrect ? question.points : 0;

    return this.prisma.$transaction(async (tx) => {
      await tx.answer.create({
        data: {
          attemptId,
          questionId,
          choiceId: selectedChoiceId,
          isCorrect,
          pointsAwarded,
          idempotencyKey,
        },
      });

      const updatedAttempt = await tx.attempt.update({
        where: { id: attemptId },
        data: {
          score: { increment: pointsAwarded },
        },
        select: {
          score: true,
        },
      });

      return {
        isCorrect,
        pointsAwarded,
        currentScore: updatedAttempt.score,
        cached: false,
      };
    });
  }

  async finishAttempt(attemptId: number, attemptToken: string, userId: number) {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            passingScore: true,
          },
        },
        answers: {
          select: {
            id: true,
            isCorrect: true,
            pointsAwarded: true,
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with ID ${attemptId} not found`);
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException('Not authorized to finish this attempt');
    }

    if (attempt.attemptToken !== attemptToken) {
      throw new ForbiddenException('Invalid attempt token');
    }

    if (attempt.status === 'completed') {
      return this.getAttemptResult(attemptId, userId);
    }

    if (attempt.status !== 'in_progress') {
      throw new BadRequestException(
        `Cannot finish attempt with status: ${attempt.status}`,
      );
    }

    const finishedAt = new Date();
    const passed = attempt.quiz.passingScore
      ? attempt.score >= attempt.quiz.passingScore
      : true;

    console.log(`[AttemptsService] Finishing attempt ${attemptId} for user ${userId}. Score: ${attempt.score}/${attempt.maxScore}, Passing Score: ${attempt.quiz.passingScore}, Passed: ${passed}`);

    await this.prisma.attempt.update({
      where: { id: attemptId },
      data: {
        status: 'completed',
        finishedAt,
      },
    });

    // Update Daily Contributions
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.userActivityLog.upsert({
      where: {
        userId_activityDate: {
          userId,
          activityDate: today,
        },
      },
      update: {
        quizzesSolved: { increment: 1 },
      },
      create: {
        userId,
        activityDate: today,
        quizzesSolved: 1,
      },
    });

    // Update Stats
    await this.statsService.updateStats(userId, {
      xp: attempt.score, // 1 XP per point? Or custom logic? Let's assume score = XP for now
      gems: passed ? 10 : 1, // 10 gems for passing, 1 for trying
    });

    if (passed) {
      console.log(`[AttemptsService] User passed. Updating level for quiz ${attempt.quiz.id}...`);
      await this.statsService.updateLevel(userId, attempt.quiz.id);
    } else {
      console.log(`[AttemptsService] User failed. Level not updated.`);
    }

    await this.statsService.updateStreak(userId);

    // Update Leaderboard & Top 3
    // this.updateLeaderboard(userId, attempt.quiz.id, attempt.score); // Old method, remove or keep logging?

    // Check rank for Top 3 finish
    const rank = await this.leaderboardService.getQuizRank(attempt.quiz.id, attempt.score);
    if (rank <= 3) {
      await this.statsService.incrementTop3(userId);
    }

    // Grant Diamond for Perfect Score
    if (attempt.score === attempt.maxScore && attempt.maxScore > 0) {
      await this.diamondsService.grantDiamonds(userId, 1, TransactionReason.REWARD, {
        quizId: attempt.quiz.id,
        score: attempt.score,
        details: 'Perfect Score Reward'
      });
      console.log(`[AttemptsService] User ${userId} achieved perfect score! Granted 1 Diamond.`);
    }

    return {
      attemptId,
      score: attempt.score,
      maxScore: attempt.maxScore,
      passed,
      passingScore: attempt.quiz.passingScore,
      totalQuestions: attempt.answers.length,
      correctAnswers: attempt.answers.filter((a) => a.isCorrect).length,
      finishedAt,
    };
  }

  async getAttemptResult(attemptId: number, userId: number) {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            description: true,
            passingScore: true,
          },
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                text: true,
                explanation: true,
                solution: true,
                points: true,
                choices: {
                  where: { isCorrect: true },
                  select: {
                    id: true,
                    text: true,
                    isCorrect: true,
                  },
                },
              },
            },
            choice: {
              select: {
                id: true,
                text: true,
                isCorrect: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with ID ${attemptId} not found`);
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException('Not authorized to view this attempt');
    }

    const totalQuestions = attempt.answers.length;
    const correctAnswers = attempt.answers.filter((a) => a.isCorrect).length;
    const passed = attempt.quiz.passingScore
      ? attempt.score >= attempt.quiz.passingScore
      : true;

    const timeTaken =
      attempt.finishedAt && attempt.startedAt
        ? Math.floor(
          (new Date(attempt.finishedAt).getTime() -
            new Date(attempt.startedAt).getTime()) /
          1000,
        )
        : 0;

    const percentage =
      attempt.maxScore > 0 ? (attempt.score / attempt.maxScore) * 100 : 0;

    return {
      id: attempt.id,
      attemptId: attempt.id,
      quiz: attempt.quiz,
      status: attempt.status,
      score: attempt.score,
      maxScore: attempt.maxScore,
      totalPoints: attempt.maxScore,
      percentage,
      passed,
      passingScore: attempt.quiz.passingScore,
      totalQuestions,
      correctAnswers,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt,
      completedAt: attempt.finishedAt,
      timeTaken,
      expiresAt: attempt.expiresAt,
      answers: attempt.answers.map((answer) => ({
        questionId: answer.question.id,
        questionText: answer.question.text,
        explanation: answer.question.explanation,
        solution: answer.question['solution'],
        correctAnswer: answer.question['choices']?.[0] || null,
        yourAnswer: {
          choiceId: answer.choice.id,
          choiceText: answer.choice.text,
        },
        isCorrect: answer.isCorrect,

        pointsAwarded: answer.pointsAwarded,
        maxPoints: answer.question.points,
      })),
    };
  }

  private generateAttemptToken(quizId: number, userId: number): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    const payload = `${quizId}:${userId}:${timestamp}:${random}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  private updateLeaderboard(
    userId: number,
    quizId: number,
    score: number,
  ): void {
    console.log(
      `[Leaderboard] User ${userId} scored ${score} on quiz ${quizId}`,
    );
  }
}
