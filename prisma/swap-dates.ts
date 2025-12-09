import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Swapping publishedAt dates...");

    const quizzes = await prisma.quiz.findMany({
        orderBy: { id: 'asc' }
    });

    if (quizzes.length < 2) {
        console.log("Not enough quizzes to swap.");
        return;
    }

    const quiz1 = quizzes[0]; // Should be Sample
    const quiz2 = quizzes[1]; // Should be Set 2

    console.log(`Quiz 1: [ID: ${quiz1.id}] "${quiz1.title}"`);
    console.log(`Quiz 2: [ID: ${quiz2.id}] "${quiz2.title}"`);

    // Only swap if order is wrong
    // Desired: Sample first (older date), Set 2 second (newer date)

    // Set Sample to 2 days ago
    const olderDate = new Date();
    olderDate.setDate(olderDate.getDate() - 2);

    // Set Set 2 to 1 day ago
    const newerDate = new Date();
    newerDate.setDate(newerDate.getDate() - 1);

    await prisma.quiz.update({
        where: { id: quiz1.id },
        data: { publishedAt: olderDate }
    });

    await prisma.quiz.update({
        where: { id: quiz2.id },
        data: { publishedAt: newerDate }
    });

    console.log("Dates updated. Sample is now older than Set 2.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
