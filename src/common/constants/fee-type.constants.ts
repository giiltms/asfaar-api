import { FeeType } from '@prisma/client';

/**
 * Service Fee Type Constants
 * Provides human-readable descriptions for FeeType enum values
 */
export const FEE_TYPE_DESCRIPTIONS = {
  [FeeType.ONBOARDING]: 'Initial registration and setup fees',
  [FeeType.APPLICATION]: 'Visa or permit application processing fees',
  [FeeType.UPGRADE]:
    'Premium service upgrades (express processing, priority handling)',
  [FeeType.RESCHEDULING]: 'Appointment rescheduling and modification fees',
  [FeeType.ADDITIONAL_CHARGE]:
    'Additional charges (document corrections, extra services)',
} as const;

/**
 * Fee Type Categories for grouping and filtering
 */
export const FEE_TYPE_CATEGORIES = {
  CORE: [FeeType.ONBOARDING, FeeType.APPLICATION],
  OPTIONAL: [FeeType.UPGRADE, FeeType.ADDITIONAL_CHARGE],
  ADMINISTRATIVE: [FeeType.RESCHEDULING],
} as const;

/**
 * Fee Type Display Names (shorter versions for UI)
 */
export const FEE_TYPE_LABELS = {
  [FeeType.ONBOARDING]: 'Onboarding',
  [FeeType.APPLICATION]: 'Application',
  [FeeType.UPGRADE]: 'Upgrade',
  [FeeType.RESCHEDULING]: 'Rescheduling',
  [FeeType.ADDITIONAL_CHARGE]: 'Additional Charge',
} as const;

/**
 * Default fee type for new service fees
 */
export const DEFAULT_FEE_TYPE = FeeType.APPLICATION;

/**
 * All available fee types as an array
 */
export const ALL_FEE_TYPES = Object.values(FeeType);
