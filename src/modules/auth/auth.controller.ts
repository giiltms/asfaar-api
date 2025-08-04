import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import Serialize from '@common/decorators/serialize.decorator';
import UserEntity from '@modules/user/entities/user.entity';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { SignUpDTO } from './dto/sign-up.dto';
import { ApplicantSignUpDto } from './dto/sign-up-applicant.dto';
import { SignInDTO } from './dto/sign-in.dto';
import { VerifyNinDto, ConfirmNinDto } from './dto/verify-nin.dto';
import RefreshTokenDTO from './dto/refresh-token.dto';
import { ChangePasswordDTO } from './dto/change-password.dto';
import { AuthGuard } from './guard/auth.guard';
import { NinVerificationService } from '@shared/services/nin-verification/nin-verification.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
    private readonly ninVerificationService: NinVerificationService,
  ) {}

  @Post('sign-up')
  @Serialize(UserEntity)
  @ApiOperation({ summary: 'User registration' })
  async signUp(@Body() signUpDTO: SignUpDTO) {
    return this.authService.signUp(signUpDTO);
  }

  @Post('sign-up-applicant')
  @Serialize(UserEntity)
  @ApiOperation({ summary: 'Applicant registration' })
  async signUpApplicant(@Body() signUpDto: ApplicantSignUpDto) {
    return this.authService.signUpApplicant(signUpDto);
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
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout' })
  async logout() {
    return { message: 'Logged out successfully' };
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
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

  @Post('verify-nin')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify NIN with date of birth' })
  async verifyNin(@Body() verifyNinDto: VerifyNinDto) {
    return this.ninVerificationService.verifyNin(verifyNinDto);
  }

  @Post('confirm-nin')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm NIN verification and link to user' })
  async confirmNin(@Body() confirmNinDto: ConfirmNinDto, @Request() req: any) {
    return this.ninVerificationService.confirmNin(confirmNinDto, req.user.id);
  }
}
