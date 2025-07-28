import { User } from '@prisma/client';

export default class UserEntity implements User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  middleName: string;
  lastName: string;
  username: string;
  gender: any; // Use any to avoid Gender enum issues for now
  dateOfBirth: Date;
  password: string;
  avatar: string;
  bio: string;
  website: string;
  location: string;
  timezone: string;
  locale: string;
  roles: any[]; // Use any[] to avoid role enum issues for now
  status: any; // Use any to avoid Status enum issues for now
  isVerified: boolean;
  isActive: boolean;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
