import { Module } from '@nestjs/common';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [AuthModule],
    controllers: [LeaderboardController],
    providers: [LeaderboardService, PrismaService],
    exports: [LeaderboardService],
})
export class LeaderboardsModule
