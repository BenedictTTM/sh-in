import {
    Controller,
    Get,
    Query,
    Request,
    ParseIntPipe,
    DefaultValuePipe,
    UseGuards,
} from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Assuming you have this

@Controller('leaderboards')
export class LeaderboardController {
    constructor(private readonly leaderboardService: LeaderboardService) { }

    @Get('global')
    async getGlobalLeaderboard(
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    ) {
        return this.leaderboardService.getGlobalLeaderboard(limit);
    }

    @Get('me')
    // @UseGuards(JwtAuthGuard) // Uncomment when you want to enforce auth
    async getUserRank(@Request() req: any) {
        // Fallback to userId 1 for testing if no auth guard is active or user not attached
        const userId = req.user?.id || 1;
        return this.leaderboardService.getUserRank(userId);
    }
}
