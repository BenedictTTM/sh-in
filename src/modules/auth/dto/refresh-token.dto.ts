import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Refresh Token Data Transfer Object
 *
 * Used to validate refresh token requests
 *
 * @class RefreshTokenDto
 */
export class RefreshTokenDto {
  @IsString({ message: 'Refresh token must be a string' })
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}
