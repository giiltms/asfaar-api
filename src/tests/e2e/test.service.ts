import { AuthTokenService } from '@modules/auth/auth-token.service';
import { AuthService } from '@modules/auth/auth.service';
import { PrismaClient, User } from '@prisma/client';
import { INestApplication } from '@nestjs/common';
import { AdminUserInterface } from '@tests/e2e/interfaces/admin-user.interface';
import { Roles } from '@modules/app/app.roles';
import { createUsers, getSignUpData } from '@tests/common/user.mock.functions';
import { SignUpDTO } from '@modules/auth/dto/sign-up.dto';
import { faker } from '@faker-js/faker';

class TestService {
  private _authService!: AuthService;

  private _tokenService!: AuthTokenService;

  private _connection!: PrismaClient;

  constructor(app: INestApplication, connection: PrismaClient) {
    this._authService = app.get<AuthService>(AuthService);

    this._tokenService = app.get<AuthTokenService>(AuthTokenService);

    this._connection = connection;
  }

  async createGlobalAdmin(): Promise<AdminUserInterface> {
    const role: Roles.SYSTEM_ADMIN[] = [Roles.SYSTEM_ADMIN];

    const signUpData: SignUpDTO = getSignUpData();
    const userPassword: string = signUpData.password;

    const newAdmin: User = await this._authService.signUp(signUpData);

    await this._connection.user.update({
      where: {
        id: newAdmin.id,
      },
      data: {
        roles: [Roles.SYSTEM_ADMIN, Roles.PASSENGER],
      },
    });

    const { id, phone, email, password } = newAdmin;

    const { accessToken, refreshToken } = await this._authService.signIn(
      {
        email,
        password: userPassword,
      },
      '172.0.0.1',
    );

    return {
      id,
      phone,
      email,
      password: userPassword,
      accessToken,
      refreshToken,
    };
  }

  async createUser(): Promise<User> {
    const signUpDTO: SignUpDTO = this.getSignUpData();
    const { password } = signUpDTO;
    const user = await this._authService.signUp(signUpDTO);

    return {
      ...user,
      password,
    };
  }

  getSignUpData(): SignUpDTO {
    return {
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      password: faker.internet.password({ length: 12 }),
      roles: [Roles.PASSENGER],
    };
  }

  async getTokens(user: User): Promise<Auth.AccessRefreshTokens> {
    return this._tokenService.sign({
      id: user.id,
      email: user.email,
      roles: user.roles,
    });
  }
}

export default TestService;
