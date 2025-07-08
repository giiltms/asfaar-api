import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SignUpDTO } from './dto/sign-up.dto';
import { UserRepository } from '@modules/user/user.repository';
import {
  ACCOUNT_NOT_ACTIVE,
  ACCOUNT_NOT_VERIFIED,
  APPLICATION_REJECTED,
  APPLICATION_UNDER_REVIEW,
  INVALID_CREDENTIALS,
  OTP_REQUIRED,
  USER_CONFLICT,
} from '@constants/errors.constants';
import { Roles, TokenUseCase, User } from '@prisma/client';
import { SignInDTO } from '@modules/auth/dto/sign-in.dto';
import { AuthTokenService } from '@modules/auth/auth-token.service';
import { RedisService } from './redis.service';
import { MailService } from '@modules/mail/services/mail.service';
import { TokenService } from './token.service';
import { SignUpTrainerDTO } from './dto/sign-up-trainer.dto';
import { SignUpRegionalDTO } from './dto/sign-up-regional.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');
  prisma: any;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly authTokenService: AuthTokenService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * @desc Create a new user
   * @param signUpDTO
   * @returns Promise<User> - Created user
   * @throws ConflictException - User with this email or phone already exists
   */
  async signUp(signUpDTO: SignUpDTO): Promise<User> {
    const testUser = await this.getUserByEmail(signUpDTO.email);

    if (testUser) {
      // 409001: User with this email or phone already exists
      throw new ConflictException(USER_CONFLICT);
    }

    const modifiedDTO = {
      ...signUpDTO,
      isActive: true,
      isVerified: true,
    };

    return this.userRepository.create(modifiedDTO);
  }

  async signUpRegional(signUpDTO: SignUpRegionalDTO): Promise<User> {
    // Check if user with the same email already exists
    const existingUser = await this.getUserByEmail(signUpDTO.email);

    if (existingUser) {
      throw new ConflictException(USER_CONFLICT);
    }

    // Create the user with regionalProfile linked to the correct zone
    return this.userRepository.create({
      email: signUpDTO.email,
      firstName: signUpDTO.firstName,
      lastName: signUpDTO.lastName,
      password: signUpDTO.password,
      isActive: true,
      isVerified: true,
      roles: [Roles.PASSENGER],
    });
  }

  async signIn(
    signInDTO: SignInDTO,
    deviceIp: string,
  ): Promise<Auth.AccessRefreshTokens> {
    const testUser = await this.getUserByEmail(signInDTO.email);

    if (!testUser) {
      // 401001: Invalid credentials
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (!testUser.isActive) {
      throw new UnauthorizedException(ACCOUNT_NOT_ACTIVE);
    }

    // TODO: Implement email verification
    // if (!testUser.isVerified) {
    //   throw new UnauthorizedException(ACCOUNT_NOT_VERIFIED);
    // }

    if (
      !(await this.authTokenService.isPasswordCorrect(
        signInDTO.password,
        testUser.password,
      ))
    ) {
      // 401001: Invalid credentials
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // Check if device exists in Redis
    const isNewDevice = await this.isDeviceIPNew(testUser.id, deviceIp);

    // Never send otp
    if (false) {
      // Generate OTP
      const otp = await this.tokenService.create(
        testUser.id,
        TokenUseCase.LOGIN,
      );

      // Send OTP via email
      await this.mailService.sendOTPConfirmation(testUser.email, {
        otp: otp.code,
      });
      Logger.debug(otp.code, 'OTP');
      // 400004: Phone number or token is required
      throw new BadRequestException(OTP_REQUIRED);
    }

    return this.sign(testUser, deviceIp);
  }

  async sign(user: User, deviceIp: string) {
    // Save device to redis
    await this.saveDeviceIP(user.id, deviceIp);

    return this.authTokenService.sign({
      id: user.id,
      email: user.email,
      roles: user.roles,
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        email,
      },
      include: {
        // profile: true,
      },
    });
  }

  refreshTokens(
    refreshToken: string,
  ): Promise<Auth.AccessRefreshTokens | void> {
    return this.authTokenService.refreshTokens(refreshToken);
  }

  logout(userId: string, accessToken: string): Promise<void> {
    return this.authTokenService.logout(userId, accessToken);
  }

  async saveDeviceIP(userId: string, ip: string) {
    // Save device IP in Redis with expiration (e.g., 24 hours)
    await this.redisService.set(`device:${userId}:${ip}`, 86400);
    this.logger.log(ip, 'Users IP');
  }

  async isDeviceIPNew(userId: string, ip: string): Promise<boolean> {
    // Check if device IP is new by querying Redis
    const result = await this.redisService.exists(`device:${userId}:${ip}`);
    return result === 0; // Returns 0 if key doesn't exist (new device)
  }
}
