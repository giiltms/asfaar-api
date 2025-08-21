import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const logger = new Logger('FormSubmissionReferenceMiddleware');

export function formSubmissionReferenceMiddleware(): Prisma.Middleware {
  return async function middleware(params: Prisma.MiddlewareParams, next) {
    logger.log(
      `Middleware triggered: model=${params.model}, action=${params.action}`,
    );

    if (params.model !== 'FormSubmission') {
      return next(params);
    }

    logger.log('Processing FormSubmission operation');

    // Note: Reference numbers are now generated when biometric appointments are created
    // to ensure the correct center number is used. This middleware is kept for
    // potential future use but does not generate reference numbers during form submission.

    try {
      return await next(params);
    } catch (err) {
      throw err;
    }
  };
}
