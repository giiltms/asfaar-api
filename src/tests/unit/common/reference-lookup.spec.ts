import {
  normalizeReference,
  referenceSearchConditions,
  submissionByReferenceWhere,
} from '@common/utils/reference-lookup.util';
import { BiometricAppointmentsService } from '@modules/biometric-appointments/biometric-appointments.service';

/**
 * An AGIC applicant can be looked up by their ASFAAR reference, the AGIC
 * appointment number on their slip, or their AGIC application number - so
 * the biometric app finds them whichever one is typed in.
 */
describe('submissionByReferenceWhere', () => {
  it('matches the ASFAAR reference or either AGIC number, trimmed and upper-cased', () => {
    expect(submissionByReferenceWhere('  agic-bio-260929-62acf5 ')).toEqual({
      OR: [
        { referenceNumber: 'AGIC-BIO-260929-62ACF5' },
        { agicImport: { appointmentNumber: 'AGIC-BIO-260929-62ACF5' } },
        { agicImport: { applicationNumber: 'AGIC-BIO-260929-62ACF5' } },
        {
          agicImport: {
            agicData: {
              path: ['previousAppointmentNumbers'],
              array_contains: ['AGIC-BIO-260929-62ACF5'],
            },
          },
        },
      ],
    });
  });

  it('copes with a missing value', () => {
    expect(normalizeReference(undefined as any)).toBe('');
  });
});

describe('referenceSearchConditions', () => {
  it('searches the ASFAAR reference and both AGIC numbers', () => {
    expect(referenceSearchConditions(' 62ACF5 ')).toEqual([
      { referenceNumber: { contains: '62ACF5', mode: 'insensitive' } },
      {
        agicImport: {
          appointmentNumber: { contains: '62ACF5', mode: 'insensitive' },
        },
      },
      {
        agicImport: {
          applicationNumber: { contains: '62ACF5', mode: 'insensitive' },
        },
      },
    ]);
  });
});

describe('BiometricAppointmentsService.findAppointmentByReferenceNumber', () => {
  const build = () => {
    const prisma: any = {
      biometricAppointment: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'appt-1', submission: {} }),
      },
    };
    const service = new BiometricAppointmentsService(
      prisma,
      {} as any,
      {} as any,
    );
    return { service, prisma };
  };

  it('looks the appointment up by any of the three numbers', async () => {
    const { service, prisma } = build();

    await service
      .findAppointmentByReferenceNumber('2609202055595142')
      .catch(() => undefined);

    const { where } = prisma.biometricAppointment.findFirst.mock.calls[0][0];
    expect(where.submission).toEqual(
      submissionByReferenceWhere('2609202055595142'),
    );
    expect(where.userId).toBeUndefined();
  });

  it('still limits non-staff to their own appointment', async () => {
    const { service, prisma } = build();

    await service
      .findAppointmentByReferenceNumber('AGIC-BIO-1', 'user-1')
      .catch(() => undefined);

    const { where } = prisma.biometricAppointment.findFirst.mock.calls[0][0];
    expect(where.userId).toBe('user-1');
  });
});
