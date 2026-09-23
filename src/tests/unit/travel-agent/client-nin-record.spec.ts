import { NinVerificationService } from '@shared/services/nin-verification/nin-verification.service';
import { TravelAgentClientsService } from '@modules/travel-agent/travel-agent-clients.service';

/**
 * A verified NIN lives in nin_verifications; that is where the verification
 * officer's NIMC photo, the client profile and the gatehouse read it from.
 * The NIN lookup only parks its result in TempNINData, so every path that
 * marks a user ninVerified has to move the result across.
 */
const tempNin = {
  id: 'temp-1',
  nin: '57677376964',
  firstName: 'MARTHA',
  middleName: null,
  lastName: 'BITRUS',
  fullName: 'MARTHA BITRUS',
  dateOfBirth: '1990-01-01',
  gender: 'FEMALE',
  phoneNumber: '08000000000',
  verifiedPhoneNumber: null,
  photo: 'data:image/jpeg;base64,AAAA',
  addressLine1: '1 Road',
  addressLine2: null,
  city: 'Abuja',
  state: 'FCT',
  lga: 'AMAC',
  postalCode: null,
  country: 'Nigeria',
  birthState: null,
  birthLga: null,
  verificationId: 'yv-1',
  trackingId: 'trk-1',
  verificationDate: new Date('2026-09-20T19:14:26Z'),
  rawData: {},
};

describe('NinVerificationService.linkTempNinToUser', () => {
  const buildService = (found: unknown) => {
    const tx = {
      tempNINData: {
        findUnique: jest.fn().mockResolvedValue(found),
        delete: jest.fn(),
      },
      ninVerification: { create: jest.fn() },
    };
    const prisma = { ...tx, $transaction: jest.fn((fn) => fn(tx)) };
    const service = new NinVerificationService(prisma as any, {} as any);
    return { service, tx };
  };

  it('saves the verification, photo included, and clears the temp row', async () => {
    const { service, tx } = buildService(tempNin);

    await service.linkTempNinToUser('temp-1', 'user-1');

    const data = tx.ninVerification.create.mock.calls[0][0].data;
    expect(data.userId).toBe('user-1');
    expect(data.nin).toBe('57677376964');
    expect(data.photo).toBe('data:image/jpeg;base64,AAAA');
    expect(data.verificationStatus).toBe('VERIFIED');
    expect(tx.tempNINData.delete).toHaveBeenCalledWith({
      where: { id: 'temp-1' },
    });
  });

  it('refuses an unknown temp row', async () => {
    const { service, tx } = buildService(null);

    await expect(service.linkTempNinToUser('nope', 'user-1')).rejects.toThrow(
      /Invalid or expired NIN verification/,
    );
    expect(tx.ninVerification.create).not.toHaveBeenCalled();
  });
});

describe('TravelAgentClientsService.createClient for a new applicant', () => {
  it('records the NIN verification against the new account', async () => {
    const prisma = {
      user: { findFirst: jest.fn().mockResolvedValue(null) },
      travelAgentClient: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };
    const ninVerificationService = {
      verifyNin: jest.fn().mockResolvedValue({
        success: true,
        tempNinId: 'temp-1',
        data: {
          nin: tempNin.nin,
          firstName: 'MARTHA',
          lastName: 'BITRUS',
          dateOfBirth: '1990-01-01',
          gender: 'FEMALE',
          photo: tempNin.photo,
          address: { state: 'FCT', lga: 'AMAC' },
        },
      }),
      linkTempNinToUser: jest.fn(),
    };
    const userService = {
      createUser: jest.fn().mockResolvedValue({ id: 'user-1' }),
    };

    const service = new TravelAgentClientsService(
      prisma as any,
      ninVerificationService as any,
      userService as any,
    );
    jest.spyOn(service, 'getClient').mockResolvedValue({} as any);

    await service.createClient('agent-1', {
      nin: '57677376964',
      dateOfBirth: '1990-01-01',
      email: 'mimi@example.com',
    } as any);

    expect(ninVerificationService.linkTempNinToUser).toHaveBeenCalledWith(
      'temp-1',
      'user-1',
    );
  });
});
