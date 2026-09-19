import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { INTERNAL_SERVER_ERROR } from 'src/common';

// Error constants are written as `<status><3 digits>: <message>` (e.g.
// '404011: Applicant not found'), so a bare status maps to its own code.
const CODED_MESSAGE = /^(\d{6}):\s*(.+)$/;

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    const status: number = exception.getStatus
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawMessage = exception?.response?.message;

    // ValidationPipe reports one message per failed constraint. Keep the list
    // intact for `details` — it is the only place the field names survive.
    const validationErrors = Array.isArray(rawMessage) ? rawMessage : null;

    let errorMessage: string;
    if (validationErrors) {
      errorMessage = validationErrors.join(', ');
    } else if (typeof rawMessage === 'string') {
      errorMessage = rawMessage;
    } else if (rawMessage) {
      errorMessage = String(rawMessage);
    } else {
      errorMessage = INTERNAL_SERVER_ERROR;
    }

    const coded = CODED_MESSAGE.exec(errorMessage.trim());

    const exceptionResponse = {
      success: false,
      error: {
        // Fall back to the status' own code rather than assuming a 500: a
        // validation failure is a 400, not an internal error.
        code: coded ? parseInt(coded[1], 10) : status * 1000,
        message: coded ? coded[2].trim() : errorMessage.trim(),
        details: validationErrors ?? exception?.response?.error,
      },
    };

    // Log the response payload, not the exception. HttpException only copies
    // `response.message` onto `.message` when it is a string, so for validation
    // errors `.message` is just the class name ("Bad Request Exception") and
    // every field name is lost.
    Logger.error(
      `${req?.method} ${req?.originalUrl ?? req?.url} -> ${status} ${JSON.stringify(
        exceptionResponse.error,
      )}`,
      'AllExceptionsFilter',
    );

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      Logger.error(exception.stack, 'AllExceptionsFilter');
    }

    return res.status(status).json(exceptionResponse);
  }
}
