import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { AttemptsModule } from './modules/attempts/attempts.module';
import { LeaderboardsModule } from './modules/leaderboards/leaderboards.module';
import { AdminModule } from './modules/admin/admin.module';
import { EnergyModule } from './modules/energy/energy.module';
import { DiamondsModule } from './modules/diamonds/diamonds.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    QuizzesModule,
    AttemptsModule,
    LeaderboardsModule,
    AdminModule,
    EnergyModule,
    DiamondsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule { }
