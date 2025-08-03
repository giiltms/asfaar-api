export enum Roles {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  APPLICANT = 'APPLICANT',
  AGENCY = 'AGENCY',
  ASFAAR_ADMIN = 'ASFAAR_ADMIN',
  EMBASSY_OFFICER = 'EMBASSY_OFFICER',
  SECURITY_OFFICER = 'SECURITY_OFFICER',
  VERIFICATION_OFFICER = 'VERIFICATION_OFFICER',
  BIOMETRIC_AGENT = 'BIOMETRIC_AGENT',
  BIOMETRIC_SUPERVISOR = 'BIOMETRIC_SUPERVISOR',
  RECEPTIONIST = 'RECEPTIONIST',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export const roleHierarchy: Record<Roles, number> = {
  [Roles.SUPER_ADMIN]: 11,
  [Roles.ASFAAR_ADMIN]: 10,
  [Roles.ADMIN]: 9,
  [Roles.EMBASSY_OFFICER]: 8,
  [Roles.SECURITY_OFFICER]: 7,
  [Roles.VERIFICATION_OFFICER]: 6,
  [Roles.BIOMETRIC_SUPERVISOR]: 5,
  [Roles.BIOMETRIC_AGENT]: 4,
  [Roles.RECEPTIONIST]: 3,
  [Roles.AGENCY]: 2,
  [Roles.APPLICANT]: 1,
};

export const defaultRoles = [Roles.APPLICANT];

export const systemRoles = [Roles.SUPER_ADMIN, Roles.ASFAAR_ADMIN];
export const adminRoles = [Roles.SUPER_ADMIN, Roles.ASFAAR_ADMIN, Roles.ADMIN];
export const embassyRoles = [Roles.EMBASSY_OFFICER, Roles.SECURITY_OFFICER];
export const verificationRoles = [
  Roles.VERIFICATION_OFFICER,
  Roles.BIOMETRIC_SUPERVISOR,
  Roles.BIOMETRIC_AGENT,
];
export const supportRoles = [Roles.RECEPTIONIST];
export const partnerRoles = [Roles.AGENCY];
export const publicRoles = [Roles.APPLICANT];

export const staffRoles = [
  ...systemRoles,
  ...adminRoles,
  ...embassyRoles,
  ...verificationRoles,
  ...supportRoles,
];
