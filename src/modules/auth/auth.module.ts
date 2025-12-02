import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TokenService,
  SignupService,
  LoginService,
  LogoutService,
  RefreshTokenService,
  PasswordResetService,
  OAuthService,
} from './services';

/**
 * Auth Module
 *
 * Enterprise-grade authentication module providing:
 * - User registration (signup)
 * - User login
 * - JWT token management (access + refresh)
 * - Token refresh
 * - Logout (single + all devices)
 * - Password reset
 * - OAuth integration (Google, GitHub, etc.)
 *
 * Dependencies:
 * - JwtModule: JWT token generation and verification
 * - ConfigModule: Environment-based configuration
 * - PrismaService: Database access
 *
 * Services:
 * - TokenService: JWT token generation, verification, storage
 * - SignupService: User registration
 * - LoginService: User authentication
 * - LogoutService: Session termination
 * - RefreshTokenService: Token refresh and rotation
 * - PasswordResetService: Password recovery
 * - OAuthService: Third-party authentication
 *
 * @module AuthModule
 */
@Module({
  imports: [
    // Global configuration access
    ConfigModule,

    // JWT module with async configuration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // Default secret (overridden in TokenService for different token types)
        secret:
          configService.get<string>('JWT_ACCESS_SECRET') ||
          'default-secret-change-in-production',
        signOptions: {
          expiresIn: '15m', // Default access token expiry
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    // Legacy auth service (can be removed after migration)
    AuthService,

    // Database access
    PrismaService,

    // Core authentication services
    TokenService,
    SignupService,
    LoginService,
    LogoutService,
    RefreshTokenService,
    PasswordResetService,
    OAuthService,
  ],
  exports: [
    // Export services for use in other modules
    AuthService,
    TokenService,
    SignupService,
    LoginService,
    LogoutService,
    RefreshTokenService,
    PasswordResetService,
    OAuthService,
    JwtModule,
  ],
})
export class AuthModule {}
