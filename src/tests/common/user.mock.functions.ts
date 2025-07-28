import { faker } from '@faker-js/faker';
import { Roles } from '@modules/app/app.roles';

export interface MockUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
  roles?: Roles[];
}

export function getSignUpData(): MockUserData {
  return {
    email: faker.internet.email().toLowerCase(),
    password: 'Test123!@#',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    username: faker.internet.userName().toLowerCase(),
    roles: [Roles.USER],
  };
}

export function getAdminSignUpData(): MockUserData {
  return {
    email: faker.internet.email().toLowerCase(),
    password: 'Admin123!@#',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    username: faker.internet.userName().toLowerCase(),
    roles: [Roles.ADMIN],
  };
}

export function createUsers(count: number): MockUserData[] {
  const users: MockUserData[] = [];

  for (let i = 0; i < count; i++) {
    users.push(getSignUpData());
  }

  return users;
}

export function createAdminUsers(count: number): MockUserData[] {
  const users: MockUserData[] = [];

  for (let i = 0; i < count; i++) {
    users.push(getAdminSignUpData());
  }

  return users;
}

export function getMockUserProfile() {
  return {
    company: faker.company.name(),
    jobTitle: faker.person.jobTitle(),
    education: faker.lorem.sentence(),
    skills: [faker.lorem.word(), faker.lorem.word(), faker.lorem.word()],
    interests: [faker.lorem.word(), faker.lorem.word()],
    socialLinks: {
      linkedin: faker.internet.url(),
      twitter: faker.internet.url(),
      github: faker.internet.url(),
    },
    address: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      country: faker.location.country(),
      zipCode: faker.location.zipCode(),
    },
  };
}

export function getMockUserPreferences() {
  return [
    { key: 'language', value: 'en', category: 'general' },
    { key: 'timezone', value: 'UTC', category: 'general' },
    { key: 'emailNotifications', value: 'true', category: 'notifications' },
    { key: 'smsNotifications', value: 'false', category: 'notifications' },
    { key: 'theme', value: 'light', category: 'appearance' },
  ];
}
