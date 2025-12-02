import { Module } from '@nestjs/common';
import { AttemptsController } from './attempts.controller';
import { AttemptsService } from './attempts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EnergyModule } from '../energy/energy.module';
import { StatsModule } from '../stats/stats.module';
import { LeaderboardsModule } from '../leaderboards/leaderboards.module';

@Module({
  imports: [EnergyModule, StatsModule, LeaderboardsModule],
  controllers: [AttemptsController],
  providers: [AttemptsService, PrismaService],
  exports: [AttemptsService], // Export for use in other modules
})
export class AttemptsModule { }
