import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const userId = 3;
    console.log(`Checking progress for User ${userId}...`);

    const attempts = await prisma.attempt.findMany({
        where: {
            userId,
            status: 'completed'
        },
        include: { quiz: true }
    });

    console.log(`Found ${attempts.length} completed attempts.`);
    attempts.forEach(a => {
        console.log(`- Quiz ID: ${a.quizId} ("${a.quiz.title}") completed at ${a.finishedAt}`);
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
