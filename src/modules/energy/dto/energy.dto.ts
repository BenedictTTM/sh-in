import { IsInt, IsPositive, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';


export class ConsumeEnergyDto {
    @ApiProperty({
        description: 'Amount of energy to consume',
        example: 1,
        minimum: 1,
        default: 1,
    })
    @IsInt()
    @IsPositive()
    amount: number = 1;

    @ApiProperty({
        description: 'Reason for consuming energy',
        example: 'quiz_play',
    })
    @IsString()
    reason: string;

    @ApiProperty({
        description: 'Additional metadata (quiz_id, etc.)',
        required: false,
    })
    @IsOptional()
    metadata?: Record<string, any>;

    @ApiProperty({
        description: 'Idempotency key to prevent duplicate consumption',
        required: false,
    })
    @IsOptional()
    @IsString()
    idempotencyKey?: string;
}


export class RefillEnergyDto {
    @ApiProperty({
        description: 'Amount of energy to refill',
        example: 5,
        minimum: 1,
    })
    @IsInt()
    @IsPositive()
    amount: number;

    @ApiProperty({
        description: 'Idempotency key to prevent duplicate refills',
        required: false,
    })
    @IsOptional()
    @IsString()
    idempotencyKey?: string;
}


export class GrantEnergyDto {
    @ApiProperty({
        description: 'User ID to grant energy to',
        example: 1,
    })
    @IsInt()
    @IsPositive()
    userId: number;

    @ApiProperty({
        description: 'Amount of energy to grant',
        example: 5,
        minimum: 1,
    })
    @IsInt()
    @IsPositive()
    amount: number;

    @ApiProperty({
        description: 'Reason for granting energy',
        example: 'compensation',
    })
    @IsString()
    reason: string;
}
