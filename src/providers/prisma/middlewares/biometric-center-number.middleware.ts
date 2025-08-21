import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const logger = new Logger('BiometricCenterNumberMiddleware');

async function generateNextCenterNumber(prismaClient: any): Promise<string> {
  // Get the highest existing center number
  const lastCenter = await prismaClient.biometricCenter.findFirst({
    orderBy: {
      centerNumber: 'desc',
    },
    select: {
      centerNumber: true,
    },
  });

  if (!lastCenter) {
    // If no centers exist, start with 001
    return '001';
  }

  // Parse the last center number and increment
  const lastNumber = parseInt(lastCenter.centerNumber, 10);
  const nextNumber = lastNumber + 1;

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
          const nextCenterNumber = await generateNextCenterNumber(this);
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
    } catch (err) {
      throw err;
    }
  };
}
