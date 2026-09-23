import { NotFoundException } from '@nestjs/common';
import { DashboardVerificationService } from '@modules/dashboard-verification/dashboard-verification.service';

/**
 * The review list shows every submission marked biometricCompleted, so the
 * detail view must open for each of them. A submission whose capture never
 * saved anything still has to reach the officer — they are the one who can
 * query it or send it back — so missing biometrics is reported, not thrown.
 */
describe('getApplicationForReview without biometric data', () => {
  const submission = {
    id: 'sub-1',
    referenceNumber: 'MA00126000001',
    status: 'UNDER_REVIEW',
    submittedAt: new Date('2026-09-20T10:00:00Z'),
    user: {
      id: 'user-1',
      firstName: 'Ada',
      lastName: 'Obi',
      email: 'ada@example.com',
      phone: null,
      nin: '12345678901',
      ninVerified: true,
      dateOfBirth: null,
      gender: 'FEMALE',
      state: 'Lagos',
      lga: 'Ikeja',
      avatar: null,
      ninVerifications: [],
    },
    form: { id: 'form-1', name: 'Morocco Visa', country: null },
    responses: [],
    appointment: null,
    biometricData: null,
  };

  const buildService = (found: unknown) => {
    const prisma = {
      formSubmission: { findUnique: jest.fn().mockResolvedValue(found) },
      user: { findUnique: jest.fn() },
    };
    return new DashboardVerificationService(prisma as any, {} as any);
  };

  it('returns the application with biometricData null', async () => {
    const service = buildService(submission);

    const result = await service.getApplicationForReview('sub-1');

    expect(result.submissionId).toBe('sub-1');
    expect(result.applicant.firstName).toBe('Ada');
    expect(result.biometricData).toBeNull();
  });

  it('answers 404, not 500, for an unknown submission', async () => {
    const service = buildService(null);

    await expect(service.getApplicationForReview('nope')).rejects.toThrow(
      NotFoundException,
    );
  });
});
