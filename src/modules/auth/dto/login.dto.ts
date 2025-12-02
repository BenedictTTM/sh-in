import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * Login Data Transfer Object
 *
 * Validates user login credentials.
 * Deliberately minimal validation to avoid leaking
 * information about valid/invalid accounts.
 *
 * @class LoginDto
 */
export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
