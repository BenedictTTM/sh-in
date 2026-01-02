
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Updating Lesson 2 content...");

    // 1. Find the "Number and Basic Operations" lesson (usually Lesson 2 or ID 5 based on logs)
    // We'll search by title to be safe, or fallback to the one after "Getting Started"

    // In the logs, Lesson 5 was "Number and Basic Operations".
    // Let's find it.
    const lessonTitle = "Number and Basic Operations";
    const lesson = await prisma.lesson.findFirst({
        where: {
            title: {
                contains: "Basic Operations"
            }
        },
        include: { challenges: true }
    });

    if (!lesson) {
        console.error("Lesson 'Number and Basic Operations' not found!");
        return;
    }

    console.log(`Found Lesson: ${lesson.title} (ID: ${lesson.id})`);
    console.log(`Deleting ${lesson.challenges.length} old challenges...`);

    // 2. Delete existing duplicate challenges
    await prisma.challenge.deleteMany({
        where: { lessonId: lesson.id }
    });

    // 3. Create new unique challenges for Basic Operations
    console.log("Creating new challenges...");

    const newChallenges = [
        {
            question: "What is the result of 15 + 27?",
            type: "SELECT",
            order: 1,
            options: [
                { text: "32", correct: false },
                { text: "42", correct: true }, // Correct
                { text: "45", correct: false },
                { text: "38", correct: false }
            ]
        },
        {
            question: "Which operation is the inverse of multiplication?",
            type: "SELECT",
            order: 2,
            options: [
                { text: "Addition", correct: false },
                { text: "Subtraction", correct: false },
                { text: "Division", correct: true }, // Correct
                { text: "Exponentiation", correct: false }
            ]
        },
        {
            question: "Calculate: 100 - (5 x 5)",
            type: "SELECT",
            order: 3,
            options: [
                { text: "75", correct: true }, // Correct (100 - 25)
                { text: "475", correct: false },
                { text: "90", correct: false },
                { text: "50", correct: false }
            ]
        },
        {
            question: "If you have 12 apples and share them equally among 4 friends, how many does each get?",
            type: "SELECT",
            order: 4,
            options: [
                { text: "2", correct: false },
                { text: "3", correct: true }, // Correct
                { text: "4", correct: false },
                { text: "6", correct: false }
            ]
        },
        {
            question: "What is 8 squared (8²)?",
            type: "SELECT",
            order: 5,
            options: [
                { text: "16", correct: false },
                { text: "56", correct: false },
                { text: "64", correct: true }, // Correct
                { text: "80", correct: false }
            ]
        }
    ];

    for (const challenge of newChallenges) {
        await prisma.challenge.create({
            data: {
                lessonId: lesson.id,
                question: challenge.question,
                type: challenge.type,
                order: challenge.order,
                options: {
                    create: challenge.options
                }
            }
        });
    }

    console.log("✅ Lesson 2 content updated successfully!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
