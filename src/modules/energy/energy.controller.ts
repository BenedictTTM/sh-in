import {
    Controller,
    Get,
    Post,
    Body,
    UseGuards,
    Request,
    BadRequestException,
} from '@nestjs/common';
import { EnergyService } from './energy.service';
import { DiamondsService } from '../diamonds/diamonds.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TransactionReason } from '../../common/enums/currency.enum';
import { AwardEnergyDto } from './dto/award-energy.dto';

@Controller('energy')
@UseGuards(JwtAuthGuard)
export class EnergyController {
    constructor(
        private readonly energyService: EnergyService,
        private readonly diamondsService: DiamondsService,
    )

    @Get()
    async getEnergy(@Request() req) {
        return this.energyService.getEnergy(req.user.id);
    }

    @Post('convert')
    async convertDiamondsToEnergy(
        @Request() req,
        @Body('diamonds') diamondsToSpend: number,
    ) {
        if (!diamondsToSpend || diamondsToSpend <= 0) {
            throw new BadRequestException('Invalid amount of diamonds to convert');
        }

        const userId = req.user.id;

        const energyAmount = diamondsToSpend * 10;


        await this.diamondsService.spendDiamonds(
            userId,
            diamondsToSpend,
            TransactionReason.ENERGY_REFILL
        );


        const newEnergyBalance = await this.energyService.refillEnergy(
            userId,
            energyAmount,
            TransactionReason.DIAMOND_PURCHASE
        );

        return {
            success: true,
            spentDiamonds: diamondsToSpend,
            gainedEnergy: energyAmount,
            currentEnergy: newEnergyBalance
        };
    }

    @Post('award')
    async awardEnergy(
        @Request() req,
        @Body() dto: AwardEnergyDto,
    ) {
        const userId = req.user.id;
        const newBalance = await this.energyService.awardEnergy(
            userId,
            dto.amount,
            dto.reason || 'Admin Award'
        );

        return {
            success: true,
            awardedAmount: dto.amount,
            currentEnergy: newBalance
        };
    }
}
