import { Controller, Get, Param, ParseIntPipe, Request, Post, Body } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto';

@Controller({ path: 'quizzes', version: '1' })
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) { }

  @Post()
  async create(@Body() createQuizDto: CreateQuizDto, @Request() req: { user?: { id: number } }) {
    const userId = req.user?.id || 1;
    return this.quizzesService.create(createQuizDto, userId);
  }

  @Get()
  async findAll() {
    return this.quizzesService.findAllPublished();
  }

  @Get(':quizId')
  async findOne(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Request() req: { user?: { id: number } },
  ) {
    const userId = req.user?.id;
    return this.quizzesService.findById(quizId, userId);
  }
}
