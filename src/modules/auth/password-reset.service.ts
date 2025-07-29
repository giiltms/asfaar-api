import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from './token.service';
import { PrismaService } from '@providers/prisma';
import { MailService } from '@modules/mail/services/mail.service';
import { TokenType, TokenUseCase } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { AuthTokenService } from './auth-token.service';
import { INVALID_CREDENTIALS } from '@common/constants';

@Injectable()
export class PasswordResetService {
  private clientURL: string;
  private logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly authTokenService: AuthTokenService,
  ) {
    this.clientURL = this.configService.get<string>('CLIENT_URL');
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return {
        status: 404,
        message: 'User not found',
      };
    }

    const token = await this.tokenService.create(
      user.id,
      TokenUseCase.PASSWORD_RESET,
      TokenType.HEX,
    );

    const context = {
      name: `${user.firstName} ${user.lastName}`,
      token: token.code,
      userId: user.id,
      expiresAt: token.expiresAt,
    };

    // Send password reset email with proper parameter
    await this.mailService.sendPasswordResetEmail(user.email, token.code);

    return {
      message: 'Password reset email sent successfully',
    };
  }

  async resetPassword(userId: string, token: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }

    const validToken = await this.tokenService.verify(
      user.id,
      token,
      TokenUseCase.PASSWORD_RESET,
    );

    if (!validToken) {
      throw new BadRequestException('Invalid or expired token');
    }

    // Update the user's password in the database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    // Send confirmation email (simplified - method doesn't exist yet)
    console.log('Password reset successful for user:', user.email);

    return {
      message: 'Password reset successfully',
    };
  }

  async updatePassword(userId: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (!user) {
      throw new BadRequestException('User Not found');
    }

    // Update the user's password in the database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const testUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (
      !(await this.authTokenService.isPasswordCorrect(
        oldPassword,
        testUser.password,
      ))
    ) {
      // 401001: Invalid credentials
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // Update the user's password in the database
    await this.prisma.user.update({
      where: { id: testUser.id },
      data: {
        password: hashedPassword,
      },
    });
  }
}
