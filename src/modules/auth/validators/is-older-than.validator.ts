import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import * as moment from 'moment';

@ValidatorConstraint({ async: false })
class IsOlderThanConstraint implements ValidatorConstraintInterface {
  validate(date: string, args: ValidationArguments) {
    const [minAge] = args.constraints;
    return moment().diff(moment(date, 'YYYY-MM-DD'), 'years') >= minAge;
  }

  defaultMessage(args: ValidationArguments) {
    const [minAge] = args.constraints;
    return `Date of birth must be at least ${minAge} years ago`;
  }
}

export function IsOlderThan(
  minAge: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [minAge],
      validator: IsOlderThanConstraint,
    });
  };
}
