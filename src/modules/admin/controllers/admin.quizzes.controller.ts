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


@Controller({ path: 'admin/quizzes', version: '1' })
// @UseGuards(JwtAuthGuard, AdminGuard) // Uncomment when guards are implemented
export class AdminQuizzesController {
  constructor(private readonly quizzesService: QuizzesService)


  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createQuizDto: CreateQuizDto,
    @Request() req: { user?: { id: number } },
  ) {
    const userId = req.user?.id || 1;
    return this.quizzesService.create(createQuizDto, userId);
  }


  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQuizDto: UpdateQuizDto,
    @Request() req: { user?: { id: number } },
  ) {
    const userId = req.user?.id || 1;
    return this.quizzesService.update(id, updateQuizDto, userId);
  }


  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  async publish(@Param('id', ParseIntPipe) id: number) {
    return this.quizzesService.publish(id);
  }
}
