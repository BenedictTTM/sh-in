import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AttemptsService } from '../src/modules/attempts/attempts.service';
import { EnergyService } from '../src/modules/energy/energy.service';
import { PrismaService } from '../src/prisma/prisma.service';

async function bootstrap() {
    // Create application context (no HTTP server)
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const attemptsService = app.get(AttemptsService);
    const energyService = app.get(EnergyService);
    const prisma = app.get(PrismaService);

    try {
        console.log('--- Starting Energy Consumption Test ---');

        // 1. Get a test user (User ID 1 is usually a safe bet or just the first user)
        const user = await prisma.user.findFirst();
        if (!user) throw new Error('No user found in database');
        console.log(`User: ${user.email} (ID: ${user.id})`);

        // 2. Get a valid quiz
        const quiz = await prisma.quiz.findFirst({
            where: { isPublished: true, deletedAt: null },
        });
        if (!quiz) throw new Error('No published quiz found');
        console.log(`Quiz: ${quiz.title} (ID: ${quiz.id})`);

        // 3. Check Initial Energy
        let { energy: initialEnergy } = await energyService.getEnergy(user.id);
        console.log(`Initial Energy: ${initialEnergy}`);

        // Ensure enough energy
        if (initialEnergy < 5) {
            console.log('Refilling energy for test...');
            await energyService.refillEnergy(user.id, 10, 'Test Refill');
            initialEnergy = (await energyService.getEnergy(user.id)).energy;
            console.log(`New Initial Energy: ${initialEnergy}`);
        }

        // 4. Start Attempt
        console.log('Attempting to start quiz...');
        try {
            const attempt = await attemptsService.startAttempt(quiz.id, user.id);
            console.log(`Attempt started: ${attempt.attemptId}`);
        } catch (err: any) {
            console.error('Failed to start attempt:', err.message);
            throw err;
        }

        // 5. Verify Deduction
        const { energy: finalEnergy } = await energyService.getEnergy(user.id);
        console.log(`Final Energy: ${finalEnergy}`);

        const diff = initialEnergy - finalEnergy;
        if (diff === 5) {
            console.log('✅ SUCCESS: 5 Energy consumed.');
        } else {
            console.error(`❌ FAILURE: Expected 5 consumed, but difference was ${diff}.`);
        }

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        await app.close();
        process.exit(0);
    }
}

bootstrap();
