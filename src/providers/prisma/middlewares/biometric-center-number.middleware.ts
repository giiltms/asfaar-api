import { Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

const prismaInternal = new PrismaClient();
const logger = new Logger('BiometricCenterNumberMiddleware');

async function generateNextCenterNumber(): Promise<string> {
  // Get all centers and find the highest valid 3-digit number
  const allCenters = await prismaInternal.biometricCenter.findMany({
    select: {
      centerNumber: true,
    },
  });

  // Filter for valid 3-digit numbers and find the highest
  const validCenterNumbers = allCenters
    .map((center) => center.centerNumber)
    .filter((centerNumber) => /^\d{3}$/.test(centerNumber)) // Only 3-digit numbers
    .map((centerNumber) => parseInt(centerNumber, 10))
    .sort((a, b) => b - a); // Sort descending

  if (validCenterNumbers.length === 0) {
    // If no valid 3-digit numbers exist, start with 001
    return '001';
  }

  // Get the next number after the highest valid one
  const nextNumber = validCenterNumbers[0] + 1;

  // Ensure it's a 3-digit number
  if (nextNumber > 999) {
    throw new Error('Maximum number of centers (999) reached');
  }

  return nextNumber.toString().padStart(3, '0');
}

export function biometricCenterNumberMiddleware(): Prisma.Middleware {
  return async function middleware(params: Prisma.MiddlewareParams, next) {
    logger.log(
      `Middleware triggered: model=${params.model}, action=${params.action}`,
    );

    if (params.model !== 'BiometricCenter') {
      return next(params);
    }

    logger.log('Processing BiometricCenter operation');

    if (params.action === 'create') {
      const data = params.args?.data || {};
      const hasCenterNumber = Boolean(data.centerNumber);

      if (!hasCenterNumber) {
        try {
          // Generate the next available center number
          const nextCenterNumber = await generateNextCenterNumber();
          params.args.data.centerNumber = nextCenterNumber;

          logger.log(
            `Auto-generated center number: ${nextCenterNumber} for new biometric center`,
          );
        } catch (error) {
          logger.error(
            `Failed to generate center number: ${(error as Error).message}`,
          );
          throw error;
        }
      }
    }

    try {
      return await next(params);
    } catch (err: any) {
      // If it's a unique constraint violation on centerNumber, retry with a new number
      if (
        err.code === 'P2002' &&
        err.meta?.target?.includes('centerNumber') &&
        params.action === 'create'
      ) {
        logger.warn(
          `Center number conflict detected, regenerating number and retrying...`,
        );
        try {
          // Regenerate center number and retry
          const nextCenterNumber = await generateNextCenterNumber();
          params.args.data.centerNumber = nextCenterNumber;

          logger.log(
            `Regenerated center number: ${nextCenterNumber} after conflict`,
          );

          // Retry the operation
          return await next(params);
        } catch (retryError) {
          logger.error(
            `Failed to retry after center number conflict: ${
              (retryError as Error).message
            }`,
          );
          throw retryError;
        }
      }
      throw err;
    }
  };
}
