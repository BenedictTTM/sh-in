import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AwardEnergyDto {
    @IsNumber()
    @Min(1)
    amount: number;

    @IsOptional()
    @IsString()
    reason?: string;
}
