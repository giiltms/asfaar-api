import { FormSubmissionsService } from '@modules/form-submissions/services/form-submissions.service';

/**
 * The submission DTO advertises biometricAppointment.appointmentDate - the
 * create endpoint even requires it - but the read mapping never populated it,
 * because the database stores a single appointmentTime instant and nothing
 * derived the date from it.
 *
 * Consumers that trusted the contract therefore saw an appointment as unset
 * even when one existed: the application preview and the generated application
 * document both gate on appointmentDate being present.
 */
const buildService = () => new FormSubmissionsService({} as any, {} as any);

const submissionWith = (appointment: any) => ({
  id: 'sub-1',
  formId: 'form-1',
  userId: 'user-1',
  status: 'SUBMITTED',
  responses: [],
  form: {
    id: 'form-1',
    name: 'Morocco Visa',
    description: null,
    applicationType: null,
    country: null,
    serviceFees: [],
  },
  user: { id: 'user-1', firstName: 'Amina', lastName: 'Bello' },
  appointment,
});

const mapIt = async (appointment: any) =>
  (
    await (buildService() as any).mapToSubmissionDto(
      submissionWith(appointment),
    )
  ).biometricAppointment;

describe('submission DTO biometric appointment', () => {
  const appointment = {
    id: 'appt-1',
    centerId: 'center-1',
    center: { name: 'ASFAAR-ABUJA HQ' },
    appointmentTime: new Date('2026-10-06T09:30:00Z'),
    status: 'ACTIVE',
    appointmentClass: 'REGULAR',
  };

  it('reports a booked appointment with both the instant and the date', async () => {
    const dto = await mapIt(appointment);

    expect(dto).toMatchObject({
      id: 'appt-1',
      centerName: 'ASFAAR-ABUJA HQ',
      status: 'ACTIVE',
      appointmentTime: appointment.appointmentTime,
      appointmentDate: '2026-10-06',
    });
  });

  it('dates the appointment where the center is, not in UTC', async () => {
    // 23:30 UTC is already the next day in Lagos; using the UTC date would
    // show the applicant the wrong day.
    const dto = await mapIt({
      ...appointment,
      appointmentTime: new Date('2026-10-06T23:30:00Z'),
    });

    expect(dto.appointmentDate).toBe('2026-10-07');
  });

  it('leaves the date empty when no time has been set yet', async () => {
    const dto = await mapIt({ ...appointment, appointmentTime: null });

    expect(dto.appointmentDate).toBe('');
  });

  it('reports no appointment when none is booked', async () => {
    expect(await mapIt(null)).toBeUndefined();
  });
});
