import { Body, Controller, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: { username?: string; password?: string }) {
    const ok = await this.auth.verify(body?.username ?? '', body?.password ?? '');
    if (!ok) throw new UnauthorizedException();
    return { ok: true };
  }
}
