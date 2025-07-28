import { AuthTokenService } from '@modules/auth/auth-token.service';
import { AuthService } from '@modules/auth/auth.service';
import { PrismaClient, User } from '@prisma/client';
import { INestApplication } from '@nestjs/common';
import { AdminUserInterface } from '@tests/e2e/interfaces/admin-user.interface';
import { Roles } from '@modules/app/app.roles';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: Roles[];
}

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
    const email = 'admin@example.com';
    const password = 'admin123';

    // Delete existing admin if exists
    await this._connection.user.deleteMany({
      where: { email },
    });

    // Create admin user
    const hashedPassword = await bcrypt.hash(password, 10);
    const adminUser = await this._connection.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        roles: [Roles.ADMIN], // Use ADMIN instead of SYSTEM_ADMIN
        isVerified: true,
        isActive: true,
      },
    });

    // Generate tokens using sign method
    const tokens = await this._tokenService.sign({
      id: adminUser.id,
      email: adminUser.email,
      roles: adminUser.roles,
    });

    return {
      id: adminUser.id,
      phone: adminUser.phone,
      email: adminUser.email,
      password,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async createUser(): Promise<User & { password: string }> {
    const userData = this.getSignUpData();
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = await this._connection.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        roles: userData.roles,
        isVerified: true,
        isActive: true,
      },
    });

    return {
      ...user,
      password: userData.password,
    };
  }

  async createTestUser(data?: Partial<SignUpData>): Promise<AdminUserInterface> {
    const userData: SignUpData = {
      email: data?.email || faker.internet.email(),
      password: data?.password || 'password123',
      firstName: data?.firstName || faker.person.firstName(),
      lastName: data?.lastName || faker.person.lastName(),
      roles: data?.roles || [Roles.USER],
    };

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = await this._connection.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        roles: userData.roles,
        isVerified: true,
        isActive: true,
      },
    });

    const tokens = await this._tokenService.sign({
      id: user.id,
      email: user.email,
      roles: user.roles,
    });

    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      password: userData.password,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async createUsers(count: number): Promise<User[]> {
    const users: User[] = [];

    for (let i = 0; i < count; i++) {
      const userData = {
        email: faker.internet.email(),
        password: await bcrypt.hash('password123', 10),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        roles: [Roles.USER],
        isVerified: true,
        isActive: true,
      };

      const user = await this._connection.user.create({
        data: userData,
      });

      users.push(user);
    }

    return users;
  }

  getSignUpData(): SignUpData {
    return {
      email: faker.internet.email(),
      password: 'password123',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      roles: [Roles.USER],
    };
  }

  async getTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    return this._tokenService.sign({
      id: user.id,
      email: user.email,
      roles: user.roles,
    });
  }

  async cleanupUser(email: string): Promise<void> {
    await this._connection.user.deleteMany({
      where: { email },
    });
  }

  async cleanupUsers(emails: string[]): Promise<void> {
    await this._connection.user.deleteMany({
      where: {
        email: { in: emails },
      },
    });
  }
}

export default TestService;
