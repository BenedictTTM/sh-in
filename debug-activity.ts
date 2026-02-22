import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Users
    const users = await prisma.user.findMany({
        select: { id: true, email: true, firstName: true, lastName: true, googleId: true },
        orderBy: { id: 'asc' },
    });
    console.log('\n===== USERS =====');
    users.forEach(u => console.log(`  id=${u.id} email=${u.email} name=${u.firstName} ${u.lastName} googleId=${u.googleId}`));

    // 2. User Stats
    const stats = await prisma.userStats.findMany({
        include: { user: { select: { email: true } } },
        orderBy: { userId: 'asc' },
    });
    console.log('\n===== USER STATS =====');
    stats.forEach(s => console.log(`  userId=${s.userId} (${s.user.email}) xp=${s.xp} gems=${s.gems} level=${s.currentLevel} streak=${s.dayStreak} energy=${s.energy}`));

    // 3. Activity Logs
    const logs = await prisma.userActivityLog.findMany({
        include: { user: { select: { email: true } } },
        orderBy: [{ userId: 'asc' }, { activityDate: 'desc' }],
    });
    console.log('\n===== ACTIVITY LOGS =====');
    logs.forEach(l => console.log(`  userId=${l.userId} (${l.user.email}) date=${l.activityDate.toISOString().split('T')[0]} quizzes=${l.quizzesSolved}`));
    console.log(`  Total: ${logs.length} entries`);

    // 4. Recent Attempts
    const attempts = await prisma.attempt.findMany({
        include: { user: { select: { email: true } }, quiz: { select: { title: true } } },
        orderBy: { createdAt: 'desc' },
        take: 15,
    });
    console.log('\n===== RECENT ATTEMPTS =====');
    attempts.forEach(a => console.log(`  id=${a.id} userId=${a.userId} (${a.user.email}) quiz="${a.quiz.title}" status=${a.status} score=${a.score}/${a.maxScore}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
