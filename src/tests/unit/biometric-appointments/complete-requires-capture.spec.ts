import { BadRequestException } from '@nestjs/common';
import { BiometricAppointmentsService } from '@modules/biometric-appointments/biometric-appointments.service';

/**
 * Completing a capture moves the application to UNDER_REVIEW and tells the
 * applicant their biometrics are done. If nothing was actually captured, the
 * verification officer receives an application with no photo to check, so
 * completion must refuse until the photo has been saved against the
 * submission.
 */
describe('completeBiometricCapture requires captured biometrics', () => {
  const buildService = (biometricData: unknown) => {
    const tx = {
      biometricAppointment: {
        update: jest.fn().mockResolvedValue({ id: 'appt-1', submission: null }),
      },
      formSubmission: { update: jest.fn() },
      queueEntry: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const prisma = {
      biometricData: {
        findUnique: jest.fn().mockResolvedValue(biometricData),
      },
      $transaction: jest.fn((fn) => fn(tx)),
    };

    const service = new BiometricAppointmentsService(
      prisma as any,
      {} as any,
      { findCenterById: jest.fn() } as any,
    );

    jest.spyOn(service, 'findAppointmentById').mockResolvedValue({
      id: 'appt-1',
      status: 'AT_BOOTH',
      submissionId: 'sub-1',
    } as any);

    return { service, prisma, tx };
  };

  it('refuses when no biometric data was saved for the submission', async () => {
    const { service, prisma } = buildService(null);

    await expect(
      service.completeBiometricCapture('appt-1', {} as any, 'operator-1'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuses when a record exists but the photo was never saved', async () => {
    const { service, prisma } = buildService({ id: 'bd-1', photoUrl: null });

    await expect(
      service.completeBiometricCapture('appt-1', {} as any, 'operator-1'),
    ).rejects.toThrow(/photo/i);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('completes once the photo is saved', async () => {
    const { service, tx } = buildService({
      id: 'bd-1',
      photoUrl: 'biometric-photos/photo.png',
    });

    await service.completeBiometricCapture('appt-1', {} as any, 'operator-1');

    expect(tx.formSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub-1' },
        data: expect.objectContaining({ biometricCompleted: true }),
      }),
    );
  });
});
