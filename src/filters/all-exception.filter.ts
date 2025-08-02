import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { INTERNAL_SERVER_ERROR } from 'src/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();

    const status: number = exception.getStatus
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Ensure errorMessage is always a string
    let errorMessage = exception?.response?.message || INTERNAL_SERVER_ERROR;
    
    // Handle cases where message is an array (common with validation errors)
    if (Array.isArray(errorMessage)) {
      errorMessage = errorMessage.join(', ');
    } else if (typeof errorMessage !== 'string') {
      errorMessage = String(errorMessage);
    }

    // Only split if errorMessage contains a colon
    const hasCodeFormat = typeof errorMessage === 'string' && errorMessage.includes(':');
    
    if (!hasCodeFormat) {
      const [serverErrorCode] = INTERNAL_SERVER_ERROR.split(':');

      const exceptionResponse = {
        success: false,
        error: {
          code: parseInt(serverErrorCode, 10),
          message: errorMessage?.trim() || INTERNAL_SERVER_ERROR,
          details: exception?.response?.error,
        },
      };

      Logger.error(exception, 'AllExceptionsFilter');
      Logger.error(exception.stack, 'AllExceptionsFilter');

      return res.status(status).json(exceptionResponse);
    }

    const [code, message] = errorMessage.split(':');

    if (!message) {
      const [serverErrorCode] = INTERNAL_SERVER_ERROR.split(':');

      const exceptionResponse = {
        success: false,
        error: {
          code: parseInt(serverErrorCode, 10),
          message: errorMessage?.trim() || INTERNAL_SERVER_ERROR,
          details: exception?.response?.error,
        },
      };

      Logger.error(exception, 'AllExceptionsFilter');
      Logger.error(exception.stack, 'AllExceptionsFilter');

      return res.status(status).json(exceptionResponse);
    }

    const exceptionResponse = {
      success: false,
      error: {
        code: parseInt(code, 10),
        message: message?.trim(),
        details: exception?.response?.error,
      },
    };

    Logger.error(exception, 'AllExceptionsFilter');
    Logger.error(exception.stack, 'AllExceptionsFilter');

    return res.status(status).json(exceptionResponse);
  }
}
