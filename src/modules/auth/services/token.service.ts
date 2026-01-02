import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import * as crypto from 'crypto';


@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly accessTokenExpiry = '2h';
  private readonly refreshTokenExpiry = '30d';

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) { }


  async generateTokens(
    userId: number,
    email: string,
    role: string = 'USER',
  ): Promise<{ access_token: string; refresh_token: string }> {
    try {
      const payload = {
        sub: userId,
        email,
        role,
      };

      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(payload, {
          secret:
            this.configService.get<string>('JWT_ACCESS_SECRET') ||
            'access-secret-key-change-in-production',
          expiresIn: this.accessTokenExpiry,
        }),
        this.jwtService.signAsync(payload, {
          secret:
            this.configService.get<string>('JWT_REFRESH_SECRET') ||
            'refresh-secret-key-change-in-production',
          expiresIn: this.refreshTokenExpiry,
        }),
      ]);

      this.logger.debug(`Generated tokens for user: ${userId}`);
      // DEBUG: Verify token expiration
      const decoded = this.jwtService.decode(accessToken);
      console.log('[TokenService] Generated Access Token Debug:', JSON.stringify(decoded));


      return {
        access_token: accessToken,
        refresh_token: refreshToken,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to generate tokens: ${errorMessage}`,
        errorStack,
      );
      throw new InternalServerErrorException(
        'Failed to generate authentication tokens',
      );
    }
  }


  async verifyAccessToken(token: string): Promise<{
    sub: number;
    email: string;
    role: string;
  }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const payload: any = await this.jwtService.verifyAsync(token, {
        secret:
          this.configService.get<string>('JWT_ACCESS_SECRET') ||
          'access-secret-key-change-in-production',
      });

      return payload as { sub: number; email: string; role: string };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      // DEBUG: Log the stack to find the caller
      this.logger.warn(`Invalid access token: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      console.log('Stack trace for invalid token:', new Error().stack);
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }


  async verifyRefreshToken(token: string): Promise<{
    sub: number;
    email: string;
    role: string;
  }> {
    try {

      const payload: any = await this.jwtService.verifyAsync(token, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'refresh-secret-key-change-in-production',
      });


      const tokenHash = this.hashToken(token);


      const storedToken = await this.prisma.refreshToken.findFirst({
        where: {
          tokenHash,
          userId: payload.sub as number,
          isRevoked: false,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Refresh token not found or revoked');
      }

      return payload as { sub: number; email: string; role: string };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Invalid refresh token: ${errorMessage}`);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }


  async storeRefreshToken(userId: number, refreshToken: string): Promise<void> {
    try {
      const tokenHash = this.hashToken(refreshToken);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);


      await this.cleanupOldTokens(userId, 5);


      await this.prisma.refreshToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt,
          isRevoked: false,
        },
      });

      this.logger.debug(`Stored refresh token for user: ${userId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to store refresh token: ${errorMessage}`,
        errorStack,
      );
      throw new InternalServerErrorException('Failed to store refresh token');
    }
  }


  async revokeRefreshToken(token: string): Promise<void> {
    try {
      const tokenHash = this.hashToken(token);

      await this.prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { isRevoked: true },
      });

      this.logger.debug(`Revoked refresh token`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to revoke refresh token: ${errorMessage}`,
        errorStack,
      );

    }
  }


  async revokeAllUserTokens(userId: number): Promise<number> {
    try {
      const result = await this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });

      this.logger.log(`Revoked ${result.count} tokens for user: ${userId}`);
      return result.count;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to revoke all tokens: ${errorMessage}`,
        errorStack,
      );
      throw new InternalServerErrorException('Failed to revoke tokens');
    }
  }


  private async cleanupOldTokens(
    userId: number,
    maxTokens: number,
  ): Promise<void> {
    try {

      const activeTokens = await this.prisma.refreshToken.findMany({
        where: {
          userId,
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });


      if (activeTokens.length >= maxTokens) {
        const tokensToRevoke = activeTokens.slice(maxTokens - 1);
        const idsToRevoke = tokensToRevoke.map((t) => t.id);

        await this.prisma.refreshToken.updateMany({
          where: { id: { in: idsToRevoke } },
          data: { isRevoked: true },
        });

        this.logger.debug(
          `Revoked ${tokensToRevoke.length} old tokens for user: ${userId}`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to cleanup old tokens: ${errorMessage}`,
        errorStack,
      );

    }
  }


  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }


  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await this.prisma.refreshToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: new Date() } }, { isRevoked: true }],
        },
      });

      this.logger.log(`Cleaned up ${result.count} expired tokens`);
      return result.count;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to cleanup expired tokens: ${errorMessage}`,
        errorStack,
      );
      return 0;
    }
  }
}
