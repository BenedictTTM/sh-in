import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuizDto, UpdateQuizDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class QuizzesService {
  constructor(private readonly prisma: PrismaService) { }

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
    return quizzes.map((quiz: any) => ({
      ...quiz,
      isCompleted: userId ? quiz.attempts?.length > 0 : false,
      attempts: undefined,
    }));
  }

  async findOneAdmin(quizId: number) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId, deletedAt: null },
      include: {
        questions: {
          include: {
            choices: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    return quiz;
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

  async import(createQuizDtos: CreateQuizDto[], userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const createdQuizzes: any[] = [];
      for (const dto of createQuizDtos) {
        createdQuizzes.push(await this.create(dto, userId, tx));
      }
      return createdQuizzes;
    }, {
      maxWait: 5000, // default: 2000
      timeout: 20000, // default: 5000
    });
  }

  async create(createQuizDto: CreateQuizDto, userId: number, tx: Prisma.TransactionClient = this.prisma) {
    this.validateQuizStructure(createQuizDto);

    const maxScore = createQuizDto.questions.reduce(
      (sum, q) => sum + (q.points || 1),
      0,
    );

    const quiz = await tx.quiz.create({
      data: {
        title: createQuizDto.title,
        description: createQuizDto.description,
        subject: createQuizDto.subject || 'random',
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

  async update(quizId: number, updateQuizDto: UpdateQuizDto, userId: number, isAdmin: boolean = false) {
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
          subject: updateQuizDto.subject,
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
    }, {
      maxWait: 5000,
      timeout: 20000,
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

  async findAllAdmin(userId: number) {
    // For now, return all quizzes not deleted. 
    // If we want to restrict to only own quizzes, add where: { createdById: userId }
    return this.prisma.quiz.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });
  }

  async delete(quizId: number) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId, deletedAt: null },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    return this.prisma.quiz.update({
      where: { id: quizId },
      data: {
        deletedAt: new Date(),
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
