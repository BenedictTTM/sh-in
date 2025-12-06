import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsumeEnergyDto, RefillEnergyDto, GrantEnergyDto } from './dto/energy.dto';
import {
    CurrencyType,
    TransactionType,
    TransactionReason,
} from '../../common/enums/currency.enum';

@Injectable()
export class EnergyService {
    private readonly logger = new Logger(EnergyService.name);

    // Configuration constants
    private readonly REFILL_RATE_MINUTES = 30; // 1 energy every 30 minutes
    private readonly ENERGY_PER_REFILL = 1;
    private readonly DIAMOND_COST_PER_ENERGY = 10; // 10 diamonds = 1 energy

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get current energy status with auto-refill calculation
     */
    async getEnergy(userId: number): Promise<{
        energy: number;
        maxEnergy: number;
        nextRefillAt: Date | null;
        refillRate: number;
    }> {
        let stats = await this.ensureUserStats(userId);

        // Calculate auto-refill
        const now = new Date();
        const lastRefill = new Date(stats.lastEnergyRefillAt);
        const msSinceRefill = now.getTime() - lastRefill.getTime();
        const minutesSinceRefill = Math.floor(msSinceRefill / (1000 * 60));

        // If energy is below max and enough time has passed, refill
        if (
            stats.energy < stats.maxEnergy &&
            minutesSinceRefill >= this.REFILL_RATE_MINUTES
        ) {
            const refills = Math.floor(minutesSinceRefill / this.REFILL_RATE_MINUTES);
            const energyToAdd = refills * this.ENERGY_PER_REFILL;
            const newEnergy = Math.min(stats.maxEnergy, stats.energy + energyToAdd);

            // Calculate new refill timestamp (prevents time drift)
            const timeAdded = refills * this.REFILL_RATE_MINUTES * 60 * 1000;
            const newLastRefillAt = new Date(lastRefill.getTime() + timeAdded);

            // Update with transaction logging
            await this.prisma.$transaction(async (tx) => {
                const balanceBefore = stats.energy;
                const balanceAfter = newEnergy;

                stats = await tx.userStats.update({
                    where: { userId },
                    data: {
                        energy: newEnergy,
                        lastEnergyRefillAt: newLastRefillAt,
                    },
                });

                // Log auto-refill transaction
                if (energyToAdd > 0) {
                    await tx.currencyTransaction.create({
                        data: {
                            userId,
                            type: TransactionType.ENERGY_REFILL_AUTO,
                            currency: CurrencyType.ENERGY,
                            amount: energyToAdd,
                            balanceBefore,
                            balanceAfter,
                            reason: TransactionReason.AUTO_REGENERATION,
                        },
                    });
                }
            });

            this.logger.debug(
                `Auto-refilled ${energyToAdd} energy for user ${userId}. New balance: ${newEnergy}`,
            );
        }

        // Calculate time until next refill
        let nextRefillAt: Date | null = null;
        if (stats.energy < stats.maxEnergy) {
            nextRefillAt = new Date(
                stats.lastEnergyRefillAt.getTime() +
                this.REFILL_RATE_MINUTES * 60 * 1000,
            );
        }

        return {
            energy: stats.energy,
            maxEnergy: stats.maxEnergy,
            nextRefillAt,
            refillRate: this.REFILL_RATE_MINUTES,
        };
    }

    /**
     * Consume energy (e.g., for playing a quiz)
     */
    async consumeEnergy(
        userId: number,
        dto: ConsumeEnergyDto,
    ): Promise<{
        energy: number;
        maxEnergy: number;
    }> {
        // Check for duplicate consumption using idempotency key
        if (dto.idempotencyKey) {
            const existing = await this.prisma.currencyTransaction.findUnique({
                where: { idempotencyKey: dto.idempotencyKey },
            });

            if (existing) {
                this.logger.warn(
                    `Duplicate energy consumption attempt: ${dto.idempotencyKey}`,
                );
                throw new ConflictException('Transaction already processed');
            }
        }

        // Ensure energy is up to date first
        await this.getEnergy(userId);

        const result = await this.prisma.$transaction(async (tx) => {
            const stats = await tx.userStats.findUnique({
                where: { userId },
            });

            if (!stats) {
                throw new NotFoundException('User stats not found');
            }

            // Check sufficient energy
            if (stats.energy < dto.amount) {
                throw new BadRequestException(
                    `Not enough energy. Required: ${dto.amount}, Available: ${stats.energy}`,
                );
            }

            const balanceBefore = stats.energy;
            const balanceAfter = balanceBefore - dto.amount;

            // Reset refill timer if at max energy
            const updateData: any = {
                energy: balanceAfter,
            };

            if (stats.energy === stats.maxEnergy) {
                updateData.lastEnergyRefillAt = new Date();
            }

            const updatedStats = await tx.userStats.update({
                where: { userId },
                data: updateData,
            });

            // Log consumption transaction
            await tx.currencyTransaction.create({
                data: {
                    userId,
                    type: TransactionType.ENERGY_CONSUME,
                    currency: CurrencyType.ENERGY,
                    amount: -dto.amount, // negative for debit
                    balanceBefore,
                    balanceAfter,
                    reason: dto.reason,
                    metadata: dto.metadata,
                    idempotencyKey: dto.idempotencyKey,
                },
            });

            return {
                energy: updatedStats.energy,
                maxEnergy: updatedStats.maxEnergy,
            };
        });

        this.logger.log(
            `User ${userId} consumed ${dto.amount} energy for ${dto.reason}. New balance: ${result.energy}`,
        );

        return result;
    }

    /**
     * Refill energy using diamonds
     */
    async refillWithDiamonds(
        userId: number,
        dto: RefillEnergyDto,
    ): Promise<{
        energy: number;
        maxEnergy: number;
        diamondsSpent: number;
    }> {
        // Check for duplicate refill using idempotency key
        if (dto.idempotencyKey) {
            const existing = await this.prisma.currencyTransaction.findUnique({
                where: { idempotencyKey: dto.idempotencyKey },
            });

            if (existing) {
                this.logger.warn(
                    `Duplicate energy refill attempt: ${dto.idempotencyKey}`,
                );
                throw new ConflictException('Transaction already processed');
            }
        }

        const diamondCost = dto.amount * this.DIAMOND_COST_PER_ENERGY;

        const result = await this.prisma.$transaction(async (tx) => {
            const stats = await tx.userStats.findUnique({
                where: { userId },
            });

            if (!stats) {
                throw new NotFoundException('User stats not found');
            }

            // Check sufficient diamonds
            if (stats.diamonds < diamondCost) {
                throw new BadRequestException(
                    `Insufficient diamonds. Required: ${diamondCost}, Available: ${stats.diamonds}`,
                );
            }

            // Check if energy is already at max
            if (stats.energy >= stats.maxEnergy) {
                throw new BadRequestException('Energy is already at maximum');
            }

            const energyBefore = stats.energy;
            const diamondsBefore = stats.diamonds;

            // Calculate new energy (cap at max)
            const newEnergy = Math.min(stats.maxEnergy, stats.energy + dto.amount);
            const actualEnergyAdded = newEnergy - stats.energy;
            const actualDiamondCost = actualEnergyAdded * this.DIAMOND_COST_PER_ENERGY;

            // Update stats
            const updatedStats = await tx.userStats.update({
                where: { userId },
                data: {
                    energy: newEnergy,
                    diamonds: stats.diamonds - actualDiamondCost,
                },
            });

            // Log energy refill transaction
            await tx.currencyTransaction.create({
                data: {
                    userId,
                    type: TransactionType.ENERGY_REFILL_DIAMOND,
                    currency: CurrencyType.ENERGY,
                    amount: actualEnergyAdded,
                    balanceBefore: energyBefore,
                    balanceAfter: newEnergy,
                    reason: TransactionReason.DIAMOND_PURCHASE,
                    metadata: { diamondsSpent: actualDiamondCost },
                    idempotencyKey: dto.idempotencyKey,
                },
            });

            // Log diamond spend transaction
            await tx.currencyTransaction.create({
                data: {
                    userId,
                    type: TransactionType.DIAMOND_SPEND,
                    currency: CurrencyType.DIAMONDS,
                    amount: -actualDiamondCost,
                    balanceBefore: diamondsBefore,
                    balanceAfter: updatedStats.diamonds,
                    reason: TransactionReason.ENERGY_REFILL,
                    metadata: { energyPurchased: actualEnergyAdded },
                },
            });

            return {
                energy: updatedStats.energy,
                maxEnergy: updatedStats.maxEnergy,
                diamondsSpent: actualDiamondCost,
            };
        });

        this.logger.log(
            `User ${userId} refilled ${dto.amount} energy using ${result.diamondsSpent} diamonds`,
        );

        return result;
    }

    /**
     * Grant energy to user (admin function or rewards)
     */
    async grantEnergy(
        dto: GrantEnergyDto,
    ): Promise<{
        energy: number;
        maxEnergy: number;
    }> {
        const result = await this.prisma.$transaction(async (tx) => {
            const stats = await this.ensureUserStats(dto.userId, tx);

            const balanceBefore = stats.energy;
            const newEnergy = Math.min(stats.maxEnergy, stats.energy + dto.amount);
            const actualEnergyAdded = newEnergy - stats.energy;

            const updatedStats = await tx.userStats.update({
                where: { userId: dto.userId },
                data: { energy: newEnergy },
            });

            // Log grant transaction
            await tx.currencyTransaction.create({
                data: {
                    userId: dto.userId,
                    type: TransactionType.ENERGY_REWARD,
                    currency: CurrencyType.ENERGY,
                    amount: actualEnergyAdded,
                    balanceBefore,
                    balanceAfter: newEnergy,
                    reason: dto.reason,
                },
            });

            return {
                energy: updatedStats.energy,
                maxEnergy: updatedStats.maxEnergy,
            };
        });

        this.logger.log(
            `Granted ${dto.amount} energy to user ${dto.userId}. Reason: ${dto.reason}`,
        );

        return result;
    }

    /**
     * Get energy transaction history
     */
    async getTransactionHistory(
        userId: number,
        limit = 50,
        offset = 0,
    ): Promise<any[]> {
        return this.prisma.currencyTransaction.findMany({
            where: {
                userId,
                currency: CurrencyType.ENERGY,
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
    }

    /**
     * Get energy refill pricing
     */
    getDiamondPricing(): {
        costPerEnergy: number;
        refillRate: number;
    } {
        return {
            costPerEnergy: this.DIAMOND_COST_PER_ENERGY,
            refillRate: this.REFILL_RATE_MINUTES,
        };
    }

    /**
     * Ensure user stats exist, create if not
     */
    private async ensureUserStats(userId: number, tx?: any): Promise<any> {
        const prisma = tx || this.prisma;

        let stats = await prisma.userStats.findUnique({
            where: { userId },
        });

        if (!stats) {
            stats = await prisma.userStats.create({
                data: { userId },
            });
        }

        return stats;
    }
}
