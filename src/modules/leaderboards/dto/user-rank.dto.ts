import { ApiProperty } from '@nestjs/swagger';

export class UserRankDto {
    @ApiProperty()
    userId: number;

    @ApiProperty()
    rank: number;

    @ApiProperty()
    score: number;

    @ApiProperty()
    month: string;

    @ApiProperty()
    year: number;
}
