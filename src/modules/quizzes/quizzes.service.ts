import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuizDto, UpdateQuizDto } from './dto';

@Injectable()
export class QuizzesService {
  constructor(private readonly prisma: PrismaService)

  async findAllPublished(userId?: number) {
    const quizzes = await this.prisma.quiz.findMany({
      where: {
        isPublished: true,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        timeLimit: true,
        passingScore: true,
        maxAttempts: true,
        publishedAt: true,
        createdAt: true,
        _count: {
          select: {
            questions: true,
          },
        },

        ...(userId && {
          attempts: {
            where: {
              userId,
              status: 'completed',
            },
            select: {
              id: true,
            },
            take: 1,
          },
        }),
      },
      orderBy: {
        publishedAt: 'asc',
      },
    });

    return quizzes.map((quiz: any) => ({
      ...quiz,
      isCompleted: userId ? quiz.attempts?.length > 0 : false,
      attempts: undefined,
    }));
  }

  async findById(quizId: number, userId?: number) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId, deletedAt: null },
      include: {
        questions: {
          include: {
            choices: {
              select: {
                id: true,
                text: true,
                order: true,
              },
              orderBy: {
                order: 'asc',
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    const isAllowed =
      quiz.isPublished || (userId && quiz.createdById === userId);

    if (!isAllowed) {
      throw new ForbiddenException('This quiz is not published yet');
    }

    if (!quiz.isPublished && (!userId || quiz.createdById !== userId)) {

      const { questions: _, ...quizWithoutQuestions } = quiz;
      return quizWithoutQuestions;
    }

    return quiz;
  }

  async create(createQuizDto: CreateQuizDto, userId: number) {
    this.validateQuizStructure(createQuizDto);

    const maxScore = createQuizDto.questions.reduce(
      (sum, q) => sum + (q.points || 1),
      0,
    );

    const quiz = await this.prisma.quiz.create({
      data: {
        title: createQuizDto.title,
        description: createQuizDto.description,
        timeLimit: createQuizDto.timeLimit,
        passingScore:
          createQuizDto.passingScore || Math.floor(maxScore * 0.7),
        maxAttempts: createQuizDto.maxAttempts,
        createdById: userId,
        questions: {
          create: createQuizDto.questions.map((question, qIndex) => ({
            text: question.text,
            explanation: question.explanation,
            points: question.points || 1,
            order: question.order ?? qIndex,
            type: 'single_choice',
            choices: {
              create: question.choices.map((choice, cIndex) => ({
                text: choice.text,
                order: choice.order ?? cIndex,
                isCorrect: question.correctChoiceIndexes.includes(cIndex),
              })),
            },
          })),
        },
      },
      include: {
        questions: {
          include: {
            choices: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return quiz;
  }

  async update(quizId: number, updateQuizDto: UpdateQuizDto, userId: number) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId, deletedAt: null },
      include: {
        attempts: {
          where: { status: 'in_progress' },
          select: { id: true },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }


    if (quiz.createdById !== userId) {
      throw new ForbiddenException('Not authorized to update this quiz');
    }

    if (quiz.attempts.length > 0) {
      throw new BadRequestException(
        'Cannot update quiz with active attempts. Wait for all attempts to complete.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (updateQuizDto.questions) {
        for (const questionDto of updateQuizDto.questions) {
          if (questionDto._delete && questionDto.id) {
            await tx.question.delete({
              where: { id: questionDto.id },
            });
          } else if (questionDto.id) {
            await tx.question.update({
              where: { id: questionDto.id },
              data: {
                text: questionDto.text,
                explanation: questionDto.explanation,
                points: questionDto.points,
                order: questionDto.order,
              },
            });

            if (questionDto.choices) {
              for (const choiceDto of questionDto.choices) {
                if (choiceDto._delete && choiceDto.id) {
                  await tx.choice.delete({
                    where: { id: choiceDto.id },
                  });
                } else if (choiceDto.id) {
                  await tx.choice.update({
                    where: { id: choiceDto.id },
                    data: {
                      text: choiceDto.text,
                      order: choiceDto.order,
                      isCorrect: questionDto.correctChoiceIndexes?.includes(
                        questionDto.choices.indexOf(choiceDto),
                      ),
                    },
                  });
                } else {
                  await tx.choice.create({
                    data: {
                      questionId: questionDto.id,
                      text: choiceDto.text,
                      order: choiceDto.order ?? 0,
                      isCorrect:
                        questionDto.correctChoiceIndexes?.includes(
                          questionDto.choices.indexOf(choiceDto),
                        ) ?? false,
                    },
                  });
                }
              }
            }
          } else {
            await tx.question.create({
              data: {
                quizId,
                text: questionDto.text,
                explanation: questionDto.explanation,
                points: questionDto.points || 1,
                order: questionDto.order ?? 0,
                type: 'single_choice',
                choices: {
                  create:
                    questionDto.choices?.map((choice, cIndex) => ({
                      text: choice.text,
                      order: choice.order ?? cIndex,
                      isCorrect:
                        questionDto.correctChoiceIndexes?.includes(cIndex) ??
                        false,
                    })) || [],
                },
              },
            });
          }
        }
      }

      const updated = await tx.quiz.update({
        where: { id: quizId },
        data: {
          title: updateQuizDto.title,
          description: updateQuizDto.description,
          timeLimit: updateQuizDto.timeLimit,
          passingScore: updateQuizDto.passingScore,
          maxAttempts: updateQuizDto.maxAttempts,
        },
        include: {
          questions: {
            include: {
              choices: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      return updated;
    });
  }

  async publish(quizId: number) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId, deletedAt: null },
      include: {
        questions: {
          include: {
            choices: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    if (quiz.questions.length === 0) {
      throw new BadRequestException('Cannot publish quiz without questions');
    }

    for (const question of quiz.questions) {
      const hasCorrectAnswer = question.choices.some((c) => c.isCorrect);
      if (!hasCorrectAnswer) {
        throw new BadRequestException(
          `Question "${question.text}" has no correct answer`,
        );
      }
    }

    return this.prisma.quiz.update({
      where: { id: quizId },
      data: {
        isPublished: true,
        publishedAt: quiz.publishedAt || new Date(),
      },
    });
  }

  private validateQuizStructure(dto: CreateQuizDto): void {
    for (const question of dto.questions) {
      const maxIndex = question.choices.length - 1;
      for (const index of question.correctChoiceIndexes) {
        if (index < 0 || index > maxIndex) {
          throw new BadRequestException(
            `Invalid correctChoiceIndex ${index} for question "${question.text}"`,
          );
        }
      }

      if (question.correctChoiceIndexes.length === 0) {
        throw new BadRequestException(
          `Question "${question.text}" must have at least one correct answer`,
        );
      }
    }
  }
}
