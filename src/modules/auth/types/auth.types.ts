/**
 * Type Definitions for Authentication System
 *
 * Provides strict type safety across all auth services.
 * Follow these types to ensure consistency and prevent runtime errors.
 */

// ============================================================================
// JWT PAYLOAD TYPES
// ============================================================================

/**
 * JWT Access Token Payload
 *
 * Contains user identification and session metadata.
 * Kept minimal to reduce token size.
 */
export interface JwtPayload {
  /** User ID (maps to User.id) */
  sub: number;

  /** User email */
  email: string;

  /** Token issued at (Unix timestamp) */
  iat?: number;

  /** Token expires at (Unix timestamp) */
  exp?: number;
}

/**
 * JWT Refresh Token Payload
 *
 * Extended payload for refresh tokens with device tracking.
 */
export interface RefreshTokenPayload extends JwtPayload {
  /** Token family ID for rotation tracking */
  family?: string;

  /** Device identifier */
  deviceId?: string;

  /** Token version for invalidation */
  version?: number;
}

// ============================================================================
// AUTHENTICATION RESPONSE TYPES
// ============================================================================

/**
 * User Data (Safe for client exposure)
 *
 * NEVER include password or sensitive data.
 */
export interface UserResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
}

/**
 * Authentication Response
 *
 * Returned after successful signup/login.
 * Contains tokens for immediate use (no cookies).
 */
export interface AuthResponse {
  user: UserResponse;
  access_token: string;
  refresh_token: string;
  expires_in: number; // Access token TTL in seconds
}

/**
 * Token Refresh Response
 *
 * Returned after successful token refresh.
 * Implements token rotation (new refresh token).
 */
export interface TokenRefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/**
 * Logout Response
 */
export interface LogoutResponse {
  message: string;
  success: boolean;
}

/**
 * Logout All Devices Response
 */
export interface LogoutAllResponse {
  message: string;
  revokedCount: number;
  success: boolean;
}

// ============================================================================
// SERVICE METHOD PARAMETERS
// ============================================================================

/**
 * Device Information for Tracking
 *
 * Captured during login/signup for security monitoring.
 */
export interface DeviceInfo {
  deviceId?: string;
  deviceName?: string;
  deviceType?: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Token Generation Options
 */
export interface TokenGenerationOptions {
  userId: number;
  email: string;
  deviceInfo?: DeviceInfo;
  tokenFamily?: string;
}

/**
 * Token Verification Result
 */
export interface TokenVerificationResult {
  valid: boolean;
  payload?: JwtPayload | RefreshTokenPayload;
  error?: string;
}

// ============================================================================
// DATABASE ENTITY TYPES (matches Prisma schema)
// ============================================================================

/**
 * User Entity (from database)
 */
export interface UserEntity {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  googleId: string | null;
  githubId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Refresh Token Entity (from database)
 */
export interface RefreshTokenEntity {
  id: number;
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  isRevoked: boolean;
  revokedAt: Date | null;
  deviceId: string | null;
  deviceName: string | null;
  deviceType: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  tokenFamily: string | null;
  createdAt: Date;
  lastUsedAt: Date;
}

/**
 * Password Reset Token Entity (from database)
 */
export interface PasswordResetTokenEntity {
  id: number;
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  isUsed: boolean;
  usedAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

// ============================================================================
// SERVICE CONFIGURATION TYPES
// ============================================================================

/**
 * JWT Configuration
 */
export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessExpiration: string | number;
  refreshExpiration: string | number;
}

/**
 * Password Reset Configuration
 */
export interface PasswordResetConfig {
  tokenExpiration: string | number;
  resetUrl: string;
}

/**
 * Security Configuration
 */
export interface SecurityConfig {
  bcryptRounds: number;
  maxLoginAttempts: number;
  accountLockDuration: number; // in minutes
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Authentication Error Types
 */
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  REVOKED_TOKEN = 'REVOKED_TOKEN',
  TOKEN_NOT_FOUND = 'TOKEN_NOT_FOUND',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  PASSWORD_RESET_FAILED = 'PASSWORD_RESET_FAILED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Authentication Error
 */
export class AuthError extends Error {
  constructor(
    public readonly type: AuthErrorType,
    public readonly message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Omit password from user type
 */
export type SafeUser = Omit<UserEntity, 'password'>;

/**
 * Partial user update
 */
export type UserUpdate = Partial<
  Pick<UserEntity, 'firstName' | 'lastName' | 'isActive' | 'isEmailVerified'>
>;

/**
 * Login result with user and device tracking
 */
export interface LoginResult extends AuthResponse {
  sessionId?: string;
  loginTimestamp: Date;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default token expiration times (in seconds)
 */
export const TOKEN_EXPIRATION = {
  ACCESS: 15 * 60, // 15 minutes
  REFRESH: 7 * 24 * 60 * 60, // 7 days
  PASSWORD_RESET: 60 * 60, // 1 hour
} as const;

/**
 * Default security settings
 */
export const SECURITY_DEFAULTS = {
  BCRYPT_ROUNDS: 12,
  MAX_LOGIN_ATTEMPTS: 5,
  ACCOUNT_LOCK_DURATION: 30, // minutes
} as const;

/**
 * Device types
 */
export const DEVICE_TYPES = {
  MOBILE: 'mobile',
  DESKTOP: 'desktop',
  TABLET: 'tablet',
  UNKNOWN: 'unknown',
} as const;

export type DeviceType = (typeof DEVICE_TYPES)[keyof typeof DEVICE_TYPES];
