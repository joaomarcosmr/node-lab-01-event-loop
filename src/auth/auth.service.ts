import { Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async verify(username: string, password: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) return false;
    // ⚠️ 100k PBKDF2 iterations on the main thread, for every login attempt.
    const hash = crypto.pbkdf2Sync(password, user.salt, 100_000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(user.passwordHash));
  }
}
