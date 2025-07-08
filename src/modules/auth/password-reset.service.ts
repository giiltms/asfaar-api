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
import { CLIENT_URL } from '@constants/env.constants';
import { INVALID_CREDENTIALS } from '@constants/errors.constants';
import { AuthTokenService } from './auth-token.service';

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
      TokenUseCase.PWD_RESET,
      TokenType.HEX,
    );
  
    const context = {
      name: `${user.firstName} ${user.lastName}`,
      token: token.code,
      userId: user.id,
      expiresAt: token.expiresAt,
    };
  
    // Send the reset password email
    await this.mailService.sendPasswordResetEmail(user.email, context);
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
      TokenUseCase.PWD_RESET,
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

    // Send the OTP to the user's email
    await this.mailService.sendPasswordResetSuccess(user.email, {
      name: `${user.firstName} ${user.lastName}`,
    });
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
