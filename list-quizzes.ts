import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const quizzes = await prisma.quiz.findMany({
        select: { id: true, title: true, isPublished: true, questions: { select: { id: true } } }
    });
    console.log(`Total Quizzes: ${quizzes.length}`);
    quizzes.forEach(q => {
        console.log(`ID: ${q.id} | Title: ${q.title} | Published: ${q.isPublished} | Questions: ${q.questions.length}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
