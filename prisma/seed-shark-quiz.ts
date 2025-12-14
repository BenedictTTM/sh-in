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

    console.log(`Creating quiz with author: ${user.email} (ID: ${user.id})`);

    const quizTitle = "Shark Wisdom: The Ultimate Trivia";

    // Check if it already exists to avoid duplicates
    const existing = await prisma.quiz.findFirst({
        where: { title: quizTitle }
    });

    if (existing) {
        console.log(`Quiz "${quizTitle}" already exists. Skipping.`);
        return;
    }

    // 2. Create the Quiz
    // Total Points: 2 + 2 + 3 + 1 + 3 = 11
    // Passing Score: 8
    const quiz = await prisma.quiz.create({
        data: {
            title: quizTitle,
            description: "Test your knowledge about the ocean's most fascinating predators!",
            timeLimit: 300, // 5 minutes
            passingScore: 8,
            maxAttempts: null,
            isPublished: true, // Make sure it shows up directly
            // Make sure it appears AFTER the existing quizzes. 
            // The previous code had a logic about "previous level". 
            // If I want this to be accessible, I should ensure the publishedAt date implies order or user has completed others.
            // For now, let's just publish it.
            publishedAt: new Date(),
            createdById: user.id,
            questions: {
                create: [
                    {
                        text: "Which species of shark is the largest living fish?",
                        explanation: "The Whale Shark can grow up to 12 meters long or more!",
                        points: 2,
                        order: 1,
                        type: "single_choice",
                        choices: {
                            create: [
                                { text: "Great White Shark", order: 1, isCorrect: false },
                                { text: "Whale Shark", order: 2, isCorrect: true },
                                { text: "Tiger Shark", order: 3, isCorrect: false },
                                { text: "Hammerhead Shark", order: 4, isCorrect: false }
                            ]
                        }
                    },
                    {
                        text: "How many bones does a shark's skeleton contain?",
                        explanation: "Sharks are elasmobranchs, meaning their skeletons are made purely of cartilage, not bone.",
                        points: 2,
                        order: 2,
                        type: "single_choice",
                        choices: {
                            create: [
                                { text: "Zero", order: 1, isCorrect: true },
                                { text: "206", order: 2, isCorrect: false },
                                { text: "Over 1000", order: 3, isCorrect: false },
                                { text: "50", order: 4, isCorrect: false }
                            ]
                        }
                    },
                    {
                        text: "What is the collective noun for a group of sharks?",
                        explanation: "A group of sharks is commonly called a 'shiver'.",
                        points: 3,
                        order: 3,
                        type: "single_choice",
                        choices: {
                            create: [
                                { text: "A School", order: 1, isCorrect: false },
                                { text: "A Pod", order: 2, isCorrect: false },
                                { text: "A Shiver", order: 3, isCorrect: true },
                                { text: "A Herd", order: 4, isCorrect: false }
                            ]
                        }
                    },
                    {
                        text: "Which organ helps sharks detect electrical fields from prey?",
                        explanation: "The Ampullae of Lorenzini are special sensing organs called electroreceptors.",
                        points: 3,
                        order: 4,
                        type: "single_choice",
                        choices: {
                            create: [
                                { text: "Lateral Line", order: 1, isCorrect: false },
                                { text: "Ampullae of Lorenzini", order: 2, isCorrect: true },
                                { text: "Spiracles", order: 3, isCorrect: false },
                                { text: "Swim Bladder", order: 4, isCorrect: false }
                            ]
                        }
                    },
                    {
                        text: "Do sharks have eyelids?",
                        explanation: "Yes, sharks have eyelids, but they don't blink like humans. Some have a nictitating membrane to protect their eyes.",
                        points: 1,
                        order: 5,
                        type: "single_choice",
                        choices: {
                            create: [
                                { text: "Yes", order: 1, isCorrect: true },
                                { text: "No", order: 2, isCorrect: false }
                            ]
                        }
                    }
                ]
            }
        }
    });

    console.log(`Successfully created quiz: "${quiz.title}" (ID: ${quiz.id})`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
