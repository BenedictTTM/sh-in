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


  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() dto: SignUpDto) {
    return this.signupService.signup(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.loginService.login(dto);
  }


  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.refreshTokenService.refreshAccessToken(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() body: { userId: number; refreshToken?: string }) {
    return this.logoutService.logout(body.userId, body.refreshToken);
  }


  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@Body() body: { userId: number }) {
    return this.logoutService.logoutAllDevices(body.userId);
  }


  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.passwordResetService.requestPasswordReset(dto.email);
  }


  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(dto.token, dto.newPassword);
  }


  @Post('password-reset/validate')
  @HttpCode(HttpStatus.OK)
  async validateResetToken(@Body() body: { token: string }) {
    return this.passwordResetService.validateResetToken(body.token);
  }


  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'auth',
      timestamp: new Date().toISOString(),
    };
  }
}
