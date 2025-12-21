import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(private readonly prisma: PrismaService) {}

  async requestPasswordReset(email: string): Promise<{
    message: string;
    resetToken?: string;
  }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, deletedAt: true },
      });

      if (!user || user.deletedAt) {
        this.logger.warn(
          `Password reset requested for non-existent email: ${email}`,
        );
        return {
          message:
            'If an account exists with this email, a password reset link has been sent',
        };
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      const expiresAt = new Date(Date.now() + 3600000);

      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashedToken,
          expiresAt,
        },
      });

      this.logger.log(`Password reset token generated for user: ${user.id}`);

      this.logger.debug(`Reset token for ${email}: ${resetToken}`);

      return {
        message:
          'If an account exists with this email, a password reset link has been sent',
        resetToken,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error requesting password reset: ${errorMessage}`,
        errorStack,
      );

      return {
        message:
          'If an account exists with this email, a password reset link has been sent',
      };
    }
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    try {
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      const resetTokenRecord = await this.prisma.passwordResetToken.findFirst({
        where: {
          tokenHash: hashedToken,
          isUsed: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: { user: true },
      });

      if (!resetTokenRecord || resetTokenRecord.user.deletedAt) {
        this.logger.warn('Invalid or expired reset token used');
        throw new BadRequestException('Invalid or expired reset token');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: resetTokenRecord.userId },
          data: { password: hashedPassword },
        }),
        this.prisma.passwordResetToken.update({
          where: { id: resetTokenRecord.id },
          data: { isUsed: true, usedAt: new Date() },
        }),
      ]);

      this.logger.log(
        `Password reset successful for user: ${resetTokenRecord.userId}`,
      );

      return {
        message: 'Password has been reset successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error resetting password: ${errorMessage}`,
        errorStack,
      );
      throw new BadRequestException('Failed to reset password');
    }
  }

  async validateResetToken(token: string): Promise<{
    valid: boolean;
    email?: string;
  }> {
    try {
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      const resetTokenRecord = await this.prisma.passwordResetToken.findFirst({
        where: {
          tokenHash: hashedToken,
          isUsed: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: { user: true },
      });

      if (!resetTokenRecord || resetTokenRecord.user.deletedAt) {
        return { valid: false };
      }

      return {
        valid: true,
        email: resetTokenRecord.user.email,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error validating reset token: ${errorMessage}`,
        errorStack,
      );
      return { valid: false };
    }
  }

  async cancelPasswordReset(email: string): Promise<{ message: string }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (user) {
        await this.prisma.passwordResetToken.updateMany({
          where: {
            userId: user.id,
            isUsed: false,
            expiresAt: { gt: new Date() },
          },
          data: { isUsed: true },
        });
      }

      this.logger.log(`Password reset cancelled for email: ${email}`);

      return {
        message: 'Password reset request has been cancelled',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error cancelling password reset: ${errorMessage}`,
        errorStack,
      );
      throw new BadRequestException('Failed to cancel password reset');
    }
  }

  async cleanupExpiredResetTokens(): Promise<number> {
    try {
      const result = await this.prisma.passwordResetToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: new Date() } }, { isUsed: true }],
        },
      });

      this.logger.log(
        `Cleaned up ${result.count} expired password reset tokens`,
      );
      return result.count;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to cleanup expired reset tokens: ${errorMessage}`,
        errorStack,
      );
      return 0;
    }
  }
}
