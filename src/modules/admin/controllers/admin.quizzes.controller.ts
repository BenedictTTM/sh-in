import {
  Controller,
  Post,
  Put,
  Get,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  Request,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { QuizzesService } from '../../quizzes/quizzes.service';
import { CreateQuizDto, UpdateQuizDto } from '../../quizzes/dto';


@Controller({ path: 'admin/quizzes', version: '1' })
// @UseGuards(JwtAuthGuard, AdminGuard) // Uncomment when guards are implemented
export class AdminQuizzesController {
  constructor(private readonly quizzesService: QuizzesService) { }

  @Get()
  async findAll(@Request() req: { user?: { id: number } }) {
    const userId = req.user?.id || 1;
    return this.quizzesService.findAllAdmin(userId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.quizzesService.findOneAdmin(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createQuizDto: CreateQuizDto,
    @Request() req: { user?: { id: number } },
  ) {
    const userId = req.user?.id || 1;
    return this.quizzesService.create(createQuizDto, userId);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user?: { id: number } },
  ) {
    const userId = req.user?.id || 1;
    const content = JSON.parse(file.buffer.toString());
    // Ensure it's an array
    const quizzes = Array.isArray(content) ? content : [content];
    return this.quizzesService.import(quizzes, userId);
  }


  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQuizDto: UpdateQuizDto,
    @Request() req: { user?: { id: number } },
  ) {
    const userId = req.user?.id || 1;
    return this.quizzesService.update(id, updateQuizDto, userId, true);
  }


  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user?: { id: number } },
  ) {
    return this.quizzesService.delete(id);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  async publish(@Param('id', ParseIntPipe) id: number) {
    return this.quizzesService.publish(id);
  }
}
