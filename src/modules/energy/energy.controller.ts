import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    ParseIntPipe,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EnergyService } from './energy.service';
import { ConsumeEnergyDto, RefillEnergyDto, GrantEnergyDto } from './dto/energy.dto';

/**
 * Energy management endpoints
 * Handles regenerating currency used for quiz gameplay
 */
@ApiTags('Energy')
@Controller('energy')
// @UseGuards(JwtAuthGuard) // Uncomment when auth is ready
export class EnergyController {
    constructor(private readonly energyService: EnergyService) { }

    /**
     * Get current energy status with auto-refill
     */
    @Get()
    @ApiOperation({ summary: 'Get energy status' })
    @ApiResponse({
        status: 200,
        description: 'Returns current energy, max energy, and next refill time',
    })
    // @ApiBearerAuth()
    async getEnergy(@Request() req: any) {
        // TODO: Get userId from JWT token (req.user.id)
        const userId = req.user?.id || 1; // Temporary fallback
        return this.energyService.getEnergy(userId);
    }

    /**
     * Consume energy (e.g., when starting a quiz)
     */
    @Post('consume')
    @ApiOperation({ summary: 'Consume energy' })
    @ApiResponse({ status: 200, description: 'Energy consumed successfully' })
    @ApiResponse({ status: 400, description: 'Insufficient energy' })
    @ApiResponse({ status: 409, description: 'Duplicate transaction' })
    // @ApiBearerAuth()
    async consumeEnergy(@Request() req: any, @Body() dto: ConsumeEnergyDto) {
        const userId = req.user?.id || 1;
        return this.energyService.consumeEnergy(userId, dto);
    }

    /**
     * Refill energy using diamonds
     */
    @Post('refill')
    @ApiOperation({ summary: 'Refill energy with diamonds' })
    @ApiResponse({ status: 200, description: 'Energy refilled successfully' })
    @ApiResponse({ status: 400, description: 'Insufficient diamonds or energy already full' })
    @ApiResponse({ status: 409, description: 'Duplicate transaction' })
    // @ApiBearerAuth()
    async refillEnergy(@Request() req: any, @Body() dto: RefillEnergyDto) {
        const userId = req.user?.id || 1;
        return this.energyService.refillWithDiamonds(userId, dto);
    }

    /**
     * Get energy transaction history
     */
    @Get('transactions')
    @ApiOperation({ summary: 'Get energy transaction history' })
    @ApiResponse({ status: 200, description: 'Returns transaction history' })
    // @ApiBearerAuth()
    async getTransactions(
        @Request() req: any,
        @Query('limit', ParseIntPipe) limit = 50,
        @Query('offset', ParseIntPipe) offset = 0,
    ) {
        const userId = req.user?.id || 1;
        return this.energyService.getTransactionHistory(userId, limit, offset);
    }

    /**
     * Get diamond pricing for energy refills
     */
    @Get('pricing')
    @ApiOperation({ summary: 'Get energy refill pricing' })
    @ApiResponse({ status: 200, description: 'Returns diamond cost per energy and refill rate' })
    async getPricing() {
        return this.energyService.getDiamondPricing();
    }

    /**
     * Grant energy (admin only)
     * TODO: Add admin guard
     */
    @Post('admin/grant')
    @ApiOperation({ summary: 'Grant energy to user (admin only)' })
    @ApiResponse({ status: 200, description: 'Energy granted successfully' })
    // @ApiBearerAuth()
    // @UseGuards(AdminGuard)
    async grantEnergy(@Body() dto: GrantEnergyDto) {
        return this.energyService.grantEnergy(dto);
    }
}
