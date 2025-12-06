import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    PurchaseDiamondsDto,
    SpendDiamondsDto,
    GrantDiamondsDto,
    RefundDiamondsDto,
} from './dto/diamonds.dto';
import {
    CurrencyType,
    TransactionType,
    TransactionReason,
} from '../../common/enums/currency.enum';

@Injectable()
export class DiamondsService {
    private readonly logger = new Logger(DiamondsService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get user's current diamond balance
     */
    async getBalance(userId: number): Promise<{ diamonds: number }> {
        const stats = await this.ensureUserStats(userId);
        return { diamonds: stats.diamonds };
    }

    /**
     * Purchase diamonds (IAP)
     * This should be called after payment verification
     */
    async purchaseDiamonds(
        userId: number,
        dto: PurchaseDiamondsDto,
    ): Promise<{
        diamonds: number;
        transactionId: number;
    }> {
        // Check for duplicate purchase using idempotency key
        if (dto.idempotencyKey) {
            const existing = await this.prisma.currencyTransaction.findUnique({
                where: { idempotencyKey: dto.idempotencyKey },
            });

            if (existing) {
                this.logger.warn(
                    `Duplicate purchase attempt detected: ${dto.idempotencyKey}`,
                );
                throw new ConflictException('Transaction already processed');
            }
        }

        // Use transaction to ensure atomicity
        const result = await this.prisma.$transaction(async (tx) => {
            // Get current stats
            const stats = await tx.userStats.findUnique({
                where: { userId },
            });

            if (!stats) {
                throw new NotFoundException('User stats not found');
            }

            const balanceBefore = stats.diamonds;
            const balanceAfter = balanceBefore + dto.amount;

            // Update diamonds
            const updatedStats = await tx.userStats.update({
                where: { userId },
                data: { diamonds: balanceAfter },
            });

            // Create transaction record
            const transaction = await tx.currencyTransaction.create({
                data: {
                    userId,
                    type: TransactionType.DIAMOND_PURCHASE,
                    currency: CurrencyType.DIAMONDS,
                    amount: dto.amount,
                    balanceBefore,
                    balanceAfter,
                    reason: TransactionReason.IAP_PURCHASE,
                    metadata: {
                        receiptId: dto.receiptId,
                        provider: dto.provider,
                    },
                    idempotencyKey: dto.idempotencyKey,
                },
            });

            return {
                diamonds: updatedStats.diamonds,
                transactionId: transaction.id,
            };
        });

        this.logger.log(
            `User ${userId} purchased ${dto.amount} diamonds. New balance: ${result.diamonds}`,
        );

        return result;
    }

    /**
     * Spend diamonds on in-app purchases
     */
    async spendDiamonds(
        userId: number,
        dto: SpendDiamondsDto,
    ): Promise<{
        diamonds: number;
        transactionId: number;
    }> {
        // Check for duplicate spend using idempotency key
        if (dto.idempotencyKey) {
            const existing = await this.prisma.currencyTransaction.findUnique({
                where: { idempotencyKey: dto.idempotencyKey },
            });

            if (existing) {
                this.logger.warn(
                    `Duplicate spend attempt detected: ${dto.idempotencyKey}`,
                );
                throw new ConflictException('Transaction already processed');
            }
        }

        const result = await this.prisma.$transaction(async (tx) => {
            const stats = await tx.userStats.findUnique({
                where: { userId },
            });

            if (!stats) {
                throw new NotFoundException('User stats not found');
            }

            // Check sufficient balance
            if (stats.diamonds < dto.amount) {
                throw new BadRequestException(
                    `Insufficient diamonds. Required: ${dto.amount}, Available: ${stats.diamonds}`,
                );
            }

            const balanceBefore = stats.diamonds;
            const balanceAfter = balanceBefore - dto.amount;

            // Deduct diamonds
            const updatedStats = await tx.userStats.update({
                where: { userId },
                data: { diamonds: balanceAfter },
            });

            // Create transaction record
            const transaction = await tx.currencyTransaction.create({
                data: {
                    userId,
                    type: TransactionType.DIAMOND_SPEND,
                    currency: CurrencyType.DIAMONDS,
                    amount: -dto.amount, // negative for debit
                    balanceBefore,
                    balanceAfter,
                    reason: dto.reason,
                    metadata: dto.metadata,
                    idempotencyKey: dto.idempotencyKey,
                },
            });

            return {
                diamonds: updatedStats.diamonds,
                transactionId: transaction.id,
            };
        });

        this.logger.log(
            `User ${userId} spent ${dto.amount} diamonds for ${dto.reason}. New balance: ${result.diamonds}`,
        );

        return result;
    }

    /**
     * Grant diamonds to user (admin function or rewards)
     */
    async grantDiamonds(
        dto: GrantDiamondsDto,
    ): Promise<{
        diamonds: number;
        transactionId: number;
    }> {
        const result = await this.prisma.$transaction(async (tx) => {
            const stats = await this.ensureUserStats(dto.userId, tx);

            const balanceBefore = stats.diamonds;
            const balanceAfter = balanceBefore + dto.amount;

            const updatedStats = await tx.userStats.update({
                where: { userId: dto.userId },
                data: { diamonds: balanceAfter },
            });

            const transaction = await tx.currencyTransaction.create({
                data: {
                    userId: dto.userId,
                    type: TransactionType.DIAMOND_REWARD,
                    currency: CurrencyType.DIAMONDS,
                    amount: dto.amount,
                    balanceBefore,
                    balanceAfter,
                    reason: dto.reason,
                },
            });

            return {
                diamonds: updatedStats.diamonds,
                transactionId: transaction.id,
            };
        });

        this.logger.log(
            `Granted ${dto.amount} diamonds to user ${dto.userId}. Reason: ${dto.reason}`,
        );

        return result;
    }

    /**
     * Refund diamonds to user
     */
    async refundDiamonds(
        userId: number,
        dto: RefundDiamondsDto,
    ): Promise<{
        diamonds: number;
        transactionId: number;
    }> {
        const result = await this.prisma.$transaction(async (tx) => {
            const stats = await this.ensureUserStats(userId, tx);

            const balanceBefore = stats.diamonds;
            const balanceAfter = balanceBefore + dto.amount;

            const updatedStats = await tx.userStats.update({
                where: { userId },
                data: { diamonds: balanceAfter },
            });

            const transaction = await tx.currencyTransaction.create({
                data: {
                    userId,
                    type: TransactionType.DIAMOND_REFUND,
                    currency: CurrencyType.DIAMONDS,
                    amount: dto.amount,
                    balanceBefore,
                    balanceAfter,
                    reason: dto.reason,
                    metadata: dto.originalTransactionId
                        ? { originalTransactionId: dto.originalTransactionId }
                        : undefined,
                },
            });

            return {
                diamonds: updatedStats.diamonds,
                transactionId: transaction.id,
            };
        });

        this.logger.log(
            `Refunded ${dto.amount} diamonds to user ${userId}. Reason: ${dto.reason}`,
        );

        return result;
    }

    /**
     * Get transaction history for a user
     */
    async getTransactionHistory(
        userId: number,
        limit = 50,
        offset = 0,
    ): Promise<any[]> {
        return this.prisma.currencyTransaction.findMany({
            where: {
                userId,
                currency: CurrencyType.DIAMONDS,
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
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
