import { InferSubjects } from '@casl/ability';

import { Actions, Permissions } from '@modules/casl';
import { Roles } from '@modules/app/app.roles';
import { TokensEntity } from '@modules/auth/entities/tokens.entity';
import UserEntity from '@modules/user/entities/user.entity';

export type Subjects = InferSubjects<typeof TokensEntity | typeof UserEntity>;

export const permissions: Permissions<Roles, Subjects, Actions> = {
  SYSTEM_ADMIN({ can }) {
    can(Actions.delete, TokensEntity);
    // campaign report
    can(Actions.read, UserEntity);
    can(Actions.create, UserEntity);
    can(Actions.read, UserEntity);
    can(Actions.manage, UserEntity);
  },
  DRIVER({ can }) {
    can(Actions.delete, UserEntity);
  },
  ADMIN({ can }) {
    can(Actions.delete, UserEntity);
  },
  PASSENGER({ can }) {
    can(Actions.delete, UserEntity);
  },
};
