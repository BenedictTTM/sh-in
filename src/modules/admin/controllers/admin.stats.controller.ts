import { Controller, Get, UseGuards } from '@nestjs/common';
import { StatsService } from '../../stats/stats.service';

@Controller({ path: 'admin/stats', version: '1' })
export class AdminStatsController {
    constructor(private readonly statsService: StatsService) { }

    @Get('users')
    async getUsersStats() {
        return this.statsService.getGlobalUserStats();
    }
}
