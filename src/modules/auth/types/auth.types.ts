






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


export interface RefreshTokenPayload extends JwtPayload {
  /** Token family ID for rotation tracking */
  family?: string;

  /** Device identifier */
  deviceId?: string;

  /** Token version for invalidation */
  version?: number;
}






export interface UserResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
}


export interface AuthResponse {
  user: UserResponse;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}


export interface TokenRefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}


export interface LogoutResponse {
  message: string;
  success: boolean;
}


export interface LogoutAllResponse {
  message: string;
  revokedCount: number;
  success: boolean;
}






export interface DeviceInfo {
  deviceId?: string;
  deviceName?: string;
  deviceType?: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  userAgent?: string;
  ipAddress?: string;
}


export interface TokenGenerationOptions {
  userId: number;
  email: string;
  deviceInfo?: DeviceInfo;
  tokenFamily?: string;
}


export interface TokenVerificationResult {
  valid: boolean;
  payload?: JwtPayload | RefreshTokenPayload;
  error?: string;
}






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






export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessExpiration: string | number;
  refreshExpiration: string | number;
}


export interface PasswordResetConfig {
  tokenExpiration: string | number;
  resetUrl: string;
}


export interface SecurityConfig {
  bcryptRounds: number;
  maxLoginAttempts: number;
  accountLockDuration: number;
}






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






export type SafeUser = Omit<UserEntity, 'password'>;


export type UserUpdate = Partial<
  Pick<UserEntity, 'firstName' | 'lastName' | 'isActive' | 'isEmailVerified'>
>;


export interface LoginResult extends AuthResponse {
  sessionId?: string;
  loginTimestamp: Date;
}






export const TOKEN_EXPIRATION = {
  ACCESS: 15 * 60,
  REFRESH: 7 * 24 * 60 * 60,
  PASSWORD_RESET: 60 * 60,
} as const;


export const SECURITY_DEFAULTS = {
  BCRYPT_ROUNDS: 12,
  MAX_LOGIN_ATTEMPTS: 5,
  ACCOUNT_LOCK_DURATION: 30,
} as const;


export const DEVICE_TYPES = {
  MOBILE: 'mobile',
  DESKTOP: 'desktop',
  TABLET: 'tablet',
  UNKNOWN: 'unknown',
} as const;

export type DeviceType = (typeof DEVICE_TYPES)[keyof typeof DEVICE_TYPES];
