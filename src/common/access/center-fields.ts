/**
 * Center columns the staff dashboards render. Shared so the front desk and
 * center manager views resolve centers identically.
 */
export const CENTER_FIELDS = {
  id: true,
  name: true,
  code: true,
  address: true,
  city: true,
  state: true,
  isActive: true,
} as const;
