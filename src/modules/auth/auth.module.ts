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


@Module({
  imports: [

    ConfigModule,


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
export class AuthModule
