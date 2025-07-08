import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isDifferent', async: false })
export class IsDifferent implements ValidatorConstraintInterface {
  validate(newPassword: string, args: ValidationArguments) {
    const { object } = args;
    return newPassword !== (object as any).oldPassword;
  }

  defaultMessage(args: ValidationArguments) {
    return 'New password must be different from the old password';
  }
}
