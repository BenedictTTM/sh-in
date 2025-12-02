import { Module } from '@nestjs/common';
import { AdminQuizzesController } from './controllers/admin.quizzes.controller';
import { QuizzesModule } from '../quizzes/quizzes.module';

/**
 * AdminModule - Administrative endpoints module
 *
 * Provides:
 * - Admin quiz management (create, update, publish)
 * - Future admin endpoints (users, reports, etc.)
 *
 * Dependencies:
 * - QuizzesModule for quiz business logic
 */
@Module({
  imports: [QuizzesModule], // Import to use QuizzesService
  controllers: [AdminQuizzesController],
})
export class AdminModule {}
