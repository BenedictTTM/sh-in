import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SignUpDto } from '../dto/signUp.dto';
import { TokenService } from './token.service';
import * as bcrypt from 'bcrypt';


@Injectable()
export class SignupService {
  private readonly logger = new Logger(SignupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  )


  async signup(dto: SignUpDto): Promise<{
    user: {
      id: number;
      email: string;
      firstName: string;
      lastName: string;
      isActive: boolean;
      isEmailVerified: boolean;
      createdAt: Date;
    };
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    try {
      this.logger.log(`Attempting to create user with email: ${dto.email}`);


      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        this.logger.warn(
          `User registration failed: Email ${dto.email} already exists`,
        );
        throw new ConflictException('User with this email already exists');
      }


      const saltRounds = 12;
      const password = await bcrypt.hash(dto.password, saltRounds);


      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password,
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          isEmailVerified: true,
          createdAt: true,
        },
      });

      this.logger.log(`User created successfully with ID: ${user.id}`);


      const tokens = await this.tokenService.generateTokens(
        user.id,
        user.email,
      );


      await this.tokenService.storeRefreshToken(user.id, tokens.refresh_token);

      this.logger.log(`Tokens generated for new user: ${user.id}`);

      return {
        user,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: 900,
      };
    } catch (error) {
      return this.handleSignupError(error);
    }
  }


  private handleSignupError(error: unknown): never {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code: string }).code
        : undefined;
    const errorMeta =
      typeof error === 'object' && error !== null && 'meta' in error
        ? (error as { meta?: { target?: string[] } }).meta
        : undefined;

    this.logger.error(`Error during user signup: ${errorMessage}`, errorStack);


    if (errorCode === 'P2002') {
      const field = errorMeta?.target?.[0] ?? 'field';
      throw new ConflictException(`${field} already exists`);
    }

    if (errorCode === 'P2000') {
      throw new ConflictException('Input data is too long');
    }

    if (errorCode === 'P2001') {
      throw new ConflictException('Required data not found');
    }


    if (error instanceof ConflictException) {
      throw error;
    }


    if (errorMessage.includes('bcrypt')) {
      this.logger.error('Password hashing failed', errorStack);
      throw new InternalServerErrorException('Failed to process password');
    }


    if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND') {
      this.logger.error('Database connection failed', errorStack);
      throw new InternalServerErrorException(
        'Database temporarily unavailable',
      );
    }


    this.logger.error('Unexpected error during signup', errorStack);
    throw new InternalServerErrorException(
      'An unexpected error occurred during registration',
    );
  }
}
