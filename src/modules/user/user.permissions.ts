import { Permissions, Actions } from '@modules/casl';
import { InferSubjects } from '@casl/ability';
import UserEntity from '@modules/user/entities/user.entity';
import { Roles } from '@common/constants/roles.constants';

export type Subjects = InferSubjects<typeof UserEntity>;

export const permissions: Permissions<Roles, Subjects, Actions> = {
  everyone({ can }) {
    can(Actions.read, UserEntity);
  },

  [Roles.APPLICANT]({ user, can }) {
    can(Actions.read, UserEntity, { id: user.id });
    can(Actions.update, UserEntity, { id: user.id });
  },

  [Roles.AGENCY]({ user, can }) {
    can(Actions.read, UserEntity, { agencyId: user.id });
    can(Actions.update, UserEntity, { agencyId: user.id });
  },

  [Roles.RECEPTIONIST]({ can }) {
    can(Actions.read, UserEntity);
  },

  [Roles.VERIFICATION_OFFICER]({ can }) {
    can(Actions.read, UserEntity);
    can(Actions.update, UserEntity);
  },

  [Roles.EMBASSY_OFFICER]({ can }) {
    can(Actions.read, UserEntity);
    can(Actions.update, UserEntity);
  },

  [Roles.BIOMETRIC_AGENT]({ can }) {
    can(Actions.read, UserEntity);
  },

  [Roles.CENTER_MANAGER]({ can }) {
    can(Actions.read, UserEntity);
    can(Actions.update, UserEntity);
    can(Actions.create, UserEntity); // For creating center staff
  },

  [Roles.FINANCE]({ can }) {
    can(Actions.read, UserEntity);
  },

  [Roles.LAISON_OFFICER]({ can }) {
    can(Actions.read, UserEntity);
    can(Actions.update, UserEntity);
    can(Actions.create, UserEntity); // For creating security agency staff
  },

  [Roles.GATEHOUSE]({ can }) {
    can(Actions.read, UserEntity);
  },

  ADMIN({ user, can }) {
    can(Actions.manage, UserEntity);
  },

  SUPER_ADMIN({ user, can }) {
    can(Actions.manage, UserEntity);
  },
};

