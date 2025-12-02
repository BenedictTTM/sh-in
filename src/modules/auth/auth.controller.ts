import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Request,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  SignupService,
  LoginService,
  LogoutService,
  RefreshTokenService,
  PasswordResetService,
} from './services';
import {
  SignUpDto,
  LoginDto,
  RefreshTokenDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
} from './dto';

/**
 * Auth Controller
 *
 * REST API endpoints for authentication operations.
 * All endpoints return JSON responses (no cookies).
 *
 * Endpoints:
 * - POST /auth/signup - Register new user
 * - POST /auth/login - Authenticate user
 * - POST /auth/refresh - Refresh access token
 * - POST /auth/logout - Logout current session
 * - POST /auth/logout-all - Logout from all devices
 * - POST /auth/password-reset/request - Request password reset
 * - POST /auth/password-reset/confirm - Reset password with token
 *
 * @controller auth
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly signupService: SignupService,
    private readonly loginService: LoginService,
    private readonly logoutService: LogoutService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  /**
   * User Registration
   *
   * Creates new user account and returns tokens immediately.
   * No email verification required in v1.
   *
   * @param dto - Signup data (email, password, firstName, lastName)
   * @returns User object with access_token and refresh_token
   */
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() dto: SignUpDto) {
    return this.signupService.signup(dto);
  }

  /**
   * User Login
   *
   * Authenticates user and returns JWT tokens.
   *
   * @param dto - Login credentials (email, password)
   * @returns User object with access_token and refresh_token
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.loginService.login(dto);
  }

  /**
   * Refresh Access Token
   *
   * Exchanges refresh token for new token pair.
   * Implements token rotation for security.
   *
   * @param dto - Refresh token
   * @returns New access_token and refresh_token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.refreshTokenService.refreshAccessToken(dto.refreshToken);
  }

  /**
   * Logout
   *
   * Revokes refresh token for current session.
   * Client should delete access token immediately.
   *
   * Note: Requires authentication guard in production
   *
   * @param body - Contains userId and optional refreshToken
   * @returns Success message
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() body: { userId: number; refreshToken?: string }) {
    return this.logoutService.logout(body.userId, body.refreshToken);
  }

  /**
   * Logout from All Devices
   *
   * Revokes all refresh tokens for user.
   * Forces re-authentication on all devices.
   *
   * Note: Requires authentication guard in production
   *
   * @param body - Contains userId
   * @returns Success message with count of revoked tokens
   */
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@Body() body: { userId: number }) {
    return this.logoutService.logoutAllDevices(body.userId);
  }

  /**
   * Request Password Reset
   *
   * Generates reset token and sends email (if configured).
   * Always returns success to prevent user enumeration.
   *
   * @param dto - User email
   * @returns Generic success message
   */
  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.passwordResetService.requestPasswordReset(dto.email);
  }

  /**
   * Reset Password
   *
   * Validates token and updates password.
   * Token is one-time use and expires after 1 hour.
   *
   * @param dto - Reset token and new password
   * @returns Success message
   */
  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(dto.token, dto.newPassword);
  }

  /**
   * Validate Reset Token
   *
   * Checks if reset token is valid.
   * Useful for frontend validation before showing password form.
   *
   * @param body - Reset token
   * @returns Validity status
   */
  @Post('password-reset/validate')
  @HttpCode(HttpStatus.OK)
  async validateResetToken(@Body() body: { token: string }) {
    return this.passwordResetService.validateResetToken(body.token);
  }

  /**
   * Health Check / Test Endpoint
   *
   * Simple endpoint to verify auth module is loaded.
   * Can be removed in production.
   */
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'auth',
      timestamp: new Date().toISOString(),
    };
  }
}
