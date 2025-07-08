import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  Request,
  BadRequestException,
  Ip,
  Version,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Req,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDTO } from './dto/sign-up.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import ApiBaseResponses from '@decorators/api-base-response.decorator';
import { Gender, TokenUseCase, User } from '@prisma/client';
import Serialize from '@decorators/serialize.decorator';
import UserBaseEntity from '@modules/user/entities/user-base.entity';
import { SignInDTO } from '@modules/auth/dto/sign-in.dto';
import { SkipAuth } from '@modules/auth/guard/skip-auth.guard';
import RefreshTokenDTO from '@modules/auth/dto/refresh-token.dto';
import {
  AccessGuard,
  Actions,
  CaslUser,
  UseAbility,
  UserProxy,
} from '@modules/casl';
import { TokensEntity } from '@modules/auth/entities/tokens.entity';
import { VerifyOTPDTO } from './dto/verify-otp.dto';
import { TokenService } from './token.service';
import { PasswordResetService } from './password-reset.service';
import { RequestResetPasswordDTO } from './dto/request-reset-password.dto';
import { ResetPasswordDTO } from './dto/reset-password.dto';
import { SignUpTrainerDTO } from './dto/sign-up-trainer.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChangePasswordDTO } from './dto/change-password.dto';
import { UpdatePasswordDTO } from './dto/update-password.dto';
import { SignUpRegionalDTO } from './dto/sign-up-regional.dto';
import { AuditLogService } from '@modules/audit/audit.service';

@ApiTags('Auth')
@ApiBaseResponses()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly passwordResetService: PasswordResetService,
    private readonly auditService: AuditLogService,
  ) {}

  @Version('1')
  @ApiBody({ type: SignUpDTO })
  @Serialize(UserBaseEntity)
  @ApiOperation({ summary: 'Register user account' })
  @SkipAuth()
  @Post('sign-up')
  async create(
    @Body() signUpDTO: SignUpDTO,
    @Request() req: any,
  ): Promise<User> {
    const { password, ...auditData } = signUpDTO;

    return this.authService.signUp(signUpDTO);
  }

  @Version('1')
  @ApiBody({ type: SignInDTO })
  @SkipAuth()
  @ApiOperation({ summary: 'Sign-in to user account' })
  @Post('sign-in')
  async signIn(
    @Body() signInDTO: SignInDTO,
    @Request() req: any,
    @Ip() deviceIp: string,
  ): Promise<Auth.AccessRefreshTokens> {
    const { password, ...auditData } = signInDTO;

    return this.authService.signIn(signInDTO, deviceIp);
  }

  @Version('1')
  @ApiBody({ type: VerifyOTPDTO })
  @SkipAuth()
  @ApiOperation({ summary: 'Verify sign-in OTP' })
  @Post('verify-otp')
  async verifyOTP(@Body() verifyOTPDTO: VerifyOTPDTO, @Request() req: any) {
    const deviceIp = req.ip;
    const { email, otp } = verifyOTPDTO;

    const user = await this.authService.getUserByEmail(email);

    if (!user) {
      throw new BadRequestException('Invalid OTP');
    }

    // Verify OTP
    const isOTPValid = await this.tokenService.verify(
      user.id,
      otp,
      TokenUseCase.LOGIN,
    );

    if (!isOTPValid) {
      throw new BadRequestException('Invalid OTP');
    }

    // Proceed with regular authentication
    return this.authService.sign(user, deviceIp);
  }

  @Version('1')
  @ApiBody({ type: RefreshTokenDTO })
  @SkipAuth()
  @ApiOperation({ summary: 'Refresh authentication token' })
  @Post('token/refresh')
  refreshToken(
    @Body() refreshTokenDTO: RefreshTokenDTO,
  ): Promise<Auth.AccessRefreshTokens | void> {
    return this.authService.refreshTokens(refreshTokenDTO.refreshToken);
  }

  @Version('1')
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sign-out user session' })
  @UseGuards(AccessGuard)
  @HttpCode(204)
  @UseAbility(Actions.delete, TokensEntity)
  async logout(@CaslUser() userProxy?: UserProxy<User>) {
    const { accessToken } = await userProxy.getMeta();
    const { id: userId } = await userProxy.get();

    return this.authService.logout(userId, accessToken);
  }

  @Version('1')
  @SkipAuth()
  @ApiOperation({ summary: 'Request password reset' })
  @Post('password-reset/request')
  async requestPasswordReset(
    @Body() requestResetPasswordDTO: RequestResetPasswordDTO,
    @Request() req: any,
  ) {
    await this.passwordResetService.requestPasswordReset(
      requestResetPasswordDTO.email,
    );

    return {
      message: 'Password reset email sent successfully',
    };
  }

  @Version('1')
  @SkipAuth()
  @ApiOperation({ summary: 'Update password' })
  @ApiBadRequestResponse({ description: 'User Not found' })
  @Post('password-update/update')
  async updatePassword(
    @Body() updatePasswordDTO: UpdatePasswordDTO,
    @Request() req: any,
  ) {
    await this.passwordResetService.updatePassword(
      updatePasswordDTO.userId,
      updatePasswordDTO.newPassword,
    );

    const { newPassword } = updatePasswordDTO;

    return {
      message: 'Password updated successfully',
    };
  }

  @Version('1')
  @SkipAuth()
  @ApiOperation({ summary: 'Reset password' })
  @ApiBadRequestResponse({ description: 'Invalid or expired token' })
  @Post('password-reset/reset')
  async resetPassword(@Body() resetPasswordDTO: ResetPasswordDTO) {
    await this.passwordResetService.resetPassword(
      resetPasswordDTO.userId,
      resetPasswordDTO.token,
      resetPasswordDTO.newPassword,
    );

    return {
      message: 'Password reset successfully',
    };
  }

  @Version('1')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  @ApiBadRequestResponse({ description: 'Invalid or expired token' })
  @Post('change-password')
  async changePassword(
    @Body() changePasswordDTO: ChangePasswordDTO,
    @Request() req: any,
  ) {
    const meta = await this.auditService.getMetaFromRequest(req);
    const { userId, url, resourceId, metadata } = meta;

    await this.passwordResetService.changePassword(
      userId,
      changePasswordDTO.oldPassword,
      changePasswordDTO.newPassword,
    );

    return {
      message: 'Password changed successfully',
    };
  }
}
