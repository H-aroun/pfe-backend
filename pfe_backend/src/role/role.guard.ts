import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './role.decorator';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator → route is open to any authenticated user
    if (!roles || roles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<
        import('express').Request & { decodedData?: { role?: string } }
      >();
    const userRoleName = request.decodedData?.role;

    if (!userRoleName) {
      throw new UnauthorizedException('User has no role assigned');
    }

    return roles.includes(userRoleName);
  }
}
