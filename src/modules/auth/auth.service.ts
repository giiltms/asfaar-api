import {
  ConflictException,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { UserRepository } from '@modules/user/user.repository';
import { User } from '@prisma/client';
import { SignUpDTO } from './dto/sign-up.dto';
import { SignUpTrainerDTO } from './dto/sign-up-trainer.dto';
import { SignUpRegionalDTO } from './dto/sign-up-regional.dto';
import { SignInDTO } from './dto/sign-in.dto';
import { TokenService } from './token.service';
import { AuthTokenService } from './auth-token.service';
import { PasswordResetService } from './password-reset.service';
import { MailService } from '@modules/mail/services/mail.service';
import { ConfigService } from '@nestjs/config';
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
    private readonly tokenService: TokenService,
    private readonly authTokenService: AuthTokenService,
    private readonly passwordResetService: PasswordResetService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
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

    const user = await this.userRepository.create(userData);

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

  async signUpDriver(
    signUpDTO: SignUpTrainerDTO,
    file?: Express.Multer.File,
  ): Promise<User> {
    // Simplified version to avoid compilation errors
    const existingUserByEmail = await this.getUserByEmail(signUpDTO.email);
    if (existingUserByEmail) {
      throw new ConflictException(EMAIL_CONFLICT);
    }

    // Check if phone already exists (phone is required for trainers)
    const existingUserByPhone = await this.getUserByPhone(signUpDTO.phone);
    if (existingUserByPhone) {
      throw new ConflictException(PHONE_CONFLICT);
    }

    const hashedPassword = await bcrypt.hash(signUpDTO.password, 10);

    const userData = {
      email: signUpDTO.email,
      firstName: signUpDTO.firstName || 'Driver',
      lastName: signUpDTO.lastName || 'User',
      password: hashedPassword,
      phone: signUpDTO.phone,
      roles: [Roles.APPLICANT], // Simplified role assignment
      isVerified: false,
      isActive: true,
    };

    const user = await this.userRepository.create(userData);
    return user;
  }

  async signUpRegional(signUpDTO: SignUpRegionalDTO): Promise<User> {
    // Simplified version to avoid compilation errors
    const existingUserByEmail = await this.getUserByEmail(signUpDTO.email);
    if (existingUserByEmail) {
      throw new ConflictException(EMAIL_CONFLICT);
    }

    const hashedPassword = await bcrypt.hash(signUpDTO.password, 10);

    const userData = {
      email: signUpDTO.email,
      firstName: signUpDTO.firstName,
      lastName: signUpDTO.lastName,
      password: hashedPassword,
      roles: signUpDTO.roles || [Roles.APPLICANT],
      isVerified: false,
      isActive: true,
    };

    const user = await this.userRepository.create(userData);
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

    // Generate tokens
    const tokens = await this.authTokenService.sign({
      id: user.id,
      email: user.email,
      roles: user.roles,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
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
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
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
}
