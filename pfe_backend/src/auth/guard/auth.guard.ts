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
      const [scheme, token] = authorization.split(' ');
      if (scheme?.toLowerCase() !== 'bearer' || !token) {
        throw new UnauthorizedException('Invalid authorization header');
      }
      const authToken = token.trim();
      request.decodedData =
        await this.authService.validateSessionToken(authToken);

      return true;
    } catch (error) {
      throw new UnauthorizedException(
        (error instanceof Error ? error.message : String(error)) ||
          'session expired! Please sign In',
      );
    }
  }
}
