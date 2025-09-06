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

  [Roles.CENTER_MANAGER]({ can }) {
    can(Actions.manage, 'BiometricData');
    can(Actions.manage, 'BiometricSession');
    can(Actions.manage, 'BiometricCenter');
    can(Actions.manage, 'BiometricAppointment');
    can(Actions.read, 'Application');
    can(Actions.update, 'Application');
    can(Actions.read, 'User');
    can(Actions.update, 'User');
  },

  [Roles.FINANCE]({ can }) {
    can(Actions.read, 'Application');
    can(Actions.read, 'Payment');
    can(Actions.update, 'Payment');
    can(Actions.create, 'Payment');
    can(Actions.read, 'ServiceFee');
    can(Actions.update, 'ServiceFee');
    can(Actions.read, 'AuditLog');
  },

  [Roles.LIAISON_OFFICER]({ can }) {
    can(Actions.read, 'Application');
    can(Actions.update, 'Application');
    can(Actions.create, 'LiaisonReport');
    can(Actions.read, 'User');
    can(Actions.create, 'SecurityReport');
    can(Actions.update, 'SecurityStatus');
    can(Actions.read, 'SecurityAgency');
    can(Actions.create, 'SecurityAgency');
    can(Actions.update, 'SecurityAgency');
  },

  [Roles.GATEHOUSE]({ can }) {
    can(Actions.read, 'Application');
    can(Actions.read, 'BiometricAppointment');
    can(Actions.update, 'BiometricAppointment');
    can(Actions.create, 'CheckIn');
  },

  ADMIN({ user, can }) {
    can(Actions.manage, 'User');
    can(Actions.manage, 'Auth');
  },

  SUPER_ADMIN({ user, can }) {
    can(Actions.manage, 'all');
  },
};
