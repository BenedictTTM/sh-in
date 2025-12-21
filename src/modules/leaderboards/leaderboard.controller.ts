import {
    Controller,
    Get,
    Query,
    Request,
    ParseIntPipe,
    DefaultValuePipe,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LeaderboardEntryDto } from './dto/leaderboard-entry.dto';
import { UserRankDto } from './dto/user-rank.dto';

@ApiTags('Leaderboards')
@Controller('leaderboards')
export class LeaderboardController {
    constructor(private readonly leaderboardService: LeaderboardService) {}

    @Get('global')
    @ApiOperation({ summary: 'Get global leaderboard for current month' })
    @ApiResponse({
        status: 200,
        description: 'Top users by score',
        type: [LeaderboardEntryDto],
    })
    async getGlobalLeaderboard(
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    ) {
        return this.leaderboardService.getGlobalLeaderboard(limit);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get current user rank' })
    @ApiResponse({
        status: 200,
        description: 'User rank details',
        type: UserRankDto,
    })
    async getUserRank(@Request() req: any) {
        return this.leaderboardService.getUserRank(req.user.id);
    }
}
