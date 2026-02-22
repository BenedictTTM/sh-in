import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from '../../modules/auth/services/token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly tokenService: TokenService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            console.log(`[JwtAuthGuard] No token for ${request.method} ${request.url}`);
            throw new UnauthorizedException('No token provided');
        }

        try {
            const payload = await this.tokenService.verifyAccessToken(token);


            request['user'] = {
                id: payload.sub,
                email: payload.email,
                role: payload.role
            };

            console.log(`[JwtAuthGuard] ${request.method} ${request.url} → userId=${payload.sub}, email=${payload.email}`);
        } catch (error) {
            console.log(`[JwtAuthGuard] Token validation failed for ${request.method} ${request.url}`);
            throw new UnauthorizedException('Invalid or expired token');
        }

        return true;
    }

    private extractTokenFromHeader(request: any): string | undefined {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
