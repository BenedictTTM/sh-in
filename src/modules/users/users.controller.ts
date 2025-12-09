import {
    Controller,
    Get,
    Query,
    Req,
    ParseIntPipe,
    UseGuards,
    UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('me/stats')
    @ApiOperation({ summary: 'Get current user stats' })
    @ApiResponse({
        status: 200,
        description: 'Returns aggregated user stats for dashboard',
    })
    async getMyStats(@Req() req: any) {
        // TODO: proper auth guard should be applied
        const userId = req.user?.id || 1; // Fallback for dev
        return this.usersService.getUserStats(userId);
    }

    @Get('me/heatmap')
    @ApiOperation({ summary: 'Get user activity heatmap' })
    @ApiResponse({
        status: 200,
        description: 'Returns activity log for heatmap visualization',
    })
    async getMyHeatmap(
        @Req() req: any,
        @Query('year') year?: string,
    ) {
        const userId = req.user?.id || 1;
        const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
        return this.usersService.getHeatmap(userId, targetYear);
    }
}
