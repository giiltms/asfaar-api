import { ForbiddenException } from '@nestjs/common';
import { ApplicationsController } from '@modules/form-submissions/applications.controller';

/**
 * The gatehouse lookup returns an applicant's photo, phone and appointment,
 * and accepts AGIC numbers that are easy to guess, so only gate staff may
 * use it.
 */
describe('ApplicationsController.getApplicantByReference', () => {
  const build = () => {
    const service: any = {
      getApplicantInfoByReference: jest.fn().mockResolvedValue({ id: 'x' }),
    };
    return { controller: new ApplicationsController(service), service };
  };

  it.each(['APPLICANT', 'AGENCY', 'FINANCE'])('refuses %s', async (role) => {
    const { controller, service } = build();
    await expect(
      controller.getApplicantByReference('2609202055595142', {
        roles: [role],
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.getApplicantInfoByReference).not.toHaveBeenCalled();
  });

  it.each(['GATEHOUSE', 'RECEPTIONIST', 'CENTER_MANAGER', 'ADMIN'])(
    'lets %s look an applicant up',
    async (role) => {
      const { controller } = build();
      await expect(
        controller.getApplicantByReference('SA00126000001', {
          roles: [role],
        } as any),
      ).resolves.toMatchObject({ success: true });
    },
  );
});
