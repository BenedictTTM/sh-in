import { Module } from '@nestjs/common';
import { EnergyService } from './energy.service';
import { EnergyController } from './energy.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
    controllers: [EnergyController],
    providers: [EnergyService, PrismaService],
    exports: [EnergyService],
})
export class EnergyModule { }
