import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'user@example.com';
    const password = await bcrypt.hash('password123', 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
            email,
            password,
            firstName: 'Test',
            lastName: 'User',
            isActive: true,
            stats: {
                create: {
                    xp: 1250,
                    energy: 5,
                    maxEnergy: 5,
                    diamonds: 100,
                    gems: 50,
                    dayStreak: 47,
                    totalStudyTimeSeconds: 75600, // 21 hours
                },
            },
        },
    });

    console.log({ user });

    // WACCES 2011 – Practice Quiz Set 2
    const quizTitle = "WACCES 2011 – Practice Quiz Set 2";
    const existingQuiz = await prisma.quiz.findFirst({
        where: { title: quizTitle }
    });

    if (!existingQuiz) {
        console.log(`Seeding quiz: ${quizTitle}`);
        await prisma.quiz.create({
            data: {
                title: quizTitle,
                description: "A second set of original practice questions inspired by the WACCES/BECE exam style.",
                timeLimit: 3600,
                passingScore: 10,
                maxAttempts: 3,
                isPublished: true,
                createdById: user.id,
                questions: {
                    create: [
                        {
                            text: "Which of the following gases is essential for human respiration?",
                            explanation: "Humans inhale oxygen to support cellular respiration.",
                            points: 2,
                            order: 1,
                            type: "single_choice",
                            choices: {
                                create: [
                                    { text: "Carbon dioxide", order: 1, isCorrect: false },
                                    { text: "Nitrogen", order: 2, isCorrect: false },
                                    { text: "Oxygen", order: 3, isCorrect: true },
                                    { text: "Helium", order: 4, isCorrect: false }
                                ]
                            }
                        },
                        {
                            text: "The part of the computer responsible for carrying out arithmetic and logic operations is the:",
                            explanation: "The ALU performs all arithmetic and logical functions.",
                            points: 3,
                            order: 2,
                            type: "single_choice",
                            choices: {
                                create: [
                                    { text: "Control Unit", order: 1, isCorrect: false },
                                    { text: "Input Unit", order: 2, isCorrect: false },
                                    { text: "ALU", order: 3, isCorrect: true },
                                    { text: "Memory Unit", order: 4, isCorrect: false }
                                ]
                            }
                        },
                        {
                            text: "What is the main purpose of a constitution in a country?",
                            explanation: "A constitution provides the fundamental laws and principles that govern a country.",
                            points: 3,
                            order: 3,
                            type: "single_choice",
                            choices: {
                                create: [
                                    { text: "To punish lawbreakers", order: 1, isCorrect: false },
                                    { text: "To guide the government in ruling the country", order: 2, isCorrect: true },
                                    { text: "To collect taxes", order: 3, isCorrect: false },
                                    { text: "To make products for export", order: 4, isCorrect: false }
                                ]
                            }
                        },
                        {
                            text: "The smallest unit of life is called a:",
                            explanation: "Cells are the basic structural and functional units of living things.",
                            points: 2,
                            order: 4,
                            type: "single_choice",
                            choices: {
                                create: [
                                    { text: "Tissue", order: 1, isCorrect: false },
                                    { text: "Cell", order: 2, isCorrect: true },
                                    { text: "Organ", order: 3, isCorrect: false },
                                    { text: "Organ system", order: 4, isCorrect: false }
                                ]
                            }
                        },
                        {
                            text: "Which of the following is an example of a physical change?",
                            explanation: "Physical changes do not form new substances.",
                            points: 2,
                            order: 5,
                            type: "single_choice",
                            choices: {
                                create: [
                                    { text: "Burning wood", order: 1, isCorrect: false },
                                    { text: "Rusting iron", order: 2, isCorrect: false },
                                    { text: "Melting ice", order: 3, isCorrect: true },
                                    { text: "Cooking rice", order: 4, isCorrect: false }
                                ]
                            }
                        }
                    ]
                }
            }
        });
        console.log(`Quiz '${quizTitle}' created.`);
    } else {
        console.log(`Quiz '${quizTitle}' already exists.`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
