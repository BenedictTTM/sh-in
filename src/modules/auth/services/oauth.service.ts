import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { TokenService } from './token.service';
import { OAuthUserDto } from '../dto/oauth-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  async authenticateOAuthUser(oauthUser: OAuthUserDto): Promise<{
    user: {
      id: number;
      email: string;
      firstName: string;
      lastName: string;
      isActive: boolean;
      isEmailVerified: boolean;
    };
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    try {
      this.logger.debug(`🔍 Processing OAuth login for: ${oauthUser.email}`);

      let user = await this.prisma.user.findUnique({
        where: { email: oauthUser.email },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          isEmailVerified: true,
          deletedAt: true,
        },
      });

      if (user) {
        if (user.deletedAt) {
          throw new ConflictException('This account has been deactivated');
        }

        this.logger.log(`✅ Existing user found: ${user.email}`);
      } else {
        this.logger.log(`🆕 Creating new user from OAuth: ${oauthUser.email}`);

        const randomPassword = Math.random().toString(36);
        const hashedPassword = await bcrypt.hash(randomPassword, 12);

        user = await this.prisma.user.create({
          data: {
            email: oauthUser.email,
            password: hashedPassword,
            firstName: oauthUser.firstName || 'OAuth',
            lastName: oauthUser.lastName || 'User',
            googleId:
              oauthUser.provider === 'google' ? oauthUser.providerId : null,
            githubId:
              oauthUser.provider === 'github' ? oauthUser.providerId : null,
            isEmailVerified: true,
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            isEmailVerified: true,
            deletedAt: true,
          },
        });
      }

      const tokens = await this.tokenService.generateTokens(
        user.id,
        user.email,
      );

      await this.tokenService.storeRefreshToken(user.id, tokens.refresh_token);

      this.logger.log(`OAuth authentication successful for user: ${user.id}`);

      return {
        user,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: 900,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error during OAuth authentication: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }
}
