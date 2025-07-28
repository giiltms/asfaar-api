import { Permissions, Actions } from '@modules/casl';
import { InferSubjects } from '@casl/ability';
import { Roles } from '@modules/app/app.roles';

export type Subjects = InferSubjects<any>;

export const permissions: Permissions<Roles, Subjects, Actions> = {
  everyone({ can }) {
    can(Actions.create, 'User'); // Allow user registration
  },

  USER({ user, can }) {
    can(Actions.read, 'User', { id: user.id });
    can(Actions.update, 'User', { id: user.id });
  },

  MODERATOR({ user, can }) {
    can(Actions.read, 'User');
    can(Actions.update, 'User');
  },

  ADMIN({ user, can }) {
    can(Actions.manage, 'User');
    can(Actions.manage, 'Auth');
  },

  SUPER_ADMIN({ user, can }) {
    can(Actions.manage, 'all');
  },
};
