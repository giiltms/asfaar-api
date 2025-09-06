export enum Roles {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  APPLICANT = 'APPLICANT',
  AGENCY = 'AGENCY',
  FINANCE = 'FINANCE',
  EMBASSY_OFFICER = 'EMBASSY_OFFICER',
  LIAISON_OFFICER = 'LIAISON_OFFICER',
  VERIFICATION_OFFICER = 'VERIFICATION_OFFICER',
  BIOMETRIC_AGENT = 'BIOMETRIC_AGENT',
  CENTER_MANAGER = 'CENTER_MANAGER',
  RECEPTIONIST = 'RECEPTIONIST',
  GATEHOUSE = 'GATEHOUSE',
  AUTHORITY = 'AUTHORITY',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export const roleHierarchy: Record<Roles, number> = {
  [Roles.SUPER_ADMIN]: 12,
  [Roles.ADMIN]: 11,
  [Roles.FINANCE]: 10,
  [Roles.LIAISON_OFFICER]: 9, // Higher authority due to security agency management
  [Roles.AUTHORITY]: 8, // Foreign affairs authority
  [Roles.EMBASSY_OFFICER]: 7,
  [Roles.VERIFICATION_OFFICER]: 6,
  [Roles.CENTER_MANAGER]: 5,
  [Roles.BIOMETRIC_AGENT]: 4,
  [Roles.RECEPTIONIST]: 3,
  [Roles.GATEHOUSE]: 2,
  [Roles.AGENCY]: 1,
  [Roles.APPLICANT]: 0,
};

export const defaultRoles = [Roles.APPLICANT];

export const systemRoles = [Roles.SUPER_ADMIN, Roles.ADMIN];
export const adminRoles = [Roles.SUPER_ADMIN, Roles.ADMIN, Roles.FINANCE];
export const embassyRoles = [Roles.EMBASSY_OFFICER, Roles.LIAISON_OFFICER, Roles.AUTHORITY];
export const verificationRoles = [
  Roles.VERIFICATION_OFFICER,
  Roles.CENTER_MANAGER,
  Roles.BIOMETRIC_AGENT,
];
export const supportRoles = [Roles.RECEPTIONIST, Roles.GATEHOUSE];
export const partnerRoles = [Roles.AGENCY];
export const publicRoles = [Roles.APPLICANT];

export const staffRoles = [
  ...systemRoles,
  ...adminRoles,
  ...embassyRoles,
  ...verificationRoles,
  ...supportRoles,
];
