import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GamemodeService {
    private activeGames = new Map<string, any>();

    constructor(private prisma: PrismaService)

    createGame(gameId: string) {
        this.activeGames.set(gameId, { players: [], status: 'waiting' });
        return { gameId, status: 'waiting' };
    }

    async joinGame(gameId: string, playerId: string) {
        const game = this.activeGames.get(gameId);
        if (game) {
            if (!game.players.includes(playerId)) {
                game.players.push(playerId);
            }
            if (game.players.length === 2) {
                game.status = 'playing';
                const quizId = await this.getRandomQuizId();
                return { ...game, gameId, gameStarted: true, quizId };
            }
            return { ...game, gameId };
        }
        return null;
    }

    private async getRandomQuizId(): Promise<number> {

        const quizzes = await this.prisma.quiz.findMany({
            select: { id: true },
        });

        if (quizzes.length === 0) {
            return 1;
        }

        const randomIndex = Math.floor(Math.random() * quizzes.length);
        return quizzes[randomIndex].id;
    }
}
