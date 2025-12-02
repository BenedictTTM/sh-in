import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { EnergyService } from './energy.service';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users/:id/energy')
export class EnergyController {
    constructor(private readonly energyService: EnergyService) { }

    @Get()
    // @UseGuards(JwtAuthGuard)
    async getEnergy(@Request() req: any) {
        // In a real app, use req.user.id or validate param id matches user id
        const userId = parseInt(req.params.id);
        return this.energyService.getEnergy(userId);
    }
}
