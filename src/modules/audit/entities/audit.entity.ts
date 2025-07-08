import { AuditLog, Prisma } from '@prisma/client';

export default class AuditEntity implements AuditLog {
  url: string;
  id: string;
  userId: string;
  action: string;
  timestamp: Date;
  resourceId: string;
  resourceType: string;
  changes: Prisma.JsonValue;
}
