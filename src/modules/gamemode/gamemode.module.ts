import { Module } from '@nestjs/common';
import { GamemodeService } from './gamemode.service';
import { GamemodeGateway } from './gamemode.gateway';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
    providers: [GamemodeGateway, GamemodeService, PrismaService],
    exports: [GamemodeService],
})
export class GamemodeModule
