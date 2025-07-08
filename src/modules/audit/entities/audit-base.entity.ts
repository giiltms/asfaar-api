import { Prisma } from '@prisma/client';
import { Expose, Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import AuditEntity from './audit.entity';

@Exclude()
export default class AuditBaseEntity implements AuditEntity {
  @ApiProperty({
    type: String,
    description: 'Unique identifier for the audit log entry',
  })
  @Expose()
  id: string;

  @ApiProperty({
    type: String,
    description: 'User ID associated with the action',
  })
  @Expose()
  userId: string;

  @ApiProperty({
    type: String,
    description: 'Description of the action performed',
  })
  @Expose()
  action: string;

  @ApiProperty({
    type: String,
    description: 'URL of the action performed',
  })
  @Expose()
  url: string;

  @ApiProperty({
    type: Date,
    description: 'Timestamp of when the action was performed',
  })
  @Expose()
  timestamp: Date;

  @ApiProperty({ type: String, description: 'ID of the resource affected' })
  @Expose()
  resourceId: string;

  @ApiProperty({ type: String, description: 'Type of resource affected' })
  @Expose()
  resourceType: string;

  @ApiProperty({
    type: 'object',
    description: 'Details of the changes made',
    isArray: false,
  })
  @Expose()
  changes: Prisma.JsonValue;
}
