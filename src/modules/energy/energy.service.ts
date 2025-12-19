import {
    Injectable,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    CurrencyType,
    TransactionType,
    TransactionReason,
} from '../../common/enums/currency.enum';

@Injectable()
export class EnergyService {
    private readonly logger = new Logger(EnergyService.name);
    private readonly REGENERATION_RATE_PER_HOUR = 2;
    private readonly MAX_ENERGY_DEFAULT = 30;

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Calculate and update refined energy based on time passed
     */
    async getEnergy(userId: number): Promise<{ energy: number; maxEnergy: number; nextRefillAt: Date | null }> {
        let stats = await this.prisma.userStats.findUnique({
            where: { userId },
        });

        if (!stats) {
            // Should normally exist via triggers or user creation, but handle safely
            return { energy: 0, maxEnergy: this.MAX_ENERGY_DEFAULT, nextRefillAt: null };
        }

        // Lazy update: Calculate accrued energy
        const now = new Date();
        const lastRefill = stats.lastEnergyRefillAt || stats.updatedAt;
        const msPassed = now.getTime() - lastRefill.getTime();
        const hoursPassed = msPassed / (1000 * 60 * 60);

        if (hoursPassed >= 1 && stats.energy < this.MAX_ENERGY_DEFAULT) {
            const energyToGrant = Math.floor(hoursPassed * this.REGENERATION_RATE_PER_HOUR);

            if (energyToGrant > 0) {
                const newEnergy = Math.min(stats.energy + energyToGrant, this.MAX_ENERGY_DEFAULT);

                // Reset the "clock" only by the amount of time we actually used for regeneration
                const timeUsed = (energyToGrant / this.REGENERATION_RATE_PER_HOUR) * (1000 * 60 * 60);
                const newRefillDate = new Date(lastRefill.getTime() + timeUsed);

                // Update DB
                stats = await this.prisma.userStats.update({
                    where: { userId },
                    data: {
                        energy: newEnergy,
                        lastEnergyRefillAt: newEnergy >= this.MAX_ENERGY_DEFAULT ? now : newRefillDate,
                    },
                });

                this.logger.log(`Regenerated ${energyToGrant} energy for user ${userId}. New balance: ${newEnergy}`);

                // Log transaction for auto-regeneration
                await this.prisma.currencyTransaction.create({
                    data: {
                        userId,
                        currency: CurrencyType.ENERGY,
                        type: TransactionType.ENERGY_REFILL_AUTO,
                        amount: energyToGrant,
                        balanceBefore: stats.energy - energyToGrant, // calc strict previous
                        balanceAfter: newEnergy,
                        reason: TransactionReason.AUTO_REGENERATION,
                    },
                });
            }
        }

        // Calculate when the next 2 bars will come
        let nextRefillAt: Date | null = null;
        if (stats.energy < this.MAX_ENERGY_DEFAULT) {
            const nowTs = Date.now();
            const lastRefillTs = stats.lastEnergyRefillAt ? stats.lastEnergyRefillAt.getTime() : stats.updatedAt.getTime();
            const msPerHour = 60 * 60 * 1000;

            // Calculate delay until the next full interval completion
            // We moved lastEnergyRefillAt forward, so we count from there? 
            // Actually with the logic above: `newRefillDate` is the anchor.
            // So delay = 1 hour - (now - lastEnergyRefillAt)
            const timeSinceAnchor = nowTs - lastRefillTs;

            // If we are partly through an interval
            const nextHourDelay = msPerHour - (timeSinceAnchor % msPerHour);

            nextRefillAt = new Date(nowTs + nextHourDelay);
        }

        return {
            energy: stats.energy,
            maxEnergy: this.MAX_ENERGY_DEFAULT,
            nextRefillAt,
        };
    }

    /**
     * Deduct energy for an action
     */
    async consumeEnergy(
        userId: number,
        params: { amount: number; reason: TransactionReason; metadata?: any },
    ): Promise<boolean> {
        // 1. Ensure up-to-date balance
        const { energy } = await this.getEnergy(userId);

        if (energy < params.amount) {
            throw new BadRequestException(`Insufficient energy. Required: ${params.amount}, Available: ${energy}`);
        }

        // 2. Transact
        await this.prisma.$transaction(async (tx) => {
            // Check if we are dropping below max energy (and were previously at or above it)
            // If so, we must anchor the regeneration start time to NOW.
            const stats = await tx.userStats.findUnique({ where: { userId } });

            if (!stats) {
                throw new BadRequestException('User stats not found');
            }

            const wasFull = stats.energy >= this.MAX_ENERGY_DEFAULT;

            // Deduct
            const updatedStats = await tx.userStats.update({
                where: { userId },
                data: {
                    energy: { decrement: params.amount },
                    // If we were full, and typically dropping below, set refill timer to now.
                    // If we were NOT full, we keep the old timer (regeneration continues).
                    lastEnergyRefillAt: wasFull ? new Date() : undefined,
                },
            });

            // Log
            await tx.currencyTransaction.create({
                data: {
                    userId,
                    currency: CurrencyType.ENERGY,
                    type: TransactionType.ENERGY_CONSUME,
                    amount: -params.amount,
                    balanceBefore: energy,
                    balanceAfter: updatedStats.energy,
                    reason: params.reason,
                    metadata: params.metadata || {},
                },
            });
        });

        return true;
    }

    /**
     * Refill energy (e.g. from shop or conversion)
     */
    async refillEnergy(
        userId: number,
        amount: number,
        reason: TransactionReason | string,
    ): Promise<number> {
        const stats = await this.prisma.userStats.findUnique({ where: { userId } });

        if (!stats) {
            throw new BadRequestException('User stats not found');
        }

        const currentEnergy = stats.energy;

        // Cap at 30
        const newEnergyUncapped = currentEnergy + amount;
        const newEnergy = Math.min(newEnergyUncapped, this.MAX_ENERGY_DEFAULT);
        const addedAmount = newEnergy - currentEnergy;

        if (addedAmount <= 0) {
            return currentEnergy;
        }

        await this.prisma.$transaction(async (tx) => {
            await tx.userStats.update({
                where: { userId },
                data: {
                    energy: newEnergy,
                },
            });

            await tx.currencyTransaction.create({
                data: {
                    userId,
                    currency: CurrencyType.ENERGY,
                    type: TransactionType.ENERGY_REFILL_DIAMOND,
                    amount: addedAmount,
                    balanceBefore: currentEnergy,
                    balanceAfter: newEnergy,
                    reason: reason as string,
                },
            });
        });

        return newEnergy;
    }

    /**
     * Award energy to a user (e.g. gameplay reward)
     */
    async awardEnergy(
        userId: number,
        amount: number,
        reason: string = 'Reward',
    ): Promise<number> {
        const stats = await this.prisma.userStats.findUnique({ where: { userId } });

        if (!stats) {
            throw new BadRequestException('User stats not found');
        }

        const currentEnergy = stats.energy;

        // Cap at 30 (MAX_ENERGY_DEFAULT)
        const newEnergyUncapped = currentEnergy + amount;
        const newEnergy = Math.min(newEnergyUncapped, this.MAX_ENERGY_DEFAULT);
        const addedAmount = newEnergy - currentEnergy;

        if (addedAmount <= 0) {
            return currentEnergy;
        }

        await this.prisma.$transaction(async (tx) => {
            await tx.userStats.update({
                where: { userId },
                data: {
                    energy: newEnergy,
                },
            });

            await tx.currencyTransaction.create({
                data: {
                    userId,
                    currency: CurrencyType.ENERGY,
                    type: TransactionType.ENERGY_REWARD,
                    amount: addedAmount,
                    balanceBefore: currentEnergy,
                    balanceAfter: newEnergy,
                    reason: reason,
                },
            });
        });

        return newEnergy;
    }
}
