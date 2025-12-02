import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class PlaceholderGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Placeholder guard - always allows access
    void context;
    return true;
  }
}
