import { Controller, Get, Patch, Body, Request, Param, ParseIntPipe } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('users/:id/stats')
export class StatsController {
    constructor(private readonly statsService: StatsService) {}

    @Get()
    async getStats(@Param('id', ParseIntPipe) userId: number) {
        return this.statsService.getStats(userId);
    }

    @Patch('xp')
    async updateXp(
        @Param('id', ParseIntPipe) userId: number,
        @Body('amount') amount: number,
    ) {
        return this.statsService.updateStats(userId, { xp: amount });
    }

    @Patch('gems')
    async updateGems(
        @Param('id', ParseIntPipe) userId: number,
        @Body('amount') amount: number,
    ) {
        return this.statsService.updateStats(userId, { gems: amount });
    }
}
