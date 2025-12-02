import {
  Controller,
  Post,
  Put,
  Body,
  Param,
  ParseIntPipe,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { QuizzesService } from '../../quizzes/quizzes.service';
import { CreateQuizDto, UpdateQuizDto } from '../../quizzes/dto';

/**
 * AdminQuizzesController - Admin-only quiz management
 *
 * Endpoints:
 * - POST /v1/admin/quizzes - Create quiz
 * - PUT /v1/admin/quizzes/:id - Update quiz
 * - POST /v1/admin/quizzes/:id/publish - Publish quiz
 *
 * Security:
 * - All endpoints require authentication
 * - All endpoints require admin role
 *
 * @todo Add JwtAuthGuard and AdminGuard once available
 */
@Controller({ path: 'admin/quizzes', version: '1' })
// @UseGuards(JwtAuthGuard, AdminGuard) // Uncomment when guards are implemented
export class AdminQuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  /**
   * Create new quiz
   *
   * Creates quiz with questions and choices in a single transaction
   * Quiz is created in unpublished state by default
   *
   * @param createQuizDto - Quiz creation payload
   * @param req - Request object (contains authenticated user)
   * @returns Created quiz with full details
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createQuizDto: CreateQuizDto,
    @Request() req: { user?: { id: number } },
  ) {
    const userId = req.user?.id || 1; // TODO: Get from authenticated user
    return this.quizzesService.create(createQuizDto, userId);
  }

  /**
   * Update existing quiz
   *
   * Supports partial updates and nested resource management
   * Cannot update quiz with active attempts (data integrity)
   *
   * @param id - Quiz identifier
   * @param updateQuizDto - Update payload
   * @param req - Request object
   * @returns Updated quiz
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQuizDto: UpdateQuizDto,
    @Request() req: { user?: { id: number } },
  ) {
    const userId = req.user?.id || 1; // TODO: Get from authenticated user
    return this.quizzesService.update(id, updateQuizDto, userId);
  }

  /**
   * Publish quiz
   *
   * Makes quiz available to users
   * Validates quiz structure before publishing
   * Idempotent operation (can be called multiple times safely)
   *
   * @param id - Quiz identifier
   * @returns Published quiz
   */
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  async publish(@Param('id', ParseIntPipe) id: number) {
    return this.quizzesService.publish(id);
  }
}
