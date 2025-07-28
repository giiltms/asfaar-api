import { AuditLog } from '@prisma/client';

export default class AuditEntity implements AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  oldValues: any;
  newValues: any;
  ipAddress: string;
  userAgent: string;
  url: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<AuditEntity>) {
    Object.assign(this, partial);
  }
}
