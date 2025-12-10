import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
    @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
    name: string;

    @ApiProperty({ example: 'Harvard University', description: 'School of the user', required: false, nullable: true })
    school: string | null;

    @ApiProperty({ example: 'john@example.com', description: 'Email of the user' })
    email: string;

    @ApiProperty({ example: 'https://example.com/profile.jpg', description: 'URL to profile picture', required: false, nullable: true })
    profilePicture: string | null;
}
