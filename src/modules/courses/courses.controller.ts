import { Controller, Get, Post, Body, Param, ParseIntPipe, Request } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto, CreateUnitDto, CreateLessonDto } from './dto';
import { UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';

@Controller({ path: 'courses', version: '1' })
export class CoursesController {
    constructor(private readonly coursesService: CoursesService) { }

    @Post()
    create(@Body() createCourseDto: CreateCourseDto) {
        return this.coursesService.create(createCourseDto);
    }

    // Append a Unit to a Course
    @Post(':id/units')
    addUnit(@Param('id', ParseIntPipe) id: number, @Body() createUnitDto: CreateUnitDto) {
        return this.coursesService.addUnit(id, createUnitDto);
    }

    // Append a Lesson to a Unit (Note: this is technically under /courses route prefix but handling units logic)
    // For cleaner API structure, we could use a separate controller, but for now we route it here or use a different prefix.
    // Best practice: access nested resources via parent if logical, or root if unique ID.
    // Since Unit ID is unique, we can technically expose POST /courses/units/:unitId/lessons if we want to keep it under courses
    // OR strictly speaking, this controller prefix is 'courses'.
    // Let's create a new route binding: POST /courses/units/:unitId/lessons
    @Post('units/:unitId/lessons')
    addLesson(@Param('unitId', ParseIntPipe) unitId: number, @Body() createLessonDto: CreateLessonDto) {
        return this.coursesService.addLesson(unitId, createLessonDto);
    }

    // Bulk Import for a Course
    @Post(':id/import')
    importContent(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
        return this.coursesService.importContent(id, body);
    }

    @Get()
    findAll() {
        return this.coursesService.findAll();
    }

    @Get(':id')
    @UseGuards(OptionalJwtAuthGuard)
    async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
        // Safe access to user id with fallback for dev/testing
        const userId = req.user?.id;
        return this.coursesService.findOne(id, userId);
    }

    // Progress Tracking Endpoints

    @Post('challenges/check')
    async checkChallenge(@Body() body: { challengeId: number; optionId: number }, @Request() req: any) {
        // Assuming AuthGuard is used and req.user.id exists. 
        // If not, we might need to assume a userId or add the guard. 
        let userId = req.user?.id;

        if (!userId) {
            const debugUser = await this.coursesService.getDebugUser();
            userId = debugUser?.id || 1;
        }

        return this.coursesService.checkChallenge(userId, body);
    }

    @Get(':id/progress')
    getUserProgress(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
        const userId = req.user?.id || 1;
        return this.coursesService.getUserProgress(userId, id);
    }

    @Get('lessons/:id')
    findLesson(@Param('id', ParseIntPipe) id: number) {
        return this.coursesService.findLesson(id);
    }

    @Get('lessons/:id/info')
    getLessonInfo(@Param('id', ParseIntPipe) id: number) {
        return this.coursesService.getLessonInfo(id);
    }
}
