import { Injectable } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';

/**
 * Centralized privacy service for application status filtering
 * Ensures consistent privacy protection across dashboard services
 * 
 * PRIVACY SCOPE:
 * - AUTHORITY: Cannot see private statuses (DRAFT, PENDING_PAYMENT, CANCELLED)
 * - FRONTDESK: Cannot see private statuses (DRAFT, PENDING_PAYMENT, CANCELLED)
 * - ADMIN: Can see ALL statuses (full access for administrative purposes)
 * - SUPER_ADMIN: Can see ALL statuses (full access for administrative purposes)
 */
@Injectable()
export class PrivacyService {
  /**
   * Statuses that should be private to users only
   * These are never visible to authorities, frontdesk, or other staff
   */
  private static readonly PRIVATE_STATUSES: SubmissionStatus[] = [
    SubmissionStatus.DRAFT,
    SubmissionStatus.PENDING_PAYMENT,
    SubmissionStatus.CANCELLED,
  ];

  /**
   * Statuses that are public and visible to authorities
   * These represent applications in the official processing workflow
   */
  private static readonly PUBLIC_STATUSES: SubmissionStatus[] = [
    SubmissionStatus.SUBMITTED,
    SubmissionStatus.UNDER_REVIEW,
    SubmissionStatus.FLAGGED,
    SubmissionStatus.QUERIED,
    SubmissionStatus.PROCESSING,
    SubmissionStatus.PENDING_BIOMETRICS,
    SubmissionStatus.APPROVED,
    SubmissionStatus.REJECTED,
  ];

  /**
   * Get private statuses that should be hidden from authorities
   */
  static getPrivateStatuses(): SubmissionStatus[] {
    return [...this.PRIVATE_STATUSES];
  }

  /**
   * Get public statuses that are visible to authorities
   */
  static getPublicStatuses(): SubmissionStatus[] {
    return [...this.PUBLIC_STATUSES];
  }

  /**
   * Check if a status is private (should be hidden from authorities)
   */
  static isPrivateStatus(status: SubmissionStatus): boolean {
    return this.PRIVATE_STATUSES.includes(status);
  }

  /**
   * Check if a status is public (visible to authorities)
   */
  static isPublicStatus(status: SubmissionStatus): boolean {
    return this.PUBLIC_STATUSES.includes(status);
  }

  /**
   * Filter out private statuses from a list of requested statuses
   * Used when authorities request specific statuses
   */
  static filterPrivateStatuses(
    requestedStatuses: SubmissionStatus[],
  ): SubmissionStatus[] {
    return requestedStatuses.filter((status) => !this.isPrivateStatus(status));
  }

  /**
   * Create a Prisma where clause that excludes private statuses
   * Used for default queries when no specific status filter is provided
   */
  static createPrivacyWhereClause(): { status: { notIn: SubmissionStatus[] } } {
    return {
      status: { notIn: this.getPrivateStatuses() },
    };
  }

  /**
   * Create a Prisma where clause for specific statuses, excluding private ones
   * Used when authorities request specific statuses
   */
  static createFilteredStatusWhereClause(
    requestedStatuses: SubmissionStatus[],
  ): { status: { in: SubmissionStatus[] } } {
    const filteredStatuses = this.filterPrivateStatuses(requestedStatuses);
    return {
      status: { in: filteredStatuses },
    };
  }

  /**
   * Create a complete where clause for privacy protection
   * Handles both filtered and default cases
   */
  static createPrivacyProtectedWhereClause(
    requestedStatuses?: SubmissionStatus[],
  ): any {
    if (requestedStatuses && requestedStatuses.length > 0) {
      // User requested specific statuses - filter out private ones
      return this.createFilteredStatusWhereClause(requestedStatuses);
    } else {
      // No specific status requested - exclude all private statuses by default
      return this.createPrivacyWhereClause();
    }
  }

  /**
   * Validate that a status request is privacy-compliant
   * Throws error if private statuses are requested
   */
  static validateStatusRequest(requestedStatuses: SubmissionStatus[]): void {
    const privateStatuses = requestedStatuses.filter((status) =>
      this.isPrivateStatus(status),
    );
    if (privateStatuses.length > 0) {
      throw new Error(
        `Access denied: Private statuses cannot be accessed: ${privateStatuses.join(
          ', ',
        )}`,
      );
    }
  }

  /**
   * Check if a role should have privacy protection applied
   * ADMIN and SUPER_ADMIN roles have full access to all statuses
   */
  static shouldApplyPrivacyProtection(userRole: string): boolean {
    const rolesWithFullAccess = ['ADMIN', 'SUPER_ADMIN'];
    return !rolesWithFullAccess.includes(userRole);
  }

  /**
   * Create privacy-protected where clause based on user role
   * ADMIN and SUPER_ADMIN get full access, others get privacy protection
   */
  static createRoleBasedPrivacyWhereClause(
    userRole: string,
    requestedStatuses?: SubmissionStatus[],
  ): any {
    // Admin and Super Admin have full access
    if (!this.shouldApplyPrivacyProtection(userRole)) {
      if (requestedStatuses && requestedStatuses.length > 0) {
        return { status: { in: requestedStatuses } };
      }
      // No status filter - return empty where clause (no filtering)
      return {};
    }

    // Apply privacy protection for other roles
    return this.createPrivacyProtectedWhereClause(requestedStatuses);
  }

  /**
   * Get privacy statistics for monitoring
   */
  static getPrivacyStats(): {
    privateStatuses: SubmissionStatus[];
    publicStatuses: SubmissionStatus[];
    totalStatuses: number;
  } {
    return {
      privateStatuses: this.getPrivateStatuses(),
      publicStatuses: this.getPublicStatuses(),
      totalStatuses: this.PRIVATE_STATUSES.length + this.PUBLIC_STATUSES.length,
    };
  }
}
