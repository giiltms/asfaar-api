import { BadRequestException } from '@nestjs/common';

export class ValidationException extends BadRequestException {
  constructor(
    message = 'Validation failed',
    public readonly validationErrors: any[],
  ) {
    super({
      success: false,
      error: {
        code: 400001,
        message,
        details: validationErrors,
      },
    });
  }
}
