import { Module } from '@nestjs/common';
import { DiamondsController } from './diamonds.controller';
import { DiamondsService } from './diamonds.service';
import { PrismaService } from '../../prisma/prisma.service';

import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [AuthModule],
    controllers: [DiamondsController],
    providers: [DiamondsService, PrismaService],
    exports: [DiamondsService],
})
export class DiamondsModule { }
