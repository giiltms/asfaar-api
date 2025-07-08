import { SignUpDTO } from '@modules/auth/dto/sign-up.dto';
import { faker } from '@faker-js/faker';
import { User } from '@prisma/client';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import PaginatedResult = PaginatorTypes.PaginatedResult;
import { Roles } from '@modules/app/app.roles';

export function getSignUpData(email?: string): SignUpDTO {
  return {
    email: faker.internet.email({ provider: email }),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    password: faker.internet.password({ length: 12 }),
    roles: [Roles.PASSENGER],
  };
}

export function getPaginatedData<T>(input: T[]): PaginatedResult<T> {
  return {
    data: input,
    meta: {
      total: input.length,
      lastPage: Math.ceil(input.length / 10),
      currentPage: 1,
      perPage: 10,
      prev: null,
      next: null,
    },
  };
}

export function createUsers(length: number): User[] {
  const result: User[] = [];
  for (let i = 0; i < length; i++) {
    const user: User = {
      id: faker.string.alphanumeric({ length: 12 }),
      ...getSignUpData(),
      phone: null,
      avatar: null,
      roles: [Roles.PASSENGER],
      createdAt: faker.date.anytime(),
      updatedAt: faker.date.anytime(),
      isVerified: true,
      isActive: true,
      gender: 'MALE',
      middleName: '',
    };
    result.push(user);
  }
  return result;
}

export function getJwtTokens(): Auth.AccessRefreshTokens {
  return {
    accessToken: faker.string.alphanumeric({ length: 40 }),
    refreshToken: faker.string.alphanumeric({ length: 40 }),
  };
}
