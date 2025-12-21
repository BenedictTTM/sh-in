import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
    @ApiPropertyOptional({ example: 'John' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    firstName?: string;

    @ApiPropertyOptional({ example: 'Doe' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    lastName?: string;

    @ApiPropertyOptional({ example: 'Harvard University' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    school?: string;

    @ApiPropertyOptional({ example: 'https://example.com/profile.jpg' })
    @IsOptional()
    @IsString()
    profilePicture?: string;
}
