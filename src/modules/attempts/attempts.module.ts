import { Module } from '@nestjs/common';
import { AttemptsController } from './attempts.controller';
import { AttemptsService } from './attempts.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [AttemptsController],
  providers: [AttemptsService, PrismaService],
  exports: [AttemptsService], // Export for use in other modules
})
export class AttemptsModule {}
