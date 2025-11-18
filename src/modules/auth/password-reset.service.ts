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
      6, // length (not used for HEX type)
      60, // 60 minutes = 1 hour expiry
    );

    const userName =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || user.email.split('@')[0];

    // Send password reset email with proper parameter
    await this.mailService.sendPasswordResetEmail(
      user.email,
      token.code,
      userName,
    );

    return {
      message: 'Password reset email sent successfully',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      // First, find the token to get the user ID
      const hashedToken = await this.hashToken(token);
      const tokenRecord = await this.prisma.token.findFirst({
        where: {
          code: hashedToken,
          useCase: TokenUseCase.PASSWORD_RESET,
          isUsed: false,
        },
        include: {
          owner: true,
        },
      });

      if (!tokenRecord) {
        throw new BadRequestException('Invalid or expired token');
      }

      // Check if token is expired
      if (new Date() > tokenRecord.expiresAt) {
        throw new BadRequestException('Password reset token has expired');
      }

      // Verify the token using the token service
      const isValid = await this.tokenService.verify(
        tokenRecord.userId,
        token,
        TokenUseCase.PASSWORD_RESET,
      );

      if (!isValid) {
        throw new BadRequestException('Invalid or expired token');
      }

      // Update the user's password in the database
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.prisma.user.update({
        where: { id: tokenRecord.userId },
        data: {
          password: hashedPassword,
        },
      });

      this.logger.log(
        `Password reset successful for user: ${tokenRecord.owner.email}`,
      );

      return {
        message: 'Password reset successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to reset password: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Helper method for token hashing (same as in TokenService and AuthService)
  private async hashToken(token: string): Promise<string> {
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return hash;
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
