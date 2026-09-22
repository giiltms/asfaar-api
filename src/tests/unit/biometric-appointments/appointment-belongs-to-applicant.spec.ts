import { BadRequestException } from '@nestjs/common';
import { BiometricAppointmentsService } from '@modules/biometric-appointments/biometric-appointments.service';

/**
 * A biometric appointment belongs to the person attending it - the applicant -
 * not to whoever filed the form. Storing the caller instead meant every screen
 * that joins through appointment.user (the queue, front desk, gatehouse,
 * calendar) showed the travel agent's name against their client's slot.
 */
const APPLICANT = 'applicant-1';
const AGENT = 'agent-1';
const STRANGER = 'stranger-1';

const buildService = ({
  travelAgentId = null,
}: { travelAgentId?: string | null } = {}) => {
  const created = { id: 'appt-1', submission: { referenceNumber: 'SA1' } };

  const prisma: any = {
    formSubmission: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'sub-1',
        userId: APPLICANT,
        travelAgentId,
        referenceNumber: 'SA1',
        payment: { status: 'COMPLETED' },
      }),
    },
    biometricAppointment: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(created),
    },
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
  };

  const centers = {
    findCenterById: jest.fn().mockResolvedValue({ id: 'c-1', name: 'C', isActive: true }),
    checkCenterAvailability: jest.fn().mockResolvedValue(true),
  };

  const service = new BiometricAppointmentsService(
    prisma,
    {} as any,
    centers as any,
  );

  jest
    .spyOn(service as any, 'validateAppointmentDateTime')
    .mockResolvedValue(undefined);

  return { service, prisma };
};

const dto: any = {
  submissionId: 'sub-1',
  centerId: 'c-1',
  appointmentDate: '2026-10-06',
  appointmentTime: '2026-10-06T09:30:00Z',
  confirmationAcknowledged: true,
  consentAcknowledged: true,
  termsAcknowledged: true,
};

describe('createAppointment ownership', () => {
  it('records the applicant as the appointment holder when they book themselves', async () => {
    const { service, prisma } = buildService();

    await service.createAppointment(dto, APPLICANT);

    expect(prisma.biometricAppointment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          user: { connect: { id: APPLICANT } },
        }),
      }),
    );
  });

  it('records the applicant, not the agent, when an agent books for their client', async () => {
    const { service, prisma } = buildService({ travelAgentId: AGENT });

    await service.createAppointment(dto, AGENT);

    expect(prisma.biometricAppointment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          user: { connect: { id: APPLICANT } },
        }),
      }),
    );
  });

  it('lets the managing travel agent book at all', async () => {
    const { service } = buildService({ travelAgentId: AGENT });

    // Previously refused outright: the check compared the caller to the
    // submission owner, which an agent never is.
    await expect(service.createAppointment(dto, AGENT)).resolves.toBeDefined();
  });

  it('refuses someone unconnected to the submission', async () => {
    const { service } = buildService({ travelAgentId: AGENT });

    await expect(service.createAppointment(dto, STRANGER)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('refuses an agent who does not manage this submission', async () => {
    const { service } = buildService({ travelAgentId: AGENT });

    await expect(
      service.createAppointment(dto, 'other-agent'),
    ).rejects.toThrow(BadRequestException);
  });
});
