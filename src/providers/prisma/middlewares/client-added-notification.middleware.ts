import { Logger } from '@nestjs/common';
import { Prisma, TravelAgentLicenseStatus } from '@prisma/client';
import { MailService } from '@modules/mail/services/mail.service';

const logger = new Logger('ClientAddedNotificationMiddleware');

/**
 * The slice of a Prisma client this middleware reads through. It is handed the
 * live PrismaService rather than constructing its own client, so lookups share
 * the application's connection pool.
 */
export interface ClientAddedLookupClient {
  travelAgentClient: {
    findUnique(args: any): Promise<any>;
    findMany(args: any): Promise<any[]>;
  };
}

let mailService: MailService | null = null;

export function setMailServiceForClientAddedMiddleware(service: MailService) {
  mailService = service;
}

async function sendClientAddedNotification(
  client: ClientAddedLookupClient,
  clientRelationshipId: string,
): Promise<void> {
  if (!mailService) {
    logger.warn('MailService not available for client added notification');
    return;
  }

  try {
    const relationship = await client.travelAgentClient.findUnique({
      where: { id: clientRelationshipId },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        agent: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            travelAgentLicense: {
              where: {
                status: TravelAgentLicenseStatus.ACTIVE,
              },
              select: {
                application: {
                  select: {
                    companyName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!relationship?.client || !relationship?.agent) {
      logger.warn(
        `Cannot send client added notification: missing data for relationship ${clientRelationshipId}`,
      );
      return;
    }

    const clientEmail = relationship.client.email;
    const clientName =
      `${relationship.client.firstName || ''} ${
        relationship.client.lastName || ''
      }`.trim() || clientEmail;

    const agentName =
      `${relationship.agent.firstName || ''} ${
        relationship.agent.lastName || ''
      }`.trim() || relationship.agent.email;

    const companyName =
      relationship.agent.travelAgentLicense?.application?.companyName ||
      'Travel Agent';

    const addedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    await mailService.sendClientAddedNotification({
      userEmail: clientEmail,
      userName: clientName,
      agentName,
      companyName,
      addedDate,
      subject: `You've been added to ${companyName}'s client list`,
    });

    logger.log(
      `Client added notification sent to ${clientEmail} for agent ${agentName}`,
    );
  } catch (error) {
    logger.error(
      `Failed to send client added notification for relationship ${clientRelationshipId}: ${
        (error as Error).message
      }`,
    );
    // Don't throw - this is a non-critical side effect
  }
}

export function clientAddedNotificationMiddleware(
  client: ClientAddedLookupClient,
): Prisma.Middleware {
  return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
    if (params.model !== 'TravelAgentClient') {
      return next(params);
    }

    if (params.action === 'create') {
      // Execute the create operation first
      const result = await next(params);

      // Then send email asynchronously (don't block the response)
      setImmediate(() => {
        sendClientAddedNotification(client, result.id).catch((error) => {
          logger.error(
            `Async client added notification send failed for relationship ${result.id}: ${error.message}`,
          );
        });
      });

      return result;
    }

    return next(params);
  };
}
