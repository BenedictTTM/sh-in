import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TokenService } from './token.service';
import { LoginDto } from '../dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class LoginService {
  private readonly logger = new Logger(LoginService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  )

  async login(dto: LoginDto): Promise<{
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
      this.logger.log(`Login attempt for email: ${dto.email}`);

      if (!dto.email || !dto.password) {
        throw new BadRequestException('Email and password are required');
      }

      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          password: true,
          isActive: true,
          isEmailVerified: true,
          deletedAt: true,
        },
      });

      if (!user) {
        this.logger.warn(
          `Login failed: User not found for email: ${dto.email}`,
        );
        await bcrypt.hash('dummy-password', 12);
        throw new UnauthorizedException('Invalid email or password');
      }

      if (user.deletedAt) {
        this.logger.warn(`Login failed: Account deleted for user: ${user.id}`);
        throw new UnauthorizedException('This account has been deactivated');
      }

      const passwordValid = await bcrypt.compare(dto.password, user.password);

      if (!passwordValid) {
        this.logger.warn(`Login failed: Invalid password for user: ${user.id}`);
        throw new UnauthorizedException('Invalid email or password');
      }

      const tokens = await this.tokenService.generateTokens(
        user.id,
        user.email,
      );

      await this.tokenService.storeRefreshToken(user.id, tokens.refresh_token);

      this.logger.log(`Tokens generated for user: ${user.id}`);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const {
        password: _password,
        deletedAt: _deletedAt,
        ...userWithoutPassword
      } = user;

      return {
        user: userWithoutPassword,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: 900,
      };
    } catch (error) {
      return this.handleLoginError(error, dto.email);
    }
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<{
    id: number;
    email: string;
  } | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          deletedAt: true,
        },
      });

      if (!user || user.deletedAt) {
        return null;
      }

      const passwordValid = await bcrypt.compare(password, user.password);

      if (!passwordValid) {
        return null;
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _pwd, deletedAt: _del, ...result } = user;
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error validating user: ${errorMessage}`, errorStack);
      return null;
    }
  }

  private handleLoginError(error: unknown, email: string): never {
    if (error instanceof UnauthorizedException) {
      throw error;
    }

    if (error instanceof BadRequestException) {
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
      `Unexpected error during login for ${email}: ${errorMessage}`,
      errorStack,
    );

    if (errorCode === 'P2025') {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND') {
      this.logger.error('Database connection failed', errorStack);
      throw new InternalServerErrorException('Service temporarily unavailable');
    }

    throw new InternalServerErrorException('An error occurred during login');
  }
}
