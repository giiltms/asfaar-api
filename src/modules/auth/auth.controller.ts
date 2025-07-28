import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { SignUpDTO } from './dto/sign-up.dto';
import { SignInDTO } from './dto/sign-in.dto';
import RefreshTokenDTO from './dto/refresh-token.dto';
import { ChangePasswordDTO } from './dto/change-password.dto';
import { SignUpTrainerDTO } from './dto/sign-up-trainer.dto';
import { SignUpRegionalDTO } from './dto/sign-up-regional.dto';
import { PasswordResetService } from './password-reset.service';
import { AuditService } from '@modules/audit/audit.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
    private readonly auditService: AuditService,
  ) {}

  @Post('sign-up')
  @ApiOperation({ summary: 'User registration' })
  async signUp(@Body() signUpDTO: SignUpDTO) {
    return this.authService.signUp(signUpDTO);
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User authentication' })
  async signIn(@Body() signInDTO: SignInDTO) {
    return this.authService.signIn(signInDTO);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshToken(@Body() refreshTokenDTO: RefreshTokenDTO) {
    return this.authService.refreshToken(refreshTokenDTO.refreshToken);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout' })
  async logout() {
    return { message: 'Logged out successfully' };
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  async changePassword(
    @Body() changePasswordDTO: ChangePasswordDTO,
    @Request() req: any,
  ) {
    await this.passwordResetService.changePassword(
      req.user?.id || 'user-id',
      changePasswordDTO.oldPassword,
      changePasswordDTO.newPassword,
    );

    return {
      message: 'Password changed successfully',
    };
  }
}
