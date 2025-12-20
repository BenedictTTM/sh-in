import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { TokenService } from './token.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class LogoutService {
  private readonly logger = new Logger(LogoutService.name);

  constructor(
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
  )

  async logout(
    userId: number,
    refreshToken?: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      this.logger.log(`Logout request for user: ${userId}`);

      if (refreshToken) {
        await this.tokenService.revokeRefreshToken(refreshToken);
        this.logger.log(`Refresh token revoked for user: ${userId}`);
      } else {
        await this.tokenService.revokeAllUserTokens(userId);
        this.logger.log(`All tokens revoked for user: ${userId}`);
      }

      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error during logout for user ${userId}: ${errorMessage}`,
        errorStack,
      );

      return {
        success: true,
        message: 'Logged out successfully',
      };
    }
  }

  async logoutAllDevices(userId: number): Promise<{
    success: boolean;
    message: string;
    revokedCount: number;
  }> {
    try {
      this.logger.log(`Logout all devices request for user: ${userId}`);

      const revokedCount = await this.tokenService.revokeAllUserTokens(userId);

      this.logger.log(
        `All tokens revoked for user: ${userId}, count: ${revokedCount}`,
      );

      return {
        success: true,
        message: 'Logged out from all devices successfully',
        revokedCount,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error during logout all devices for user ${userId}: ${errorMessage}`,
        errorStack,
      );

      throw new InternalServerErrorException(
        'Failed to logout from all devices',
      );
    }
  }
}
