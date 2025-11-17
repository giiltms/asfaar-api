import {
  Body,
  Controller,
  Post,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
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
import { RequestResetPasswordDTO } from './dto/request-reset-password.dto';
import { ResetPasswordDTO } from './dto/reset-password.dto';
import { AuthGuard } from './guard/auth.guard';
import {
  CurrentUser,
  JwtUserPayload,
} from '@common/decorators/current-user.decorator';
import { NinVerificationService } from '@shared/services/nin-verification/nin-verification.service';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { Throttle, ThrottleConfigs } from '@common/decorators/throttle.decorator';

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
  @ApiResponse({
    status: 200,
    description: 'User authenticated successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            email: { type: 'string', example: 'user@example.com' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            roles: {
              type: 'array',
              items: { type: 'string' },
              example: ['APPLICANT'],
            },
            isVerified: { type: 'boolean', example: true },
            onboardingPaid: { type: 'boolean', example: false },
          },
        },
        accessToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        refreshToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
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
    @CurrentUser() user: JwtUserPayload,
  ) {
    await this.passwordResetService.changePassword(
      user.id,
      changePasswordDTO.oldPassword,
      changePasswordDTO.newPassword,
    );

    return {
      message: 'Password changed successfully',
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle(ThrottleConfigs.PASSWORD_RESET)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password reset email sent successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async forgotPassword(@Body() dto: RequestResetPasswordDTO) {
    return this.passwordResetService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password reset successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token',
  })
  async resetPassword(@Body() dto: ResetPasswordDTO) {
    return this.passwordResetService.resetPassword(
      dto.userId,
      dto.token,
      dto.newPassword,
    );
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
  async confirmNin(
    @Body() confirmNinDto: ConfirmNinDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.ninVerificationService.confirmNin(confirmNinDto, user.id);
  }

  @Get('check-nin-availability/:nin')
  @ApiOperation({
    summary: 'Check if NIN is available for verification',
    description:
      'Check if a NIN can be used for verification without hitting the YouVerify API',
  })
  @ApiParam({
    name: 'nin',
    description: 'National Identity Number to check',
    example: '12345678901',
  })
  @ApiResponse({
    status: 200,
    description: 'NIN availability check result',
    schema: {
      type: 'object',
      properties: {
        available: {
          type: 'boolean',
          description: 'Whether the NIN is available for verification',
          example: true,
        },
        reason: {
          type: 'string',
          description: 'Reason why NIN is not available (if applicable)',
          example: 'This NIN has already been used by another user',
        },
        existingUser: {
          type: 'object',
          description: 'Details of existing user if NIN is already in use',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
          },
        },
      },
    },
  })
  async checkNinAvailability(@Param('nin') nin: string) {
    return this.ninVerificationService.checkNinAvailability(nin);
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email address and auto-login' })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully and user authenticated',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Email verified successfully! You are now logged in.',
        },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            roles: { type: 'array', items: { type: 'string' } },
            isVerified: { type: 'boolean', example: true },
            onboardingPaid: { type: 'boolean', example: false },
          },
        },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Verification token is required');
    }
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({
    status: 400,
    description: 'Invalid email or already verified',
  })
  async resendVerification(@Body() body: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(body.email);
  }
}
