import { Controller, Get, Param, ParseIntPipe, Request } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';

@Controller({ path: 'quizzes', version: '1' })
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

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
