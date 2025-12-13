import { Module } from '@nestjs/common';
import { GamemodeService } from './gamemode.service';
import { GamemodeGateway } from './gamemode.gateway';

@Module({
    providers: [GamemodeGateway, GamemodeService],
    exports: [GamemodeService],
})
export class GamemodeModule { }
