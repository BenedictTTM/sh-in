import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    ParseIntPipe,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DiamondsService } from './diamonds.service';
import {
    PurchaseDiamondsDto,
    SpendDiamondsDto,
    GrantDiamondsDto,
    RefundDiamondsDto,
} from './dto/diamonds.dto';

/**
 * Diamond currency management endpoints
 * Handles premium currency operations
 */
@ApiTags('Diamonds')
@Controller('diamonds')
// @UseGuards(JwtAuthGuard) // Uncomment when auth is ready
export class DiamondsController {
    constructor(private readonly diamondsService: DiamondsService) { }

    /**
     * Get current diamond balance for authenticated user
     */
    @Get('balance')
    @ApiOperation({ summary: 'Get diamond balance' })
    @ApiResponse({ status: 200, description: 'Returns current diamond balance' })
    // @ApiBearerAuth()
    async getBalance(@Request() req: any) {
        // TODO: Get userId from JWT token (req.user.id)
        const userId = req.user?.id || 1; // Temporary fallback
        return this.diamondsService.getBalance(userId);
    }

    /**
     * Purchase diamonds (called after payment verification)
     */
    @Post('purchase')
    @ApiOperation({ summary: 'Purchase diamonds' })
    @ApiResponse({ status: 201, description: 'Diamonds purchased successfully' })
    @ApiResponse({ status: 400, description: 'Invalid purchase data' })
    @ApiResponse({ status: 409, description: 'Duplicate transaction' })
    // @ApiBearerAuth()
    async purchaseDiamonds(@Request() req: any, @Body() dto: PurchaseDiamondsDto) {
        const userId = req.user?.id || 1;
        return this.diamondsService.purchaseDiamonds(userId, dto);
    }

    /**
     * Spend diamonds on in-app items
     */
    @Post('spend')
    @ApiOperation({ summary: 'Spend diamonds' })
    @ApiResponse({ status: 200, description: 'Diamonds spent successfully' })
    @ApiResponse({ status: 400, description: 'Insufficient diamonds' })
    @ApiResponse({ status: 409, description: 'Duplicate transaction' })
    // @ApiBearerAuth()
    async spendDiamonds(@Request() req: any, @Body() dto: SpendDiamondsDto) {
        const userId = req.user?.id || 1;
        return this.diamondsService.spendDiamonds(userId, dto);
    }

    /**
     * Refund diamonds to user
     */
    @Post('refund')
    @ApiOperation({ summary: 'Refund diamonds' })
    @ApiResponse({ status: 200, description: 'Diamonds refunded successfully' })
    // @ApiBearerAuth()
    async refundDiamonds(@Request() req: any, @Body() dto: RefundDiamondsDto) {
        const userId = req.user?.id || 1;
        return this.diamondsService.refundDiamonds(userId, dto);
    }

    /**
     * Get transaction history
     */
    @Get('transactions')
    @ApiOperation({ summary: 'Get diamond transaction history' })
    @ApiResponse({ status: 200, description: 'Returns transaction history' })
    // @ApiBearerAuth()
    async getTransactions(
        @Request() req: any,
        @Query('limit', ParseIntPipe) limit = 50,
        @Query('offset', ParseIntPipe) offset = 0,
    ) {
        const userId = req.user?.id || 1;
        return this.diamondsService.getTransactionHistory(userId, limit, offset);
    }

    /**
     * Grant diamonds (admin only)
     * TODO: Add admin guard
     */
    @Post('admin/grant')
    @ApiOperation({ summary: 'Grant diamonds to user (admin only)' })
    @ApiResponse({ status: 200, description: 'Diamonds granted successfully' })
    // @ApiBearerAuth()
    // @UseGuards(AdminGuard)
    async grantDiamonds(@Body() dto: GrantDiamondsDto) {
        return this.diamondsService.grantDiamonds(dto);
    }
}
