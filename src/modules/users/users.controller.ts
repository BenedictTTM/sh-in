import {
    Controller,
    Get,
    Query,
    Req,
    ParseIntPipe,
    UseGuards,
    UnauthorizedException,
    Patch,
    Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UserProfileDto } from './dto/user-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Users')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('me/stats')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get current user stats' })
    @ApiResponse({
        status: 200,
        description: 'Returns aggregated user stats for dashboard',
    })
    async getMyStats(@Req() req: any) {
        return this.usersService.getUserStats(req.user.id);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({
        status: 200,
        description: 'Returns user profile (name, school, picture)',
        type: UserProfileDto,
    })
    async getHelper(@Req() req: any) {
        return this.usersService.getUserProfile(req.user.id);
    }

    @Patch('me')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Update current user profile' })
    @ApiResponse({
        status: 200,
        description: 'Returns updated user profile',
        type: UserProfileDto,
    })
    async updateProfile(
        @Req() req: any,
        @Body() updateProfileDto: UpdateProfileDto,
    ) {
        return this.usersService.updateProfile(req.user.id, updateProfileDto);
    }

    @Get('me/heatmap')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get user activity heatmap' })
    @ApiResponse({
        status: 200,
        description: 'Returns activity log for heatmap visualization',
    })
    async getMyHeatmap(
        @Req() req: any,
        @Query('year') year?: string,
    ) {
        const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
        return this.usersService.getHeatmap(req.user.id, targetYear);
    }
}
