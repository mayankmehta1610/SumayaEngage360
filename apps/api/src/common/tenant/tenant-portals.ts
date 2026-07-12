import { TenantType } from '@prisma/client';

/** Default portal modules enabled per tenant type at provisioning. */
export function defaultPortalsForType(type: TenantType): string[] {
  switch (type) {
    case TenantType.RECRUITMENT_AGENCY:
      return ['ats', 'agency'];
    case TenantType.INDIVIDUAL_RECRUITER:
      return ['ats', 'agency'];
    case TenantType.STAFFING_COMPANY:
      return ['ats', 'staffing', 'operations'];
    case TenantType.COMPANY:
    default:
      return ['ats', 'workforce', 'operations', 'compensation', 'performance'];
  }
}

export function isPortalEnabled(
  enabledPortals: unknown,
  portal: string,
): boolean {
  if (!Array.isArray(enabledPortals)) return true;
  return enabledPortals.includes(portal);
}
