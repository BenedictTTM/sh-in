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

@Injectable()
export class AttemptsService {
  constructor(private readonly prisma: PrismaService) {}

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

    const inProgressAttempt = quiz.attempts.find(
      (a) => a.status === 'in_progress',
    );

    if (inProgressAttempt) {
      throw new ConflictException(
        `You already have an in-progress attempt (ID: ${inProgressAttempt.id}). Please complete or abandon it first.`,
      );
    }

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

    await this.prisma.attempt.update({
      where: { id: attemptId },
      data: {
        status: 'completed',
        finishedAt,
      },
    });

    this.updateLeaderboard(userId, attempt.quiz.id, attempt.score);

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
                points: true,
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

    return {
      attemptId: attempt.id,
      quiz: attempt.quiz,
      status: attempt.status,
      score: attempt.score,
      maxScore: attempt.maxScore,
      passed,
      passingScore: attempt.quiz.passingScore,
      totalQuestions,
      correctAnswers,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt,
      expiresAt: attempt.expiresAt,
      answers: attempt.answers.map((answer) => ({
        questionId: answer.question.id,
        questionText: answer.question.text,
        explanation: answer.question.explanation,
        yourAnswer: {
          choiceId: answer.choice.id,
          choiceText: answer.choice.text,
        },
        isCorrect: answer.isCorrect,
        correctAnswer: answer.choice.isCorrect ? answer.choice : null,
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
