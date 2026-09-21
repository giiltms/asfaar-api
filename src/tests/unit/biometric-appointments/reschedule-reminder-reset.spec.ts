import { BiometricAppointmentsService } from '@modules/biometric-appointments/biometric-appointments.service';

/**
 * reminderSent is a once-per-appointment flag. When an appointment moves to a
 * new date the old reminder no longer describes it, so the flag has to clear
 * or the applicant is never reminded about the date they will actually attend.
 */
describe('rescheduleAppointment reminder reset', () => {
  const buildService = () => {
    const prisma = {
      biometricAppointment: {
        update: jest.fn().mockResolvedValue({ id: 'appt-1' }),
      },
    };

    const service = new BiometricAppointmentsService(
      prisma as any,
      {} as any,
      { findCenterById: jest.fn() } as any,
    );

    jest.spyOn(service, 'findAppointmentById').mockResolvedValue({
      id: 'appt-1',
      status: 'ACTIVE',
      centerId: 'center-1',
      appointmentTime: new Date('2026-09-29T08:00:00Z'),
      originalAppointmentDate: null,
    } as any);

    // Slot validation has its own cover; this test is about the written data.
    jest
      .spyOn(service as any, 'validateAppointmentDateTime')
      .mockResolvedValue(undefined);

    return { service, prisma };
  };

  it('clears the reminder flag so the new date gets its own reminder', async () => {
    const { service, prisma } = buildService();

    await service.rescheduleAppointment('appt-1', {
      appointmentDate: '2026-10-06',
      appointmentTime: '2026-10-06T09:30:00Z',
      rescheduleReason: 'Center maintenance',
    } as any);

    const data = prisma.biometricAppointment.update.mock.calls[0][0].data;

    expect(data.reminderSent).toBe(false);
    expect(data.reminderSentAt).toBeNull();
    // And it is still a reschedule in every other respect.
    expect(data.status).toBe('RESCHEDULED');
    expect(data.appointmentTime).toEqual(new Date('2026-10-06T09:30:00Z'));
  });
});
