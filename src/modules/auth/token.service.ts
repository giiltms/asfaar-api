import { Injectable } from '@nestjs/common';
import { Token, TokenType, TokenUseCase } from '@prisma/client';
import { PrismaService } from '@providers/prisma';
import * as moment from 'moment';
import * as crypto from 'crypto';
import { createHash } from 'crypto';

@Injectable()
export class TokenService {
  constructor(private readonly prisma: PrismaService) {}

  private getExpiry = (minutes: number) => {
    const createdAt = new Date();
    const expiresAt = moment(createdAt).add(minutes, 'minutes').toDate();
    return expiresAt;
  };

  private isTokenExpired(expiry: Date): boolean {
    const expirationDate = new Date(expiry);
    const currentDate = new Date();
    return expirationDate.getTime() <= currentDate.getTime();
  }

  private generateOTP(n: number): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < n; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

  private generateHEX(): string {
    const resetToken = crypto.randomBytes(32).toString('hex');
    return resetToken;
  }

  private async hashToken(token: string): Promise<string> {
    const hash = createHash('sha256').update(String(token)).digest('hex');
    return hash;
  }

  async create(
    userId: string,
    useCase: TokenUseCase,
    type: TokenType = TokenType.OTP,
    length = 6,
    minutes = 10,
  ): Promise<Token> {
    const secretToken =
      type === TokenType.OTP ? this.generateOTP(length) : this.generateHEX();

    const hashedToken = await this.hashToken(secretToken);
    const expiresAt = this.getExpiry(minutes);

    // save hashed token to DB
    const result = await this.prisma.token.create({
      data: {
        userId: userId,
        code: hashedToken,
        useCase: useCase,
        type: type,
        expiresAt,
      },
    });

    // return unhashed token to caller
    result.code = secretToken;
    return result;
  }

  async verify(
    userId: string,
    token: string,
    useCase: TokenUseCase,
  ): Promise<boolean> {
    const hashedToken = await this.hashToken(token);

    // Verify hashed token against the saved token in DB
    const savedToken = await this.prisma.token.findFirst({
      where: {
        userId,
        code: hashedToken,
        useCase,
      },
    });

    if (!savedToken) {
      return false;
    }

    await this.clear(userId, hashedToken, useCase);

    return !this.isTokenExpired(savedToken.expiresAt);
  }

  private async clear(userId: string, token: string, useCase: TokenUseCase) {
    // Clear token from DB
    await this.prisma.token.deleteMany({
      where: {
        userId,
        code: token,
        useCase,
      },
    });
  }
}
