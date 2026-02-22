import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { EnergyService } from '../energy/energy.service';
import { SubmitAnswerDto } from './dto';
import { AttemptCompletedEvent } from './events';
import { TransactionReason } from '../../common/enums/currency.enum';
import * as crypto from 'crypto';

@Injectable()
export class AttemptsService {
  private readonly logger = new Logger(AttemptsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly energyService: EnergyService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async startAttempt(
    quizId: number,
    userId: number,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.findUnique({
        where: { id: quizId, deletedAt: null },
        include: {
          questions: {
            select: { id: true, points: true },
          },
          attempts: {
            where: {
              userId,
              status: { in: ['in_progress', 'completed'] },
            },
            select: { id: true, status: true, expiresAt: true, attemptToken: true, startedAt: true },
          },
        },
      });

      if (!quiz) {
        throw new NotFoundException(`Quiz with ID ${quizId} not found`);
      }

      // Check for existing in-progress attempt
      const existingAttempt = quiz.attempts.find(
        (a) => a.status === 'in_progress',
      );

      if (existingAttempt) {
        const now = new Date();

        if (existingAttempt.expiresAt && now > existingAttempt.expiresAt) {
          // Expired — mark it and proceed to create new
          await tx.attempt.update({
            where: { id: existingAttempt.id },
            data: { status: 'expired', finishedAt: now },
          });
        } else {
          // Valid — resume it
          this.logger.log(`Resuming attempt ${existingAttempt.id} for user ${userId}`);
          return {
            attemptId: existingAttempt.id,
            attemptToken: existingAttempt.attemptToken,
            expiresAt: existingAttempt.expiresAt,
            startedAt: existingAttempt.startedAt,
            resumed: true,
          };
        }
      }

      // Check max attempts
      if (quiz.maxAttempts) {
        const completedCount = quiz.attempts.filter(
          (a) => a.status === 'completed',
        ).length;
        if (completedCount >= quiz.maxAttempts) {
          throw new BadRequestException(
            `Maximum attempts (${quiz.maxAttempts}) reached for this quiz.`,
          );
        }
      }

      await this.energyService.consumeEnergy(userId, {
        amount: 5,
        reason: TransactionReason.QUIZ_PLAY,
      });

      const maxScore = quiz.questions.reduce((sum, q) => sum + q.points, 0);
      const attemptToken = this.generateAttemptToken(quizId, userId);
      const expiresAt = quiz.timeLimit
        ? new Date(Date.now() + quiz.timeLimit * 1000)
        : null;

      const attempt = await tx.attempt.create({
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

      this.logger.log(`Created attempt ${attempt.id} for user ${userId} on quiz ${quizId}`);

      return {
        attemptId: attempt.id,
        attemptToken: attempt.attemptToken,
        expiresAt: attempt.expiresAt,
        startedAt: attempt.startedAt,
      };
    });
  }

  async submitAnswer(
    attemptId: number,
    submitAnswerDto: SubmitAnswerDto,
    attemptToken: string,
    userId: number,
  ) {
    const { questionId, selectedChoiceId, idempotencyKey } = submitAnswerDto;

    // Fast-path: idempotency check
    const existingAnswer = await this.prisma.answer.findUnique({
      where: { idempotencyKey },
      include: { choice: true },
    });

    if (existingAnswer) {
      const attempt = await this.prisma.attempt.findUnique({
        where: { id: attemptId },
        select: { score: true },
      });
      return {
        isCorrect: existingAnswer.isCorrect,
        pointsAwarded: existingAnswer.pointsAwarded,
        currentScore: attempt?.score || 0,
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

    if (attempt.userId !== userId) {
      throw new ForbiddenException('Not authorized to submit to this attempt');
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

    const question = attempt.quiz.questions.find((q) => q.id === questionId);
    if (!question) {
      throw new BadRequestException(
        `Question ${questionId} not found in quiz ${attempt.quizId}`,
      );
    }

    const choice = question.choices.find((c) => c.id === selectedChoiceId);
    if (!choice) {
      throw new BadRequestException(
        `Choice ${selectedChoiceId} not found in question ${questionId}`,
      );
    }

    const isCorrect = choice.isCorrect;
    const pointsAwarded = isCorrect ? question.points : 0;

    try {
      return await this.prisma.$transaction(async (tx) => {
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
          data: { score: { increment: pointsAwarded } },
          select: { score: true },
        });

        return {
          isCorrect,
          pointsAwarded,
          currentScore: updatedAttempt.score,
          cached: false,
        };
      });
    } catch (error: any) {
      // Handle unique constraint race condition
      if (error.code === 'P2002') {
        const existing = await this.prisma.answer.findUnique({
          where: {
            attemptId_questionId: { attemptId, questionId },
          },
          include: {
            attempt: { select: { score: true } },
          },
        });

        if (existing) {
          return {
            isCorrect: existing.isCorrect,
            pointsAwarded: existing.pointsAwarded,
            currentScore: existing.attempt.score,
            cached: true,
          };
        }
      }
      throw error;
    }
  }

  async finishAttempt(attemptId: number, attemptToken: string, userId: number) {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          select: { id: true, title: true, passingScore: true },
        },
        answers: {
          select: { id: true, isCorrect: true, pointsAwarded: true },
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

    // Idempotent: if already completed, return existing result
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

    const totalAnswers = attempt.answers.length;
    const correctAnswers = attempt.answers.filter((a) => a.isCorrect).length;

    // Core update — mark as completed
    await this.prisma.attempt.update({
      where: { id: attemptId },
      data: { status: 'completed', finishedAt },
    });

    this.logger.log(
      `Attempt ${attemptId} completed — user=${userId}, score=${attempt.score}/${attempt.maxScore}, passed=${passed}`,
    );

    // Emit event — all side effects happen asynchronously in the listener
    this.eventEmitter.emit(
      'attempt.completed',
      new AttemptCompletedEvent(
        userId,
        attempt.quiz.id,
        attemptId,
        attempt.score,
        attempt.maxScore,
        passed,
        totalAnswers,
        correctAnswers,
      ),
    );

    return {
      attemptId,
      score: attempt.score,
      maxScore: attempt.maxScore,
      passed,
      passingScore: attempt.quiz.passingScore,
      totalQuestions: totalAnswers,
      correctAnswers,
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
                  select: { id: true, text: true, isCorrect: true },
                },
              },
            },
            choice: {
              select: { id: true, text: true, isCorrect: true },
            },
          },
          orderBy: { createdAt: 'asc' },
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
}
