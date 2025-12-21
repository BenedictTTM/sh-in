import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './strategies/google.strategy';
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


@Module({
  imports: [

    ConfigModule,
    PassportModule,


    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({

        secret:
          configService.get<string>('JWT_ACCESS_SECRET') ||
          'default-secret-change-in-production',
        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [

    AuthService,
    GoogleStrategy,


    PrismaService,


    TokenService,
    SignupService,
    LoginService,
    LogoutService,
    RefreshTokenService,
    PasswordResetService,
    OAuthService,
  ],
  exports: [

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
export class AuthModule { }
