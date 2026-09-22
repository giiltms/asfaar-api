import { FormSubmissionsService } from '@modules/form-submissions/services/form-submissions.service';

/**
 * The gatehouse check-in modal showed a placeholder where the applicant's
 * face should be, while the agent client list showed a photo for the same
 * person. The gatehouse read only the NIN verification photo; the client list
 * reads the profile avatar. Applicants who have uploaded an avatar but not
 * completed NIN verification therefore appeared faceless at the gate.
 *
 * It now falls back to the avatar, and says which it is. A self-uploaded photo
 * is not evidence of identity, and gate staff must not mistake one for the
 * other.
 */
const buildService = (user: any) => {
  const prisma: any = {
    formSubmission: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'sub-1',
        referenceNumber: 'MA00126000007',
        status: 'SUBMITTED',
        createdAt: new Date(),
        user,
        form: {
          id: 'form-1',
          name: 'Morocco Visa',
          country: { id: 'c-1', name: 'Morocco', isoCode2: 'MA' },
        },
        appointment: null,
      }),
    },
  };

  return new FormSubmissionsService(prisma, {} as any);
};

const baseUser = {
  firstName: 'ANDREW',
  lastName: 'BASSEY',
  email: 'andrew@example.com',
  phone: '080',
  nin: null,
  ninVerified: false,
  avatar: null,
  ninVerifications: [],
};

const applicantFor = async (user: any) =>
  (await buildService(user).getApplicantInfoByReference('MA00126000007'))
    .applicant;

describe('gatehouse applicant photo', () => {
  it('prefers the NIN verification photo, which is evidence of identity', async () => {
    const applicant = await applicantFor({
      ...baseUser,
      avatar: 'https://cdn/avatar.png',
      ninVerifications: [{ photo: 'nin-photo-base64', nin: '123' }],
    });

    expect(applicant.photo).toBe('nin-photo-base64');
    expect(applicant.photoSource).toBe('NIN');
  });

  it('falls back to the profile avatar so the gate is not left blind', async () => {
    const applicant = await applicantFor({
      ...baseUser,
      avatar: 'https://cdn/avatar.png',
    });

    expect(applicant.photo).toBe('https://cdn/avatar.png');
    expect(applicant.photoSource).toBe('PROFILE');
  });

  it('marks the fallback as unverified, so it is not taken for identity proof', async () => {
    const applicant = await applicantFor({
      ...baseUser,
      avatar: 'https://cdn/avatar.png',
    });

    // The distinction is the whole point: gate staff decide what to trust.
    expect(applicant.photoSource).not.toBe('NIN');
  });

  it('reports no photo when the applicant has neither', async () => {
    const applicant = await applicantFor(baseUser);

    expect(applicant.photo).toBeNull();
    expect(applicant.photoSource).toBeNull();
  });

  it('ignores an empty avatar string', async () => {
    const applicant = await applicantFor({ ...baseUser, avatar: '' });

    expect(applicant.photo).toBeNull();
    expect(applicant.photoSource).toBeNull();
  });
});
