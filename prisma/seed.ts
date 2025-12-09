import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'user@example.com';
    const password = await bcrypt.hash('password123', 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
            email,
            password,
            firstName: 'Test',
            lastName: 'User',
            isActive: true,
            stats: {
                create: {
                    xp: 1250,
                    energy: 5,
                    maxEnergy: 5,
                    diamonds: 100,
                    gems: 50,
                    dayStreak: 47,
                    totalStudyTimeSeconds: 75600, // 21 hours
                },
            },
        },
    });

    console.log({ user });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
