import { ArgumentsHost, Catch, HttpStatus, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
// Use relative import for Jest compatibility
const PRISMA_API_ERROR = 'PRISMA_API_ERROR';

export type ErrorCodesStatusMapping = {
  [key: string]: number;
};

/**
 * {@link PrismaClientExceptionFilter}
 * catches {@link Prisma.PrismaClientKnownRequestError}
 * and {@link Prisma.NotFoundError} exceptions.
 */
@Catch(Prisma?.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  /**
   * default error codes mapping
   *
   * Error codes definition for Prisma Client (Query Engine)
   * @see https://www.prisma.io/docs/reference/api-reference/error-reference#prisma-client-query-engine
   */
  private readonly errorCodesStatusMapping: ErrorCodesStatusMapping = {
    P2000: HttpStatus.BAD_REQUEST,
    P2002: HttpStatus.CONFLICT,
    P2025: HttpStatus.NOT_FOUND,
  };

  /**
   * @param applicationRef
   * @param errorCodesStatusMapping
   */
  constructor(
    applicationRef?: any, // Simplified type
    errorCodesStatusMapping?: ErrorCodesStatusMapping,
  ) {
    super(applicationRef);

    // use custom error codes mapping (overwrite)
    //
    // @example:
    //
    //   const { httpAdapter } = app.get(HttpAdapterHost);
    //   app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter, {
    //     P2022: HttpStatus.BAD_REQUEST,
    //   }));
    //
    if (errorCodesStatusMapping) {
      this.errorCodesStatusMapping = {
        ...this.errorCodesStatusMapping,
        ...errorCodesStatusMapping,
      };
    }
  }

  /**
   * @param exception
   * @param host
   * @returns
   */
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    if (exception.code && this.errorCodesStatusMapping[exception.code]) {
      const statusCode = this.errorCodesStatusMapping[exception.code];
      const message = `${PRISMA_API_ERROR} ${exception.code}: ${exception.message}`;

      if (!host.switchToHttp().getResponse().headersSent) {
        super.catch(
          new HttpException(
            {
              statusCode,
              message: message,
            },
            statusCode,
          ),
          host,
        );
      }

      return;
    }
    // default 500 error code
    if (!host.switchToHttp().getResponse().headersSent) {
      super.catch(
        new HttpException(
          {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: `${PRISMA_API_ERROR}: ${exception.message}`,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
        host,
      );
    }
  }
}
