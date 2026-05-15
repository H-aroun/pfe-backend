import { Injectable, UnauthorizedException } from '@nestjs/common';

import { UserService } from 'src/users/user.services';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthPayloadDTO } from './dto/login.dto';
@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(data: AuthPayloadDTO) {
    const { email, password } = data;
    const findUser = await this.userService.getUserByEmail(email);

    if (!findUser) {
      throw new UnauthorizedException('User not found');
    }
    if (!findUser.password) {
      throw new UnauthorizedException('User has no password set');
    }
    if (!(await bcrypt.compare(password, findUser.password))) {
      throw new UnauthorizedException('Invalid password');
    }
    const { ...safeUser } = findUser;

    return {
      userInfo: safeUser,
      access_token: await this.jwtService.signAsync(
        {
          id: findUser.id,
          firstName: findUser.firstName,
          lastName: findUser.lastName,
          email: findUser.email,
          role: findUser.role?.name,
        },
        { secret: this.configService.get('jwt.secretCode') },
      ),
    };
  }
  validateToken(token: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.jwtService.verify(token, {
      secret: this.configService.get('jwt.secretCode'),
    });
  }
}
