import { Module } from '@nestjs/common';
import { AttemptsController } from './attempts.controller';
import { AttemptsService } from './attempts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EnergyModule } from '../energy/energy.module';
import { StatsModule } from '../stats/stats.module';
import { LeaderboardsModule } from '../leaderboards/leaderboards.module';

import { AuthModule } from '../auth/auth.module';
import { DiamondsModule } from '../diamonds/diamonds.module';

@Module({
  imports: [EnergyModule, StatsModule, LeaderboardsModule, AuthModule, DiamondsModule],
  controllers: [AttemptsController],
  providers: [AttemptsService, PrismaService],
  exports: [AttemptsService],
})

export class AttemptsModule
