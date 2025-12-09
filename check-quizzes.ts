import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const quizzes = await prisma.quiz.findMany({
        include: { questions: true }
    });
    console.log(JSON.stringify(quizzes, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
