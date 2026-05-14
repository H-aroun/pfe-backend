import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context
        .switchToHttp()
        .getRequest<import('express').Request & { decodedData?: any }>();
      const { authorization } = request.headers;

      if (!authorization || authorization.trim() === '') {
        throw new UnauthorizedException('Please provide token');
      }
      const authToken = authorization.replace(/bearer/gim, '').trim();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const resp = await this.authService.validateToken(authToken);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      request.decodedData = resp;

      return true;
    } catch (error) {
      throw new UnauthorizedException(
        (error instanceof Error ? error.message : String(error)) ||
          'session expired! Please sign In',
      );
    }
  }
}
