import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * OAuth User Data Transfer Object
 *
 * Represents user data received from OAuth providers
 * (Google, GitHub, Facebook, etc.)
 *
 * @class OAuthUserDto
 */
export class OAuthUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  profilePic?: string;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  providerId?: string;
}
