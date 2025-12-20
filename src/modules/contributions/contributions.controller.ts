import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ContributionsService } from './contributions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('contributions')
@UseGuards(JwtAuthGuard)
export class ContributionsController {
    constructor(private readonly contributionsService: ContributionsService)

    @Get()
    async getMyContributions(@Request() req) {
        return this.contributionsService.getUserContributions(req.user.id);
    }
}
