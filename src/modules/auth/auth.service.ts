import {
  ConflictException,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { UserRepository } from '@modules/user/user.repository';
import { UserService } from '@modules/user/user.service';
import { User, TokenUseCase, TokenType } from '@prisma/client';
import { SignUpDTO } from './dto/sign-up.dto';
import { ApplicantSignUpDto } from './dto/sign-up-applicant.dto';
import { SignInDTO } from './dto/sign-in.dto';
import { TokenService } from './token.service';
import { AuthTokenService } from './auth-token.service';
import { PasswordResetService } from './password-reset.service';
import { MailService } from '@modules/mail/services/mail.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@providers/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Roles } from '@modules/app/app.roles';
import {
  EMAIL_CONFLICT,
  PHONE_CONFLICT,
} from '@common/constants/errors.constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly authTokenService: AuthTokenService,
    private readonly passwordResetService: PasswordResetService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async signUp(signUpDTO: SignUpDTO): Promise<User> {
    const existingUser = await this.getUserByEmail(signUpDTO.email);
    if (existingUser) {
      throw new ConflictException(EMAIL_CONFLICT);
    }

    // Check if phone is provided and if it already exists
    if (signUpDTO.phone) {
      const existingUserByPhone = await this.getUserByPhone(signUpDTO.phone);
      if (existingUserByPhone) {
        throw new ConflictException(PHONE_CONFLICT);
      }
    }

    const hashedPassword = await bcrypt.hash(signUpDTO.password, 10);

    const userData = {
      email: signUpDTO.email,
      firstName: signUpDTO.firstName,
      lastName: signUpDTO.lastName,
      password: hashedPassword,
      phone: signUpDTO.phone,
      gender: signUpDTO.gender,
      roles: signUpDTO.roles || [Roles.APPLICANT],
      isVerified: false,
      isActive: true,
    };

    const user = await this.userService.createUserWithCenters(
      userData,
      signUpDTO.centerIds,
    );

    // Send verification email (optional - comment out if mail service not ready)
    // try {
    //   await this.mailService.sendRegisterationConfirmation(user.email, {
    //     name: `${user.firstName} ${user.lastName}`,
    //   });
    // } catch (error) {
    //   console.log('Error sending email:', error.message);
    // }

    return user;
  }

  async signUpApplicant(signUpDto: ApplicantSignUpDto): Promise<User> {
    const existingUser = await this.getUserByEmail(signUpDto.email);
    if (existingUser) {
      throw new ConflictException(EMAIL_CONFLICT);
    }

    // Check if phone is provided and if it already exists
    if (signUpDto.phone) {
      const existingUserByPhone = await this.getUserByPhone(signUpDto.phone);
      if (existingUserByPhone) {
        throw new ConflictException(PHONE_CONFLICT);
      }
    }

    const hashedPassword = await bcrypt.hash(signUpDto.password, 10);

    const userData = {
      email: signUpDto.email,
      firstName: signUpDto.firstName,
      lastName: signUpDto.lastName,
      password: hashedPassword,
      phone: signUpDto.phone,
      roles: [Roles.APPLICANT],
      isVerified: false, // Set to false by default
      isActive: true,
    };

    const user = await this.userService.createUserWithCenters(
      userData,
      signUpDto.centerIds,
    );

    // Generate email verification token
    try {
      const verificationToken = await this.tokenService.create(
        user.id,
        TokenUseCase.EMAIL_VERIFICATION,
        TokenType.HEX,
        32, // 32-character hex token
        1440, // 24 hours expiration (1440 minutes)
      );

      // Send verification email
      await this.mailService.sendEmailVerification(
        user.email,
        `${user.firstName} ${user.lastName}`,
        verificationToken.code,
      );
    } catch (error) {
      console.log('Error sending verification email:', error.message);
      // Don't throw error here to avoid blocking registration
    }

    return user;
  }

  async signIn(signInDTO: SignInDTO, deviceIp?: string): Promise<any> {
    const user = await this.getUserByEmail(signInDTO.email);
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      signInDTO.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new BadRequestException('Account is deactivated');
    }

    if (!user.isVerified) {
      throw new BadRequestException(
        'Please verify your email address before signing in. Check your email for the verification link.',
      );
    }

    // Generate tokens
    const tokens = await this.authTokenService.sign({
      id: user.id,
      email: user.email,
      roles: user.roles,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        isVerified: user.isVerified,
        onboardingPaid: user.onboardingPaid,
      },
      ...tokens,
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async getUserByPhone(phone: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { phone } });
  }

  async getUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async refreshToken(refreshToken: string): Promise<any> {
    try {
      // Use the proper refreshTokens method that validates the token
      const tokens = await this.authTokenService.refreshTokens(refreshToken);
      return tokens;
    } catch (error) {
      throw new BadRequestException('Invalid refresh token');
    }
  }

  async sign(user: User, deviceIp?: string): Promise<any> {
    // Generate tokens for the user
    const tokens = await this.authTokenService.sign({
      id: user.id,
      email: user.email,
      roles: user.roles,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        isVerified: user.isVerified,
        onboardingPaid: user.onboardingPaid,
      },
      ...tokens,
    };
  }

  async logout(
    userId: string,
    refreshToken?: string,
  ): Promise<{ message: string }> {
    // Simple logout implementation
    // In a real app, you'd invalidate the refresh token
    return { message: 'Logged out successfully' };
  }

  async verifyEmail(token: string): Promise<any> {
    try {
      // Find the token first to get the user ID
      const tokenRecord = await this.prisma.token.findFirst({
        where: {
          code: await this.hashToken(token),
          useCase: TokenUseCase.EMAIL_VERIFICATION,
          isUsed: false,
        },
        include: {
          owner: true,
        },
      });

      if (!tokenRecord) {
        throw new BadRequestException('Invalid or expired verification token');
      }

      // Check if token is expired
      if (new Date() > tokenRecord.expiresAt) {
        throw new BadRequestException('Verification token has expired');
      }

      // Verify the token using the token service
      const isValid = await this.tokenService.verify(
        tokenRecord.userId,
        token,
        TokenUseCase.EMAIL_VERIFICATION,
      );

      if (!isValid) {
        throw new BadRequestException('Invalid verification token');
      }

      // Update user as verified
      const user = await this.userRepository.updateUser(tokenRecord.userId, {
        isVerified: true,
      });

      // Automatically authenticate the user after successful verification
      const authResponse = await this.sign(user);

      return {
        message: 'Email verified successfully! You are now logged in.',
        ...authResponse,
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to verify email address',
      );
    }
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    try {
      // Generate new verification token
      const verificationToken = await this.tokenService.create(
        user.id,
        TokenUseCase.EMAIL_VERIFICATION,
        TokenType.HEX,
        32,
        1440, // 24 hours
      );

      // Send verification email
      await this.mailService.sendEmailVerification(
        user.email,
        `${user.firstName} ${user.lastName}`,
        verificationToken.code,
      );

      return {
        message: 'Verification email sent successfully',
      };
    } catch (error) {
      throw new BadRequestException('Failed to send verification email');
    }
  }

  // Helper method for token hashing (same as in TokenService)
  private async hashToken(token: string): Promise<string> {
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return hash;
  }
}
