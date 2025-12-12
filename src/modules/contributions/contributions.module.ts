import { Module } from '@nestjs/common';
import { ContributionsService } from './contributions.service';
import { ContributionsController } from './contributions.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
    imports: [],
    controllers: [ContributionsController],
    providers: [ContributionsService, PrismaService],
})
export class ContributionsModule { }
