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

/**
 * Token Service
 *
 * Enterprise-grade JWT token management service implementing:
 * - Access token generation (short-lived, 15 minutes)
 * - Refresh token generation (long-lived, 7 days)
 * - Token verification and validation
 * - Refresh token storage and rotation
 * - Token revocation on logout
 * - Automatic cleanup of expired tokens
 *
 * Security Features:
 * - JWT signed with HS256/RS256 algorithm
 * - Refresh tokens stored in database with hash
 * - Token rotation on refresh (prevents replay attacks)
 * - Automatic expiration handling
 * - Cryptographically secure token generation
 *
 * @class TokenService
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly accessTokenExpiry = '15m';
  private readonly refreshTokenExpiry = '7d';

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generate Access and Refresh Tokens
   *
   * Creates a pair of JWT tokens for authenticated sessions:
   * - Access Token: Short-lived, used for API authorization
   * - Refresh Token: Long-lived, used to obtain new access tokens
   *
   * Token Payload:
   * - sub: User ID
   * - email: User email
   * - role: User role (for RBAC)
   * - iat: Issued at timestamp
   * - exp: Expiration timestamp
   *
   * @param userId - Unique user identifier
   * @param email - User email address
   * @param role - User role (USER, ADMIN, etc.)
   * @returns Object containing access_token and refresh_token
   */
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

  /**
   * Verify Access Token
   *
   * Validates and decodes an access token.
   * Throws UnauthorizedException if token is invalid or expired.
   *
   * @param token - JWT access token
   * @returns Decoded token payload
   * @throws UnauthorizedException
   */
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
      this.logger.warn(`Invalid access token: ${errorMessage}`);
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  /**
   * Verify Refresh Token
   *
   * Validates and decodes a refresh token.
   * Checks both JWT validity and database record.
   *
   * @param token - JWT refresh token
   * @returns Decoded token payload
   * @throws UnauthorizedException
   */
  async verifyRefreshToken(token: string): Promise<{
    sub: number;
    email: string;
    role: string;
  }> {
    try {
      // Verify JWT signature and expiration
      const payload: any = await this.jwtService.verifyAsync(token, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'refresh-secret-key-change-in-production',
      });

      // Hash the token for database lookup
      const tokenHash = this.hashToken(token);

      // Verify token exists in database and is not revoked
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

  /**
   * Store Refresh Token in Database
   *
   * Persists refresh token for validation and revocation.
   * Stores hashed version for security.
   *
   * Business Rules:
   * - Automatically revoke old tokens for same user
   * - Limit to 5 active tokens per user (device limit)
   * - Calculate expiration based on token expiry setting
   *
   * @param userId - User ID
   * @param refreshToken - JWT refresh token
   */
  async storeRefreshToken(userId: number, refreshToken: string): Promise<void> {
    try {
      const tokenHash = this.hashToken(refreshToken);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      // Revoke old tokens if user has more than 5 active sessions
      await this.cleanupOldTokens(userId, 5);

      // Store new refresh token
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

  /**
   * Revoke Refresh Token
   *
   * Marks a refresh token as revoked (logout).
   * Token will no longer be valid for generating new access tokens.
   *
   * @param token - Refresh token to revoke
   */
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
      // Don't throw - logout should succeed even if token not found
    }
  }

  /**
   * Revoke All User Tokens
   *
   * Logs out user from all devices by revoking all refresh tokens.
   * Used for:
   * - Global logout
   * - Security incidents
   * - Password changes
   *
   * @param userId - User ID
   */
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

  /**
   * Cleanup Old Tokens
   *
   * Automatically revokes oldest tokens when user exceeds device limit.
   * Keeps only the most recent N tokens active.
   *
   * @private
   * @param userId - User ID
   * @param maxTokens - Maximum number of active tokens to keep
   */
  private async cleanupOldTokens(
    userId: number,
    maxTokens: number,
  ): Promise<void> {
    try {
      // Count active tokens
      const activeTokens = await this.prisma.refreshToken.findMany({
        where: {
          userId,
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      // If user has too many tokens, revoke oldest ones
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
      // Don't throw - this is a background cleanup operation
    }
  }

  /**
   * Hash Token for Storage
   *
   * Creates a SHA-256 hash of the refresh token for secure storage.
   * Prevents token theft if database is compromised.
   *
   * @private
   * @param token - Plain token string
   * @returns Hashed token
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Cleanup Expired Tokens (Cron Job)
   *
   * Periodically removes expired refresh tokens from database.
   * Should be called by a scheduled job (e.g., daily).
   *
   * @returns Number of tokens deleted
   */
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
