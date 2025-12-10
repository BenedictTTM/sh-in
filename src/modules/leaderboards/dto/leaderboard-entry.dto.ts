import { ApiProperty } from '@nestjs/swagger';

export class LeaderboardUserDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    firstName: string;

    @ApiProperty()
    lastName: string;

    @ApiProperty({ required: false })
    school?: string;

    @ApiProperty({ required: false })
    profilePicture?: string;
}

export class LeaderboardEntryDto {
    @ApiProperty()
    rank: number;

    @ApiProperty()
    score: number;

    @ApiProperty()
    user: LeaderboardUserDto;
}
