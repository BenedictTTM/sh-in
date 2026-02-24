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


    async getEnergy(userId: number, tx?: any): Promise<{ energy: number; maxEnergy: number; nextRefillAt: Date | null }> {
        const prisma = tx || this.prisma;
        let stats = await prisma.userStats.findUnique({
            where: { userId },
        });

        if (!stats) {
            return { energy: 0, maxEnergy: this.MAX_ENERGY_DEFAULT, nextRefillAt: null };
        }


        const now = new Date();
        const lastRefill = stats.lastEnergyRefillAt || stats.updatedAt;
        const msPassed = now.getTime() - lastRefill.getTime();
        const hoursPassed = msPassed / (1000 * 60 * 60);

        if (hoursPassed >= 1 && stats.energy < this.MAX_ENERGY_DEFAULT) {
            const energyToGrant = Math.floor(hoursPassed * this.REGENERATION_RATE_PER_HOUR);

            if (energyToGrant > 0) {
                const newEnergy = Math.min(stats.energy + energyToGrant, this.MAX_ENERGY_DEFAULT);


                const timeUsed = (energyToGrant / this.REGENERATION_RATE_PER_HOUR) * (1000 * 60 * 60);
                const newRefillDate = new Date(lastRefill.getTime() + timeUsed);


                stats = await prisma.userStats.update({
                    where: { userId },
                    data: {
                        energy: newEnergy,
                        lastEnergyRefillAt: newEnergy >= this.MAX_ENERGY_DEFAULT ? now : newRefillDate,
                    },
                });

                this.logger.log(`Regenerated ${energyToGrant} energy for user ${userId}. New balance: ${newEnergy}`);


                await prisma.currencyTransaction.create({
                    data: {
                        userId,
                        currency: CurrencyType.ENERGY,
                        type: TransactionType.ENERGY_REFILL_AUTO,
                        amount: energyToGrant,
                        balanceBefore: stats.energy - energyToGrant,
                        balanceAfter: newEnergy,
                        reason: TransactionReason.AUTO_REGENERATION,
                    },
                });
            }
        }


        let nextRefillAt: Date | null = null;
        if (stats.energy < this.MAX_ENERGY_DEFAULT) {
            const nowTs = Date.now();
            const lastRefillTs = stats.lastEnergyRefillAt ? stats.lastEnergyRefillAt.getTime() : stats.updatedAt.getTime();
            const msPerHour = 60 * 60 * 1000;





            const timeSinceAnchor = nowTs - lastRefillTs;


            const nextHourDelay = msPerHour - (timeSinceAnchor % msPerHour);

            nextRefillAt = new Date(nowTs + nextHourDelay);
        }

        return {
            energy: stats.energy,
            maxEnergy: this.MAX_ENERGY_DEFAULT,
            nextRefillAt,
        };
    }


    async consumeEnergy(
        userId: number,
        params: { amount: number; reason: TransactionReason; metadata?: any },
        tx?: any
    ): Promise<boolean> {
        const prisma = tx || this.prisma;
        // 1. Get current energy state (handles regeneration if needed)
        // Pass the transaction context to ensure we continually use the same connection
        const { energy } = await this.getEnergy(userId, prisma);

        if (energy < params.amount) {
            throw new BadRequestException(`Insufficient energy. Required: ${params.amount}, Available: ${energy}`);
        }

        const execute = async (txClient: any) => {
            // Fetch stats inside the transaction to ensure we have the latest state (and lock if needed by update later)
            const stats = await txClient.userStats.findUnique({ where: { userId } });

            if (!stats) {
                throw new BadRequestException('User stats not found');
            }

            if (stats.energy < params.amount) {
                throw new BadRequestException(`Insufficient energy. Required: ${params.amount}, Available: ${stats.energy}`);
            }

            const wasFull = stats.energy >= this.MAX_ENERGY_DEFAULT;

            const updatedStats = await txClient.userStats.update({
                where: { userId },
                data: {
                    energy: { decrement: params.amount },
                    lastEnergyRefillAt: wasFull ? new Date() : undefined,
                },
            });


            await txClient.currencyTransaction.create({
                data: {
                    userId,
                    currency: CurrencyType.ENERGY,
                    type: TransactionType.ENERGY_CONSUME,
                    amount: -params.amount,
                    balanceBefore: stats.energy,
                    balanceAfter: updatedStats.energy,
                    reason: params.reason,
                    metadata: params.metadata || {},
                },
            });
        };

        if (tx) {
            await execute(tx);
        } else {
            await this.prisma.$transaction(execute);
        }

        return true;
    }


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
