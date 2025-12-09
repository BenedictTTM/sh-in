import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Find the admin/default user to be the creator
    const user = await prisma.user.findFirst({
        orderBy: { id: 'asc' }
    });

    if (!user) {
        throw new Error("No user found in the database. Please seed users first.");
    }

    console.log(`Creating science quizzes with author: ${user.email} (ID: ${user.id})`);

    const quizzes = [
        {
            title: "Science Explorer: Fundamentals",
            description: "A fundamental quiz testing your knowledge on basic science concepts.",
            passingScore: 3,
            questions: [
                {
                    text: "What is the chemical symbol for water?",
                    explanation: "Water is composed of two hydrogen atoms and one oxygen atom.",
                    points: 1,
                    choices: [
                        { text: "H2O", isCorrect: true },
                        { text: "O2", isCorrect: false },
                        { text: "CO2", isCorrect: false },
                        { text: "NaCl", isCorrect: false }
                    ]
                },
                {
                    text: "Which planet is known as the Red Planet?",
                    explanation: "Mars appears red due to iron oxide on its surface.",
                    points: 1,
                    choices: [
                        { text: "Venus", isCorrect: false },
                        { text: "Mars", isCorrect: true },
                        { text: "Jupiter", isCorrect: false },
                        { text: "Saturn", isCorrect: false }
                    ]
                },
                {
                    text: "What gas do plants absorb from the atmosphere for photosynthesis?",
                    explanation: "Plants take in carbon dioxide to produce food.",
                    points: 1,
                    choices: [
                        { text: "Oxygen", isCorrect: false },
                        { text: "Nitrogen", isCorrect: false },
                        { text: "Carbon Dioxide", isCorrect: true },
                        { text: "Hydrogen", isCorrect: false }
                    ]
                }
            ]
        },
        {
            title: "Science Explorer: Advanced",
            description: "An advanced quiz engaging with more specific scientific topics.",
            passingScore: 3,
            questions: [
                {
                    text: "What is the powerhouse of the cell?",
                    explanation: "Mitochondria generate most of the chemical energy needed to power the cell's biochemical reactions.",
                    points: 1,
                    choices: [
                        { text: "Nucleus", isCorrect: false },
                        { text: "Ribosome", isCorrect: false },
                        { text: "Mitochondria", isCorrect: true },
                        { text: "Endoplasmic Reticulum", isCorrect: false }
                    ]
                },
                {
                    text: "What is the speed of light in a vacuum approximately?",
                    explanation: "Light travels at approximately 299,792,458 meters per second.",
                    points: 1,
                    choices: [
                        { text: "300,000 km/s", isCorrect: true },
                        { text: "150,000 km/s", isCorrect: false },
                        { text: "1,000 km/s", isCorrect: false },
                        { text: "3,000 km/s", isCorrect: false }
                    ]
                },
                {
                    text: "Which element has the atomic number 1?",
                    explanation: "Hydrogen is the lightest and first element on the periodic table.",
                    points: 1,
                    choices: [
                        { text: "Helium", isCorrect: false },
                        { text: "Hydrogen", isCorrect: true },
                        { text: "Lithium", isCorrect: false },
                        { text: "Carbon", isCorrect: false }
                    ]
                }
            ]
        }
    ];

    for (const quizData of quizzes) {
        // Check if it already exists to avoid duplicates
        const existing = await prisma.quiz.findFirst({
            where: { title: quizData.title }
        });

        if (existing) {
            console.log(`Quiz "${quizData.title}" already exists. Skipping.`);
            continue;
        }

        const quiz = await prisma.quiz.create({
            data: {
                title: quizData.title,
                description: quizData.description,
                timeLimit: 300, // 5 minutes
                passingScore: quizData.passingScore,
                maxAttempts: 5,
                isPublished: true,
                publishedAt: new Date(),
                createdById: user.id,
                questions: {
                    create: quizData.questions.map((q, i) => ({
                        text: q.text,
                        explanation: q.explanation,
                        points: q.points,
                        order: i + 1,
                        type: "single_choice",
                        choices: {
                            create: q.choices.map((c, ci) => ({
                                text: c.text,
                                order: ci + 1,
                                isCorrect: c.isCorrect
                            }))
                        }
                    }))
                }
            }
        });

        console.log(`Successfully created quiz: "${quiz.title}" (ID: ${quiz.id})`);
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
