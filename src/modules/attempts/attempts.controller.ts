import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    ParseIntPipe,
    Request,
    Headers,
    HttpCode,
    HttpStatus,
    BadRequestException,
    UseGuards,
} from '@nestjs/common';
import { AttemptsService } from './attempts.service';
import { SubmitAnswerDto } from './dto';
import { JwtAuthGuard } from '../../common/guards';

@Controller({ version: '1' })
@UseGuards(JwtAuthGuard)
export class AttemptsController {
    constructor(private readonly attemptsService: AttemptsService) { }

    @Post('quizzes/:quizId/start')
    @HttpCode(HttpStatus.CREATED)
    async startAttempt(
        @Param('quizId', ParseIntPipe) quizId: number,
        @Request()
        req: {
            user: { id: number };
            headers: {
                'user-agent'?: string;
                'x-forwarded-for'?: string;
                'x-real-ip'?: string;
            };
            connection?: { remoteAddress?: string };
            socket?: { remoteAddress?: string };
        },
    ) {
        const userId = req.user.id;
        const ipAddress = this.extractIpAddress(req);
        const userAgent = req.headers['user-agent'];

        return this.attemptsService.startAttempt(
            quizId,
            userId,
            ipAddress,
            userAgent,
        );
    }

    @Post('attempts/:attemptId/answer')
    @HttpCode(HttpStatus.OK)
    async submitAnswer(
        @Param('attemptId', ParseIntPipe) attemptId: number,
        @Body() submitAnswerDto: SubmitAnswerDto,
        @Headers('x-attempt-token') attemptToken: string,
        @Request() req: { user: { id: number } },
    ) {
        if (!attemptToken) {
            throw new BadRequestException('X-Attempt-Token header is required');
        }

        return this.attemptsService.submitAnswer(
            attemptId,
            submitAnswerDto,
            attemptToken,
            req.user.id,
        );
    }

    @Post('attempts/:attemptId/finish')
    @HttpCode(HttpStatus.OK)
    async finishAttempt(
        @Param('attemptId', ParseIntPipe) attemptId: number,
        @Headers('x-attempt-token') attemptToken: string,
        @Request() req: { user: { id: number } },
    ) {
        if (!attemptToken) {
            throw new BadRequestException('X-Attempt-Token header is required');
        }

        const userId = req.user.id;
        return this.attemptsService.finishAttempt(attemptId, attemptToken, userId);
    }

    @Get('attempts/:attemptId/result')
    async getResult(
        @Param('attemptId', ParseIntPipe) attemptId: number,
        @Request() req: { user: { id: number } },
    ) {
        const userId = req.user.id;
        return this.attemptsService.getAttemptResult(attemptId, userId);
    }

    private extractIpAddress(req: {
        headers: {
            'x-forwarded-for'?: string;
            'x-real-ip'?: string;
            'user-agent'?: string;
        };
        connection?: { remoteAddress?: string };
        socket?: { remoteAddress?: string };
    }): string {
        return (
            req.headers['x-forwarded-for']?.split(',')[0]?.trim() ??
            req.headers['x-real-ip'] ??
            req.connection?.remoteAddress ??
            req.socket?.remoteAddress ??
            'unknown'
        );
    }
}
