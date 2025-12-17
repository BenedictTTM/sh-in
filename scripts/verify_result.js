const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Verifying Prisma query for attempt results...');

    // 1. Find or create a user and quiz
    const user = await prisma.user.findFirst();
    const quiz = await prisma.quiz.findFirst({ where: { questions: { some: {} } } });

    if (!user || !quiz) {
        console.log('User or Quiz not found. Cannot verify.');
        return;
    }

    // 2. Create a dummy completed attempt
    const attempt = await prisma.attempt.create({
        data: {
            userId: user.id,
            quizId: quiz.id,
            attemptToken: 'dummy-token',
            maxScore: 100,
            score: 10,
            status: 'completed',
            startedAt: new Date(),
            finishedAt: new Date(),
        }
    });

    // 3. Add an answer to this attempt
    const question = await prisma.question.findFirst({ where: { quizId: quiz.id }, include: { choices: true } });
    if (question && question.choices.length > 0) {
        await prisma.answer.create({
            data: {
                attemptId: attempt.id,
                questionId: question.id,
                choiceId: question.choices[0].id,
                isCorrect: false,
                idempotencyKey: 'dummy-key-' + Date.now(),
            }
        });
    }

    // 4. Run the query from attempts.service.ts
    const result = await prisma.attempt.findUnique({
        where: { id: attempt.id },
        include: {
            quiz: {
                select: {
                    id: true,
                    title: true,
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
            },
        },
    });

    console.log('Query Result Data:');
    if (result && result.answers.length > 0) {
        const ans = result.answers[0];
        console.log('Question Text:', ans.question.text);
        console.log('Solution:', ans.question.solution);
        console.log('Correct Choices:', JSON.stringify(ans.question.choices, null, 2));

        // Simulate mapping
        const mapped = {
            solution: ans.question.solution,
            correctAnswer: ans.question.choices[0] || null
        };
        console.log('Mapped Result:', mapped);
    } else {
        console.log('No answers found in result.');
    }

    // Cleanup
    await prisma.answer.deleteMany({ where: { attemptId: attempt.id } });
    await prisma.attempt.delete({ where: { id: attempt.id } });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
