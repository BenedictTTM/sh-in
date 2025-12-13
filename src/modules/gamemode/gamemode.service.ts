import { Injectable } from '@nestjs/common';

@Injectable()
export class GamemodeService {
    // Placeholder for game state management
    private activeGames = new Map<string, any>();

    createGame(gameId: string) {
        this.activeGames.set(gameId, { players: [], status: 'waiting' });
        return { gameId, status: 'waiting' };
    }

    joinGame(gameId: string, playerId: string) {
        const game = this.activeGames.get(gameId);
        if (game) {
            if (!game.players.includes(playerId)) {
                game.players.push(playerId);
            }
            if (game.players.length === 2) {
                game.status = 'playing';
                return { ...game, gameStarted: true };
            }
            return game;
        }
        return null;
    }
}
