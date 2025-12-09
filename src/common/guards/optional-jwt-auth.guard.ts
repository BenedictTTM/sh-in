import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from '../../modules/auth/services/token.service';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
    constructor(private readonly tokenService: TokenService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);

        // If no token is provided, allow access (public) but don't set user
        if (!token) {
            return true;
        }

        try {
            const payload = await this.tokenService.verifyAccessToken(token);
            // Assign payload to request object so controllers can access it
            request['user'] = {
                id: payload.sub,
                email: payload.email,
                role: payload.role
            };
        } catch {
            // If token is invalid, we could either:
            // 1. Throw 401 (force frontend to refresh/login)
            // 2. Ignore it and treat as anonymous
            // Generally if a token IS provided but invalid, 401 is better so client knows something is wrong.
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
