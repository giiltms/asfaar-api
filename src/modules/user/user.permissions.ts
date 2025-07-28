import { Permissions, Actions } from '@modules/casl';
import { InferSubjects } from '@casl/ability';
import UserEntity from '@modules/user/entities/user.entity';
import { Roles } from '@modules/app/app.roles';

export type Subjects = InferSubjects<typeof UserEntity>;

export const permissions: Permissions<Roles, Subjects, Actions> = {
  everyone({ can }) {
    can(Actions.read, UserEntity);
  },

  USER({ user, can }) {
    can(Actions.read, UserEntity);
    can(Actions.update, UserEntity, { id: user.id });
  },

  MODERATOR({ user, can }) {
    can(Actions.read, UserEntity);
    can(Actions.update, UserEntity);
  },

  ADMIN({ user, can }) {
    can(Actions.manage, UserEntity);
  },

  SUPER_ADMIN({ user, can }) {
    can(Actions.manage, UserEntity);
  },
};
