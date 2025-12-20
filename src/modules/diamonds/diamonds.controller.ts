import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { DiamondsService } from './diamonds.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('diamonds')
@UseGuards(JwtAuthGuard)
export class DiamondsController {
    constructor(private readonly diamondsService: DiamondsService)

    @Get()
    async getBalance(@Request() req) {
        return this.diamondsService.getBalance(req.user.id);
    }
}
