import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Fixing NULL publishedAt dates...");

    // 1. WACCES 2011 – Sample Practice Quiz (ID 1) -> Set to Yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await prisma.quiz.updateMany({
        where: { id: 1 },
        data: { publishedAt: yesterday }
    });
    console.log("Updated Quiz ID 1 publishedAt to Yesterday.");

    // 2. WACCES 2011 – Practice Quiz Set 2 (ID 2) -> Set to Today
    await prisma.quiz.updateMany({
        where: { id: 2 },
        data: { publishedAt: new Date() }
    });
    console.log("Updated Quiz ID 2 publishedAt to Today.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
