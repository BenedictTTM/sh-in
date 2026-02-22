import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { AttemptsModule } from './modules/attempts/attempts.module';
import { LeaderboardsModule } from './modules/leaderboards/leaderboards.module';
import { AdminModule } from './modules/admin/admin.module';
import { EnergyModule } from './modules/energy/energy.module';
import { DiamondsModule } from './modules/diamonds/diamonds.module';
import { ContributionsModule } from './modules/contributions/contributions.module';
import { GamemodeModule } from './modules/gamemode/gamemode.module';
import { CoursesModule } from './modules/courses/courses.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    QuizzesModule,
    CoursesModule,
    AttemptsModule,
    LeaderboardsModule,
    AdminModule,
    EnergyModule,
    DiamondsModule,
    ContributionsModule,
    GamemodeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
