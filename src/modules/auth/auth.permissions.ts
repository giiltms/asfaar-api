import { Permissions, Actions } from '@modules/casl';
import { InferSubjects } from '@casl/ability';
import { Roles } from '@common/constants/roles.constants';

export type Subjects = InferSubjects<any>;

export const permissions: Permissions<Roles, Subjects, Actions> = {
  everyone({ can }) {
    can(Actions.create, 'User'); // Allow user registration
  },

  [Roles.APPLICANT]({ user, can }) {
    can(Actions.read, 'User', { id: user.id });
    can(Actions.update, 'User', { id: user.id });
    can(Actions.create, 'Application');
    can(Actions.read, 'Application', { applicantId: user.id });
  },

  [Roles.AGENCY]({ user, can }) {
    can(Actions.create, 'Application');
    can(Actions.read, 'Application', { agencyId: user.id });
    can(Actions.update, 'Application', { agencyId: user.id });
    can(Actions.read, 'User', { agencyId: user.id });
  },

  [Roles.RECEPTIONIST]({ can }) {
    can(Actions.read, 'Application');
    can(Actions.create, 'Appointment');
    can(Actions.update, 'Appointment');
  },

  [Roles.VERIFICATION_OFFICER]({ can }) {
    can(Actions.read, 'Application');
    can(Actions.update, 'Application');
    can(Actions.create, 'VerificationReport');
  },

  [Roles.EMBASSY_OFFICER]({ can }) {
    can(Actions.read, 'Application');
    can(Actions.update, 'Application');
    can(Actions.create, 'ApplicationDecision');
  },

  [Roles.BIOMETRIC_AGENT]({ can }) {
    can(Actions.create, 'BiometricData');
    can(Actions.read, 'BiometricSession');
  },

  [Roles.BIOMETRIC_SUPERVISOR]({ can }) {
    can(Actions.manage, 'BiometricData');
    can(Actions.manage, 'BiometricSession');
  },

  [Roles.SECURITY_OFFICER]({ can }) {
    can(Actions.read, 'Application');
    can(Actions.create, 'SecurityReport');
    can(Actions.update, 'SecurityStatus');
  },

  [Roles.ASFAAR_ADMIN]({ can }) {
    can(Actions.manage, 'User');
    can(Actions.manage, 'Application');
    can(Actions.read, 'AuditLog');
  },

  ADMIN({ user, can }) {
    can(Actions.manage, 'User');
    can(Actions.manage, 'Auth');
  },

  SUPER_ADMIN({ user, can }) {
    can(Actions.manage, 'all');
  },
};
