import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
class IsServiceYearConstraint implements ValidatorConstraintInterface {
  validate(year: string, args: ValidationArguments) {
    const currentYear = new Date().getFullYear();
    const serviceYear = parseInt(year, 10);
    return (
      !isNaN(serviceYear) &&
      serviceYear >= currentYear - 1 &&
      serviceYear <= currentYear
    );
  }

  defaultMessage(args: ValidationArguments) {
    return 'Service year must be a valid year between last year and this year';
  }
}

export function IsServiceYear(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsServiceYearConstraint,
    });
  };
}
