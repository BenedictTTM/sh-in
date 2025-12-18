import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GamemodeService } from './gamemode.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class GamemodeGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private logger: Logger = new Logger('GamemodeGateway');

    constructor(private readonly gamemodeService: GamemodeService) { }

    afterInit(server: Server) {
        this.logger.log('GamemodeGateway initialized');
    }

    handleConnection(client: Socket, ...args: any[]) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('joinGame')
    async handleJoinGame(@MessageBody() data: { gameId: string; playerId: string }, @ConnectedSocket() client: Socket) {
        this.logger.log(`Client joining game: ${JSON.stringify(data)}`);
        client.join(data.gameId);
        const result = await this.gamemodeService.joinGame(data.gameId, data.playerId);

        if (result && result.gameStarted) {
            this.server.to(data.gameId).emit('gameStarted', { ...result, startTime: Date.now() });
        }

        return { event: 'joinedGame', data: result };
    }

    @SubscribeMessage('createGame')
    handleCreateGame(@MessageBody() data: { gameId: string }, @ConnectedSocket() client: Socket) {
        this.logger.log(`Client creating game: ${data.gameId}`);
        client.join(data.gameId);
        const result = this.gamemodeService.createGame(data.gameId);
        return { event: 'createdGame', data: result };
    }

    @SubscribeMessage('updateScore')
    handleScoreUpdate(@MessageBody() data: { gameId: string; score: number; playerId: string; correctCount: number }, @ConnectedSocket() client: Socket) {
        // Broadcast to everyone else in the room (the opponent)
        client.broadcast.to(data.gameId).emit('opponentScoreUpdate', {
            playerId: data.playerId,
            score: data.score,
            correctCount: data.correctCount
        });
    }

    @SubscribeMessage('playerFinished')
    handlePlayerFinished(@MessageBody() data: { gameId: string; playerId: string }, @ConnectedSocket() client: Socket) {
        this.logger.log(`[Gateway] Player finished received: ${data.playerId} in game ${data.gameId} from client ${client.id}`);
        // Broadcast to everyone in the room that a player has finished
        client.broadcast.to(data.gameId).emit('opponentFinished', {
            playerId: data.playerId
        });
    }
}
