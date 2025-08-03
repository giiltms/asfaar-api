import {
  Catch,
  HttpStatus,
  BadRequestException,
  ExceptionFilter,
  ArgumentsHost,
  Logger,
} from '@nestjs/common';
import { BAD_REQUEST } from 'src/common';

@Catch(BadRequestException)
export class BadRequestExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    // Handle validation errors from ValidationPipe
    let errorMessage = BAD_REQUEST;
    let details = null;

    if (exceptionResponse && typeof exceptionResponse === 'object') {
      // ValidationPipe returns { message: string[], error: string, statusCode: number }
      if (Array.isArray(exceptionResponse.message)) {
        // Join validation error messages
        errorMessage = exceptionResponse.message.join(', ');
        details = exceptionResponse.message;
      } else if (typeof exceptionResponse.message === 'string') {
        errorMessage = exceptionResponse.message;
      }
    }

    // Parse error code and message from BAD_REQUEST constant
    const [code, defaultMessage] = BAD_REQUEST.split(':');

    const finalResponse = {
      success: false,
      error: {
        code: parseInt(code, 10),
        message:
          errorMessage === BAD_REQUEST ? defaultMessage?.trim() : errorMessage,
        details: details,
      },
    };

    Logger.error(
      `Validation Error: ${errorMessage}`,
      'BadRequestExceptionFilter',
    );

    return response.status(status).json(finalResponse);
  }
}
