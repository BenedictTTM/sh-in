import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { TokenService } from './token.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    try {
      this.logger.debug('Processing refresh token request');

      const payload = await this.tokenService.verifyRefreshToken(refreshToken);

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          deletedAt: true,
        },
      });

      if (!user) {
        this.logger.warn(`User not found for refresh token: ${payload.sub}`);
        throw new UnauthorizedException('User not found');
      }

      if (user.deletedAt) {
        this.logger.warn(`Deleted user attempted refresh: ${user.id}`);
        throw new UnauthorizedException('Account has been deactivated');
      }

      const newTokens = await this.tokenService.generateTokens(
        user.id,
        user.email,
      );

      await this.tokenService.revokeRefreshToken(refreshToken);

      await this.tokenService.storeRefreshToken(
        user.id,
        newTokens.refresh_token,
      );

      this.logger.log(`Token refreshed successfully for user: ${user.id}`);

      return {
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        expires_in: 3600,
      };
    } catch (error) {
      return this.handleRefreshError(error);
    }
  }

  async validateRefreshToken(token: string): Promise<{
    userId: number;
    email: string;
  } | null> {
    try {
      const payload = await this.tokenService.verifyRefreshToken(token);

      return {
        userId: payload.sub,
        email: payload.email,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.debug(`Invalid refresh token: ${errorMessage}`);
      return null;
    }
  }

  async rotateRefreshToken(oldToken: string): Promise<{
    success: boolean;
    refresh_token: string;
  }> {
    try {
      const payload = await this.tokenService.verifyRefreshToken(oldToken);

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          deletedAt: true,
        },
      });

      if (!user || user.deletedAt) {
        throw new UnauthorizedException('Invalid user');
      }

      const newTokens = await this.tokenService.generateTokens(
        user.id,
        user.email,
      );

      await this.tokenService.revokeRefreshToken(oldToken);

      await this.tokenService.storeRefreshToken(
        user.id,
        newTokens.refresh_token,
      );

      this.logger.log(`Refresh token rotated for user: ${user.id}`);

      return {
        success: true,
        refresh_token: newTokens.refresh_token,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Token rotation failed: ${errorMessage}`, errorStack);
      throw new UnauthorizedException('Failed to rotate token');
    }
  }

  private handleRefreshError(error: unknown): never {
    if (error instanceof UnauthorizedException) {
      throw error;
    }

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code: string }).code
        : undefined;

    this.logger.error(
      `Unexpected error during token refresh: ${errorMessage}`,
      errorStack,
    );

    if (errorCode?.startsWith('P2')) {
      throw new InternalServerErrorException('Database error during refresh');
    }

    throw new InternalServerErrorException('Failed to refresh token');
  }
}
