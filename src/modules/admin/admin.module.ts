import { Module } from '@nestjs/common';
import { AdminQuizzesController } from './controllers/admin.quizzes.controller';
import { AdminStatsController } from './controllers/admin.stats.controller';
import { QuizzesModule } from '../quizzes/quizzes.module';
import { StatsModule } from '../stats/stats.module';


@Module({
  imports: [QuizzesModule, StatsModule],
  controllers: [AdminQuizzesController, AdminStatsController],
})
export class AdminModule { }
