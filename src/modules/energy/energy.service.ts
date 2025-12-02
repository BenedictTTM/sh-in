import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EnergyService {
    private readonly REFILL_RATE_MINUTES = 30;
    private readonly ENERGY_PER_REFILL = 1;

    constructor(private prisma: PrismaService) { }

    async getEnergy(userId: number) {
        let stats = await this.prisma.userStats.findUnique({
            where: { userId },
        });

        if (!stats) {
            stats = await this.prisma.userStats.create({
                data: { userId },
            });
        }

        // Calculate refill
        const now = new Date();
        const lastRefill = new Date(stats.lastEnergyRefillAt);
        const msSinceRefill = now.getTime() - lastRefill.getTime();
        const minutesSinceRefill = Math.floor(msSinceRefill / (1000 * 60));

        if (stats.energy < stats.maxEnergy && minutesSinceRefill >= this.REFILL_RATE_MINUTES) {
            const refills = Math.floor(minutesSinceRefill / this.REFILL_RATE_MINUTES);
            const energyToAdd = refills * this.ENERGY_PER_REFILL;
            const newEnergy = Math.min(stats.maxEnergy, stats.energy + energyToAdd);

            // Update last refill time to the most recent refill interval
            // This prevents "losing" partial time if we just set it to 'now'
            const timeAdded = refills * this.REFILL_RATE_MINUTES * 60 * 1000;
            const newLastRefillAt = new Date(lastRefill.getTime() + timeAdded);

            stats = await this.prisma.userStats.update({
                where: { userId },
                data: {
                    energy: newEnergy,
                    lastEnergyRefillAt: newLastRefillAt,
                },
            });
        }

        // Calculate time until next refill
        let nextRefillAt: Date | null = null;
        if (stats.energy < stats.maxEnergy) {
            nextRefillAt = new Date(stats.lastEnergyRefillAt.getTime() + this.REFILL_RATE_MINUTES * 60 * 1000);
        }

        return {
            energy: stats.energy,
            maxEnergy: stats.maxEnergy,
            nextRefillAt,
        };
    }

    async consumeEnergy(userId: number, amount: number = 1) {
        // Ensure energy is up to date first
        await this.getEnergy(userId);

        const stats = await this.prisma.userStats.findUnique({
            where: { userId },
        });

        if (!stats || stats.energy < amount) {
            throw new BadRequestException('Not enough energy');
        }

        // If we are at max energy and start consuming, we should reset the refill timer to now
        // so that regeneration starts from the moment energy is used.
        // However, the simple model is: refill happens at fixed intervals from 'lastEnergyRefillAt'.
        // If we are at max, 'lastEnergyRefillAt' might be old.
        // Let's reset 'lastEnergyRefillAt' to now if we were at max energy, to start the timer.
        let updateData: any = {
            energy: { decrement: amount },
        };

        if (stats.energy === stats.maxEnergy) {
            updateData.lastEnergyRefillAt = new Date();
        }

        return this.prisma.userStats.update({
            where: { userId },
            data: updateData,
        });
    }
}
