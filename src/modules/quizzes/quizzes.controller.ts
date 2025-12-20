import { Controller, Get, Param, ParseIntPipe, Request, Post, Body, UseGuards } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';

@Controller({ path: 'quizzes', version: '1' })
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService)

  @Post()
  async create(@Body() createQuizDto: CreateQuizDto, @Request() req: { user?: { id: number } }) {
    const userId = req.user?.id || 1;
    return this.quizzesService.create(createQuizDto, userId);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(@Request() req: { user?: { id: number } }) {
    const userId = req.user?.id;
    return this.quizzesService.findAllPublished(userId);
  }

  @Get(':quizId')
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Request() req: { user?: { id: number } },
  ) {
    const userId = req.user?.id;
    return this.quizzesService.findById(quizId, userId);
  }
}
