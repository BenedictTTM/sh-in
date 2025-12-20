import { IsInt, IsPositive, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';


export class PurchaseDiamondsDto {
    @ApiProperty({
        description: 'Amount of diamonds to purchase',
        example: 100,
        minimum: 1,
    })
    @IsInt()
    @IsPositive()
    amount: number;

    @ApiProperty({
        description: 'Payment receipt/transaction ID from payment provider',
        example: 'txn_1234567890',
    })
    @IsString()
    receiptId: string;

    @ApiProperty({
        description: 'Payment provider (stripe, apple, google)',
        example: 'stripe',
    })
    @IsString()
    provider: string;

    @ApiProperty({
        description: 'Idempotency key to prevent duplicate purchases',
        example: 'idem_1234567890',
        required: false,
    })
    @IsOptional()
    @IsString()
    idempotencyKey?: string;
}


export class SpendDiamondsDto {
    @ApiProperty({
        description: 'Amount of diamonds to spend',
        example: 10,
        minimum: 1,
    })
    @IsInt()
    @IsPositive()
    amount: number;

    @ApiProperty({
        description: 'Reason for spending diamonds',
        example: 'energy_refill',
    })
    @IsString()
    reason: string;

    @ApiProperty({
        description: 'Additional metadata (product_id, etc.)',
        required: false,
    })
    @IsOptional()
    metadata?: Record<string, any>;

    @ApiProperty({
        description: 'Idempotency key to prevent duplicate spends',
        required: false,
    })
    @IsOptional()
    @IsString()
    idempotencyKey?: string;
}


export class GrantDiamondsDto {
    @ApiProperty({
        description: 'User ID to grant diamonds to',
        example: 1,
    })
    @IsInt()
    @IsPositive()
    userId: number;

    @ApiProperty({
        description: 'Amount of diamonds to grant',
        example: 50,
        minimum: 1,
    })
    @IsInt()
    @IsPositive()
    amount: number;

    @ApiProperty({
        description: 'Reason for granting diamonds',
        example: 'compensation',
    })
    @IsString()
    reason: string;
}


export class RefundDiamondsDto {
    @ApiProperty({
        description: 'Amount of diamonds to refund',
        example: 10,
        minimum: 1,
    })
    @IsInt()
    @IsPositive()
    amount: number;

    @ApiProperty({
        description: 'Reason for refund',
        example: 'failed_purchase',
    })
    @IsString()
    reason: string;

    @ApiProperty({
        description: 'Original transaction ID being refunded',
        required: false,
    })
    @IsOptional()
    @IsString()
    originalTransactionId?: string;
}
