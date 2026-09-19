import { BadRequestException } from '@nestjs/common';
import { FieldType } from '@prisma/client';
import { FormSubmissionsService } from '@modules/form-submissions/services/form-submissions.service';

/**
 * Regression tests for the repeatable-group template validation bug.
 *
 * Repeatable groups (e.g. "Previous Visas List") persist their fields as
 * templates whose `name` still contains the unexpanded "{{index}}" placeholder
 * (e.g. "previousVisa_{{index}}_date"). Those templates are not concrete
 * answerable fields, so submit-time validation must skip them. Previously they
 * were validated as ordinary required fields, so a submission blocked with
 * "The field 'Date' is required..." / "Invalid option..." once the parent toggle
 * (hasPreviousVisas) was enabled.
 */
describe('FormSubmissionsService.validateSubmission — repeatable templates', () => {
  // validateSubmission is pure (form + responses in-memory); deps are unused.
  const service = new FormSubmissionsService({} as any, {} as any);
  const validate = (form: any, responses: any[]) =>
    (service as any).validateSubmission(form, responses);

  const form = (fields: any[]) => ({ sections: [{ groups: [{ fields }] }] });

  const firstName = {
    id: 'f-firstName',
    name: 'firstName',
    label: 'First Name',
    type: FieldType.TEXT,
    required: true,
  };
  const prevVisaDate = {
    id: 'f-prevVisaDate',
    name: 'previousVisa_{{index}}_date',
    label: 'Date',
    type: FieldType.DATE,
    required: true,
  };
  const childDob = {
    id: 'f-childDob',
    name: 'child_{{index}}_dateOfBirth',
    label: 'Date de Naissance / Date of Birth',
    type: FieldType.DATE,
    required: true,
  };

  it('does not block submission on empty repeatable "{{index}}" template fields', async () => {
    await expect(
      validate(form([firstName, prevVisaDate, childDob]), [
        { fieldId: 'f-firstName', value: 'Usman' },
      ]),
    ).resolves.toBeUndefined();
  });

  it('still enforces genuinely required non-template fields', async () => {
    await expect(
      validate(form([firstName, prevVisaDate]), []),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
