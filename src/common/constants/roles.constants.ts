export enum Roles {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  APPLICANT = 'APPLICANT',
  AGENCY = 'AGENCY',
  FINANCE = 'FINANCE',
  EMBASSY_OFFICER = 'EMBASSY_OFFICER',
  LAISON_OFFICER = 'LAISON_OFFICER',
  VERIFICATION_OFFICER = 'VERIFICATION_OFFICER',
  BIOMETRIC_AGENT = 'BIOMETRIC_AGENT',
  CENTER_MANAGER = 'CENTER_MANAGER',
  RECEPTIONIST = 'RECEPTIONIST',
  GATEHOUSE = 'GATEHOUSE',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

// Role hierarchy from highest to lowest access level
export const ROLE_HIERARCHY = {
  [Roles.SUPER_ADMIN]: 12,
  [Roles.ADMIN]: 11,
  [Roles.FINANCE]: 10,
  [Roles.LAISON_OFFICER]: 9, // Higher authority due to security agency management
  [Roles.EMBASSY_OFFICER]: 8,
  [Roles.VERIFICATION_OFFICER]: 7,
  [Roles.CENTER_MANAGER]: 6,
  [Roles.BIOMETRIC_AGENT]: 5,
  [Roles.RECEPTIONIST]: 4,
  [Roles.GATEHOUSE]: 3,
  [Roles.AGENCY]: 2,
  [Roles.APPLICANT]: 1,
} as const;

export const DEFAULT_ROLE = Roles.APPLICANT;

// Legacy naming for backward compatibility
export const defaultRoles = [Roles.APPLICANT];
export const roleHierarchy = ROLE_HIERARCHY;

// System administrators with highest privileges
export const SYSTEM_ROLES = [Roles.SUPER_ADMIN, Roles.ADMIN];

// Administrative staff with elevated privileges
export const ADMIN_ROLES = [Roles.SUPER_ADMIN, Roles.ADMIN, Roles.FINANCE];

// Embassy and liaison staff
export const EMBASSY_ROLES = [Roles.EMBASSY_OFFICER, Roles.LAISON_OFFICER];

// Verification and processing staff
export const VERIFICATION_ROLES = [
  Roles.VERIFICATION_OFFICER,
  Roles.CENTER_MANAGER,
  Roles.BIOMETRIC_AGENT,
];

// Front desk and support staff
export const SUPPORT_ROLES = [Roles.RECEPTIONIST, Roles.GATEHOUSE];

// External partners and agencies
export const PARTNER_ROLES = [Roles.AGENCY];

// End users/applicants
export const PUBLIC_ROLES = [Roles.APPLICANT];

// Legacy camelCase exports for backward compatibility
export const systemRoles = SYSTEM_ROLES;
export const adminRoles = ADMIN_ROLES;
export const embassyRoles = EMBASSY_ROLES;
export const verificationRoles = VERIFICATION_ROLES;
export const supportRoles = SUPPORT_ROLES;
export const partnerRoles = PARTNER_ROLES;
export const publicRoles = PUBLIC_ROLES;

// All staff roles (internal users)
export const STAFF_ROLES = [
  ...SYSTEM_ROLES,
  ...ADMIN_ROLES,
  ...EMBASSY_ROLES,
  ...VERIFICATION_ROLES,
  ...SUPPORT_ROLES,
];

// All roles that can access the admin panel
export const ADMIN_PANEL_ROLES = [
  ...SYSTEM_ROLES,
  ...ADMIN_ROLES,
  ...EMBASSY_ROLES,
  ...VERIFICATION_ROLES,
];

// Helper function to check if a role has higher or equal access than another
export const hasRoleAccess = (
  userRole: Roles,
  requiredRole: Roles,
): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

// Helper function to get the highest role from a list of roles
export const getHighestRole = (roles: Roles[]): Roles => {
  return roles.reduce((highest, current) =>
    ROLE_HIERARCHY[current] > ROLE_HIERARCHY[highest] ? current : highest,
  );
};
