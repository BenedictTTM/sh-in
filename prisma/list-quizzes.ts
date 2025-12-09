import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Fetching ALL quizzes...");
    const quizzes = await prisma.quiz.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, title: true, publishedAt: true, isPublished: true, deletedAt: true }
    });

    console.log("All Quizzes:");
    quizzes.forEach((q) => {
        console.log(`[ID: ${q.id}] "${q.title}"`);
        console.log(`\tPublished: ${q.isPublished}, Date: ${q.publishedAt ? q.publishedAt.toISOString() : 'NULL'}`);
        console.log(`\tDeleted: ${q.deletedAt ? q.deletedAt.toISOString() : 'NULL'}`);
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
