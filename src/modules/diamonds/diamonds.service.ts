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
export class DiamondsService {
    private readonly logger = new Logger(DiamondsService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get user's current diamond balance
     */
    async getBalance(userId: number): Promise<{ diamonds: number }> {
        const stats = await this.prisma.userStats.findUnique({
            where: { userId },
        });
        return { diamonds: stats?.diamonds || 0 };
    }

    /**
     * Grant diamonds to user
     */
    async grantDiamonds(
        userId: number,
        amount: number,
        reason: TransactionReason | string,
        metadata?: any
    ): Promise<number> {
        if (amount <= 0) return 0;

        const result = await this.prisma.$transaction(async (tx) => {
            const stats = await tx.userStats.update({
                where: { userId },
                data: {
                    diamonds: { increment: amount }
                }
            });

            await tx.currencyTransaction.create({
                data: {
                    userId,
                    currency: CurrencyType.DIAMONDS,
                    type: TransactionType.DIAMOND_REWARD, // or PURCHASE depending on context, assuming reward mostly here
                    amount: amount,
                    balanceBefore: stats.diamonds - amount,
                    balanceAfter: stats.diamonds,
                    reason: reason as string,
                    metadata: metadata
                }
            });

            return stats;
        });

        this.logger.log(`Granted ${amount} diamonds to user ${userId}. New balance: ${result.diamonds}`);
        return result.diamonds;
    }

    /**
     * Spend diamonds
     */
    async spendDiamonds(
        userId: number,
        amount: number,
        reason: TransactionReason | string
    ): Promise<number> {
        if (amount <= 0) throw new BadRequestException('Invalid amount');

        const stats = await this.prisma.userStats.findUnique({ where: { userId } });
        if (!stats || stats.diamonds < amount) {
            throw new BadRequestException(`Insufficient diamonds. Required: ${amount}, Available: ${stats?.diamonds || 0}`);
        }

        const result = await this.prisma.$transaction(async (tx) => {
            const updatedStats = await tx.userStats.update({
                where: { userId },
                data: {
                    diamonds: { decrement: amount }
                }
            });

            await tx.currencyTransaction.create({
                data: {
                    userId,
                    currency: CurrencyType.DIAMONDS,
                    type: TransactionType.DIAMOND_SPEND,
                    amount: -amount,
                    balanceBefore: stats.diamonds,
                    balanceAfter: updatedStats.diamonds,
                    reason: reason as string
                }
            });

            return updatedStats;
        });

        this.logger.log(`User ${userId} spent ${amount} diamonds. New balance: ${result.diamonds}`);
        return result.diamonds;
    }
}
