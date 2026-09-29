import { BiometricAppointmentsService } from '@modules/biometric-appointments/biometric-appointments.service';

/**
 * Applicants imported from AGIC have their biometrics sent back to AGIC.
 * Completing capture is what starts that.
 */
describe('completing biometric capture', () => {
  const build = (agicSync?: any) => {
    const tx: any = {
      biometricAppointment: {
        update: jest
          .fn()
          .mockResolvedValue({ submission: { status: 'SUBMITTED' } }),
      },
      formSubmission: { update: jest.fn().mockResolvedValue({}) },
      queueEntry: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const prisma: any = {
      biometricData: {
        findUnique: jest.fn().mockResolvedValue({ photoUrl: '/uploads/p.jpg' }),
      },
      $transaction: jest.fn((fn: any) => fn(tx)),
    };
    const service = new BiometricAppointmentsService(
      prisma,
      {} as any,
      {} as any,
      agicSync,
    );
    jest.spyOn(service as any, 'findAppointmentById').mockResolvedValue({
      id: 'appt-1',
      status: 'AT_BOOTH',
      submissionId: 'sub-1',
    });
    return service;
  };

  it('hands the submission to the AGIC sync', async () => {
    const agicSync = { onCaptureCompleted: jest.fn() };
    await build(agicSync).completeBiometricCapture(
      'appt-1',
      { captureQuality: 'GOOD' } as any,
      'agent-1',
    );
    expect(agicSync.onCaptureCompleted).toHaveBeenCalledWith('sub-1');
  });

  it('completes as before where the AGIC module is absent', async () => {
    await expect(
      build(undefined).completeBiometricCapture('appt-1', {} as any, 'agent-1'),
    ).resolves.toBeTruthy();
  });
});
