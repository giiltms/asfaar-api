import { Logger } from '@nestjs/common';

const logger = new Logger('SubmissionRecipients');

/**
 * Minimal shape of the user fields needed to address an email.
 */
export interface AddressableUser {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

/**
 * The parties who should be told about an event on a form submission:
 * the applicant it belongs to, plus the travel agent managing it (if any).
 */
export interface SubmissionRecipients {
  /** Primary recipient - always the applicant. */
  to: string;
  /** Copied recipients - the managing travel agent, when there is one. */
  cc: string[];
  applicantName: string;
  /** Empty string when the submission was not filed by an agent. */
  agentName: string;
  referenceNumber: string;
}

/**
 * The slice of a Prisma client this resolver needs. Keeping it structural lets
 * the resolver run against PrismaService, a transaction client, or a test double.
 */
export interface SubmissionLookupClient {
  formSubmission: {
    findUnique(args: any): Promise<any>;
  };
}

export const NO_REFERENCE_NUMBER = 'N/A';

/**
 * Build a display name from whatever the user record actually has.
 */
export function formatUserName(user: AddressableUser | null | undefined): string {
  if (!user) {
    return '';
  }

  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }

  if (user.firstName) {
    return user.firstName;
  }

  return user.email ? user.email.split('@')[0] : '';
}

const normalizeEmail = (email?: string | null): string =>
  (email || '').trim().toLowerCase();

/**
 * Resolve who to notify about a form submission.
 *
 * Applicant lifecycle mail has historically addressed the applicant alone, which
 * left travel agents with no push notification about their own clients. This
 * resolves both parties from a single submission id so every caller copies the
 * agent consistently.
 *
 * Returns null - rather than throwing - when there is nobody to write to, since
 * notification is a side effect that must never fail the operation that caused it.
 */
export async function resolveSubmissionRecipients(
  client: SubmissionLookupClient,
  submissionId: string,
): Promise<SubmissionRecipients | null> {
  try {
    const submission = await client.formSubmission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        referenceNumber: true,
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        travelAgent: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!submission?.user?.email) {
      logger.warn(
        `No applicant email to notify for submission ${submissionId}; skipping`,
      );
      return null;
    }

    const applicant = submission.user;
    const agent = submission.travelAgent;

    // An agent may also be the applicant on their own application - never copy
    // the same mailbox twice.
    const agentIsSeparateRecipient =
      !!agent?.email &&
      normalizeEmail(agent.email) !== normalizeEmail(applicant.email);

    return {
      to: applicant.email,
      cc: agentIsSeparateRecipient ? [agent.email.trim()] : [],
      applicantName: formatUserName(applicant),
      agentName: agentIsSeparateRecipient ? formatUserName(agent) : '',
      referenceNumber: submission.referenceNumber || NO_REFERENCE_NUMBER,
    };
  } catch (error) {
    logger.error(
      `Failed to resolve recipients for submission ${submissionId}: ${
        (error as Error).message
      }`,
    );
    return null;
  }
}
