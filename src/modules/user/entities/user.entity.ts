import { $Enums, User } from '@prisma/client';
import { Roles } from '@modules/app/app.roles';

export default class UserEntity implements User {
  gender: $Enums.Gender;
  nin: string;
  bvn: string;
  trainerProfileId: string;
  teamId: string;
  middleName: string;
  regionalProfileId: string;


  readonly id!: string;

  readonly phone!: string | null;

  readonly email!: string;

  readonly firstName!: string | null;

  readonly lastName!: string | null;

  readonly password!: string | null;

  readonly avatar!: string | null;

  readonly roles!: Roles[];

  readonly createdAt!: Date;

  readonly updatedAt!: Date;

  readonly isVerified!: boolean;

  readonly isActive!: boolean;
}
