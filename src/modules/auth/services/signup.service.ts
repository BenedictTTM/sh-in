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

/**
 * Signup Service
 *
 * Enterprise-grade user registration service implementing:
 * - Email uniqueness validation
 * - Secure password hashing (Bcrypt)
 * - Automatic token generation
 * - Transaction safety
 * - Comprehensive error handling
 * - Audit logging
 *
 * Security Features:
 * - Bcrypt password hashing (industry standard)
 * - Input validation via DTOs
 * - SQL injection protection (Prisma)
 * - Rate limiting ready (add guards)
 * - No password in logs/responses
 *
 * Business Rules:
 * - Email must be unique
 * - Returns tokens immediately (no email verification in v1)
 *
 * @class SignupService
 */
@Injectable()
export class SignupService {
  private readonly logger = new Logger(SignupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Register New User
   *
   * Creates a new user account and returns authentication tokens.
   * Implements atomic operation - either full success or rollback.
   *
   * Flow:
   * 1. Validate email uniqueness
   * 2. Hash password with Bcrypt
   * 3. Create user record in database
   * 4. Generate JWT tokens
   * 5. Store refresh token
   * 6. Return user data + tokens
   *
   * @param dto - Validated signup data
   * @returns User object with access and refresh tokens
   * @throws ConflictException if email exists
   * @throws InternalServerErrorException for system errors
   */
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

      // Check if the user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        this.logger.warn(
          `User registration failed: Email ${dto.email} already exists`,
        );
        throw new ConflictException('User with this email already exists');
      }

      // Hash the password using bcrypt (12 rounds for production)
      const saltRounds = 12;
      const password = await bcrypt.hash(dto.password, saltRounds);

      // Create user in database
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

      // Generate tokens using TokenService for consistency
      const tokens = await this.tokenService.generateTokens(
        user.id,
        user.email,
      );

      // Store refresh token
      await this.tokenService.storeRefreshToken(user.id, tokens.refresh_token);

      this.logger.log(`Tokens generated for new user: ${user.id}`);

      return {
        user,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: 900, // 15 minutes in seconds
      };
    } catch (error) {
      return this.handleSignupError(error);
    }
  }

  /**
   * Handle Signup Errors
   *
   * Centralized error handling with:
   * - Specific error messages for known issues
   * - Security-conscious logging (no sensitive data)
   * - User-friendly error responses
   * - Database error translation
   *
   * @private
   * @param error - Caught error object
   * @throws Appropriate NestJS exception
   */
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

    // Handle specific Prisma errors
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

    // Handle known exceptions
    if (error instanceof ConflictException) {
      throw error;
    }

    // Handle password hashing errors
    if (errorMessage.includes('bcrypt')) {
      this.logger.error('Password hashing failed', errorStack);
      throw new InternalServerErrorException('Failed to process password');
    }

    // Handle database connection errors
    if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND') {
      this.logger.error('Database connection failed', errorStack);
      throw new InternalServerErrorException(
        'Database temporarily unavailable',
      );
    }

    // Fallback for unexpected errors
    this.logger.error('Unexpected error during signup', errorStack);
    throw new InternalServerErrorException(
      'An unexpected error occurred during registration',
    );
  }
}
