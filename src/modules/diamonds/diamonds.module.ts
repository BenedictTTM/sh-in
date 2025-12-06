import { Module } from '@nestjs/common';
import { DiamondsController } from './diamonds.controller';
import { DiamondsService } from './diamonds.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
    controllers: [DiamondsController],
    providers: [DiamondsService, PrismaService],
    exports: [DiamondsService],
})
export class DiamondsModule { }
