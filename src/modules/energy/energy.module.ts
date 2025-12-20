import { Module } from '@nestjs/common';
import { EnergyService } from './energy.service';
import { EnergyController } from './energy.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { DiamondsModule } from '../diamonds/diamonds.module';

import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [DiamondsModule, AuthModule],
    controllers: [EnergyController],
    providers: [EnergyService, PrismaService],
    exports: [EnergyService],
})
export class EnergyModule
