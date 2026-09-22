import { UserContextService } from '@common/services/user-context.service';

/**
 * Fingerprint capture refused any operator without a booth, answering
 * "No active booth or center assignment found. Please ensure you are assigned
 * to a booth or managing a center." - while only ever checking booths. An
 * operator staffing a center but not yet pinned to a booth satisfied the
 * message's second half and was still turned away.
 *
 * The booth only supplies a location string on the capture record; it is not a
 * foreign key. So a center is enough to proceed, and no booth is invented - the
 * location simply records the center.
 */
const CENTER = {
  id: 'center-1',
  name: 'ASFAAR-ABUJA HQ',
  code: 'ASF-ABJ',
  address: '14 Yedseram Street',
  city: 'Abuja',
  state: 'FCT',
};

const buildService = ({
  booth = null,
  centers = [],
}: { booth?: any; centers?: any[] } = {}) => {
  const prisma: any = {
    booth: { findFirst: jest.fn().mockResolvedValue(booth) },
    user: {
      findUnique: jest.fn().mockResolvedValue({ biometricCenters: centers }),
    },
  };

  return new UserContextService(prisma);
};

describe('getUserActiveBoothContext', () => {
  it('uses the operator\'s booth when they have one', async () => {
    const service = buildService({
      booth: {
        id: 'booth-1',
        boothNumber: 'A1',
        appointmentClass: 'REGULAR',
        center: CENTER,
      },
    });

    const context = await service.getUserActiveBoothContext('user-1');

    expect(context).toMatchObject({
      boothId: 'booth-1',
      boothNumber: 'A1',
      centerName: 'ASFAAR-ABUJA HQ',
    });
  });

  it('falls back to the single center the operator staffs', async () => {
    const service = buildService({ booth: null, centers: [CENTER] });

    const context = await service.getUserActiveBoothContext('user-1');

    expect(context).toMatchObject({
      centerId: 'center-1',
      centerName: 'ASFAAR-ABUJA HQ',
    });
    // No booth is invented.
    expect(context?.boothNumber).toBe('');
  });

  it('refuses when the operator staffs several centers', async () => {
    // Which one they are standing in is unknowable, and guessing would
    // mislabel where the capture happened.
    const service = buildService({
      booth: null,
      centers: [CENTER, { ...CENTER, id: 'center-2', name: 'ASFAAR-KANO' }],
    });

    await expect(
      service.getUserActiveBoothContext('user-1'),
    ).resolves.toBeNull();
  });

  it('refuses when the operator has neither booth nor center', async () => {
    const service = buildService({ booth: null, centers: [] });

    await expect(
      service.getUserActiveBoothContext('user-1'),
    ).resolves.toBeNull();
  });
});

describe('formatLocationString', () => {
  const service = buildService();

  it('names the booth when there is one', () => {
    expect(
      service.formatLocationString({
        boothNumber: 'A1',
        centerName: 'ASFAAR-ABUJA HQ',
      } as any),
    ).toBe('ASFAAR-ABUJA HQ - Booth A1');
  });

  it('names the center alone when no booth is assigned', () => {
    expect(
      service.formatLocationString({
        boothNumber: '',
        centerName: 'ASFAAR-ABUJA HQ',
      } as any),
    ).toBe('ASFAAR-ABUJA HQ');
  });
});
