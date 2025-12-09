import { Module } from '@nestjs/common';
import { QuizzesController } from './quizzes.controller';
import { QuizzesService } from './quizzes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';


@Module({
  imports: [AuthModule],
  controllers: [QuizzesController],
  providers: [QuizzesService, PrismaService],
  exports: [QuizzesService], // Export for use in other modules
})
export class QuizzesModule { }
