
import { PrismaService } from '../src/prisma/prisma.service';
import { ContributionsService } from '../src/modules/contributions/contributions.service';

async function main() {
    console.log('Initializing Prisma Service...');
    const prisma = new PrismaService();
    await prisma.onModuleInit();

    console.log('Initializing Contributions Service...');
    const contributionsService = new ContributionsService(prisma);

    // 1. Find a user with some completed attempts to test with
    console.log('Finding a user with completed attempts...');
    const userWithAttempts = await prisma.attempt.findFirst({
        where: {
            status: 'completed',
            finishedAt: { not: null },
        },
        select: { userId: true },
    });

    if (!userWithAttempts) {
        console.warn('No users with completed attempts found. Creating mock data...');
        // Create mock data
        const mockUser = await prisma.user.create({
            data: {
                email: `test_stats_${Date.now()}@example.com`,
                password: 'hashed_password',
                firstName: 'Test',
                lastName: 'User',
            }
        });
        console.log(`Created mock user: ${mockUser.id}`);

        const mockQuiz = await prisma.quiz.create({
            data: {
                title: 'Test Quiz for Stats',
                createdById: mockUser.id,
            }
        });

        // Create an attempt finished yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        await prisma.attempt.create({
            data: {
                quizId: mockQuiz.id,
                userId: mockUser.id,
                status: 'completed',
                score: 10,
                maxScore: 10,
                finishedAt: yesterday,
                attemptToken: `token_${Date.now()}`,
            }
        });
        console.log(`Created mock completed attempt for user ${mockUser.id}`);

        await testUser(contributionsService, mockUser.id);

        // Cleanup
        console.log('Cleaning up mock data...');
        await prisma.attempt.deleteMany({ where: { userId: mockUser.id } });
        await prisma.quiz.delete({ where: { id: mockQuiz.id } });
        await prisma.user.delete({ where: { id: mockUser.id } });

    } else {
        console.log(`Found user with attempts: ID ${userWithAttempts.userId}`);
        await testUser(contributionsService, userWithAttempts.userId);
    }

    await prisma.$disconnect();
}

async function testUser(service: ContributionsService, userId: number) {
    console.log(`\n--- Testing User ID: ${userId} ---`);

    // 2. Sync contributions
    console.log('Running syncUserContributions...');
    const syncResult = await service.syncUserContributions(userId);
    console.log('Sync Result:', syncResult);

    // 3. Get contributions
    console.log('Fetching user contributions...');
    const contributions = await service.getUserContributions(userId);
    console.log(`Retrieved ${contributions.length} contribution days.`);

    if (contributions.length > 0) {
        console.log('Sample contributions:', contributions.slice(0, 5));
    } else {
        console.log('No contribution logs found for this user.');
    }

    console.log('--- Test Complete ---\n');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
