import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class PlaceholderGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {

    void context;
    return true;
  }
}
