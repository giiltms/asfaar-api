import { Test, TestingModule } from '@nestjs/testing';
import { PrivacyService } from '../privacy.service';
import { SubmissionStatus } from '@prisma/client';

describe('PrivacyService', () => {
  let service: PrivacyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrivacyService],
    }).compile();

    service = module.get<PrivacyService>(PrivacyService);
  });

  describe('getPrivateStatuses', () => {
    it('should return all private statuses', () => {
      const privateStatuses = PrivacyService.getPrivateStatuses();

      expect(privateStatuses).toContain(SubmissionStatus.DRAFT);
      expect(privateStatuses).toContain(SubmissionStatus.PENDING_PAYMENT);
      expect(privateStatuses).toContain(SubmissionStatus.CANCELLED);
      expect(privateStatuses).toHaveLength(3);
    });
  });

  describe('getPublicStatuses', () => {
    it('should return all public statuses', () => {
      const publicStatuses = PrivacyService.getPublicStatuses();

      expect(publicStatuses).toContain(SubmissionStatus.SUBMITTED);
      expect(publicStatuses).toContain(SubmissionStatus.UNDER_REVIEW);
      expect(publicStatuses).toContain(SubmissionStatus.APPROVED);
      expect(publicStatuses).toContain(SubmissionStatus.REJECTED);
      expect(publicStatuses.length).toBeGreaterThan(3);
    });
  });

  describe('isPrivateStatus', () => {
    it('should return true for private statuses', () => {
      expect(PrivacyService.isPrivateStatus(SubmissionStatus.DRAFT)).toBe(true);
      expect(
        PrivacyService.isPrivateStatus(SubmissionStatus.PENDING_PAYMENT),
      ).toBe(true);
      expect(PrivacyService.isPrivateStatus(SubmissionStatus.CANCELLED)).toBe(
        true,
      );
    });

    it('should return false for public statuses', () => {
      expect(PrivacyService.isPrivateStatus(SubmissionStatus.SUBMITTED)).toBe(
        false,
      );
      expect(
        PrivacyService.isPrivateStatus(SubmissionStatus.UNDER_REVIEW),
      ).toBe(false);
      expect(PrivacyService.isPrivateStatus(SubmissionStatus.APPROVED)).toBe(
        false,
      );
    });
  });

  describe('filterPrivateStatuses', () => {
    it('should filter out private statuses from mixed list', () => {
      const mixedStatuses = [
        SubmissionStatus.DRAFT,
        SubmissionStatus.SUBMITTED,
        SubmissionStatus.PENDING_PAYMENT,
        SubmissionStatus.UNDER_REVIEW,
        SubmissionStatus.CANCELLED,
      ];

      const filtered = PrivacyService.filterPrivateStatuses(mixedStatuses);

      expect(filtered).toContain(SubmissionStatus.SUBMITTED);
      expect(filtered).toContain(SubmissionStatus.UNDER_REVIEW);
      expect(filtered).not.toContain(SubmissionStatus.DRAFT);
      expect(filtered).not.toContain(SubmissionStatus.PENDING_PAYMENT);
      expect(filtered).not.toContain(SubmissionStatus.CANCELLED);
    });

    it('should return empty array if all statuses are private', () => {
      const privateStatuses = [
        SubmissionStatus.DRAFT,
        SubmissionStatus.PENDING_PAYMENT,
        SubmissionStatus.CANCELLED,
      ];

      const filtered = PrivacyService.filterPrivateStatuses(privateStatuses);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('createPrivacyWhereClause', () => {
    it('should create where clause that excludes private statuses', () => {
      const whereClause = PrivacyService.createPrivacyWhereClause();

      expect(whereClause).toEqual({
        status: { notIn: PrivacyService.getPrivateStatuses() },
      });
    });
  });

  describe('createFilteredStatusWhereClause', () => {
    it('should create where clause with filtered statuses', () => {
      const requestedStatuses = [
        SubmissionStatus.DRAFT,
        SubmissionStatus.SUBMITTED,
        SubmissionStatus.UNDER_REVIEW,
      ];

      const whereClause =
        PrivacyService.createFilteredStatusWhereClause(requestedStatuses);

      expect(whereClause).toEqual({
        status: {
          in: [SubmissionStatus.SUBMITTED, SubmissionStatus.UNDER_REVIEW],
        },
      });
    });
  });

  describe('createPrivacyProtectedWhereClause', () => {
    it('should create privacy where clause when no statuses requested', () => {
      const whereClause = PrivacyService.createPrivacyProtectedWhereClause();

      expect(whereClause).toEqual({
        status: { notIn: PrivacyService.getPrivateStatuses() },
      });
    });

    it('should create filtered where clause when statuses requested', () => {
      const requestedStatuses = [
        SubmissionStatus.DRAFT,
        SubmissionStatus.SUBMITTED,
        SubmissionStatus.UNDER_REVIEW,
      ];

      const whereClause =
        PrivacyService.createPrivacyProtectedWhereClause(requestedStatuses);

      expect(whereClause).toEqual({
        status: {
          in: [SubmissionStatus.SUBMITTED, SubmissionStatus.UNDER_REVIEW],
        },
      });
    });
  });

  describe('validateStatusRequest', () => {
    it('should not throw error for public statuses', () => {
      const publicStatuses = [
        SubmissionStatus.SUBMITTED,
        SubmissionStatus.UNDER_REVIEW,
        SubmissionStatus.APPROVED,
      ];

      expect(() =>
        PrivacyService.validateStatusRequest(publicStatuses),
      ).not.toThrow();
    });

    it('should throw error for private statuses', () => {
      const privateStatuses = [
        SubmissionStatus.DRAFT,
        SubmissionStatus.PENDING_PAYMENT,
        SubmissionStatus.CANCELLED,
      ];

      expect(() =>
        PrivacyService.validateStatusRequest(privateStatuses),
      ).toThrow();
    });

    it('should throw error for mixed statuses with private ones', () => {
      const mixedStatuses = [
        SubmissionStatus.SUBMITTED,
        SubmissionStatus.DRAFT,
        SubmissionStatus.UNDER_REVIEW,
      ];

      expect(() =>
        PrivacyService.validateStatusRequest(mixedStatuses),
      ).toThrow();
    });
  });

  describe('getPrivacyStats', () => {
    it('should return privacy statistics', () => {
      const stats = PrivacyService.getPrivacyStats();

      expect(stats).toHaveProperty('privateStatuses');
      expect(stats).toHaveProperty('publicStatuses');
      expect(stats).toHaveProperty('totalStatuses');
      expect(stats.privateStatuses).toHaveLength(3);
      expect(stats.totalStatuses).toBeGreaterThan(3);
    });
  });
});
