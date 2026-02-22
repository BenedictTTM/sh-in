import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

import { ContributionsModule } from '../contributions/contributions.module';
import { StatsModule } from '../stats/stats.module';

@Module({
    imports: [PrismaModule, AuthModule, ContributionsModule, StatsModule],
    controllers: [CoursesController],
    providers: [CoursesService],
    exports: [CoursesService],
})
export class CoursesModule { }
