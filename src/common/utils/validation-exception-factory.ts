import { ValidationError } from 'class-validator';
import { BadRequestException } from '@nestjs/common';

export default function validationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  const errorMessages = errors.map((error) => {
    const constraints = error.constraints;
    if (constraints) {
      return Object.values(constraints).join(', ');
    }
    return 'Validation failed';
  });

  return new BadRequestException({
    message: 'Validation failed',
    errors: errorMessages,
  });
}
