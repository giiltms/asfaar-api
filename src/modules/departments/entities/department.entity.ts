import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

export class DepartmentEntity {
  @ApiProperty({ description: 'Department ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Department name' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'Agency that the department belongs to' })
  @Expose()
  agency: string;

  @ApiProperty({ description: 'Department description' })
  @Expose()
  description: string;

  @ApiProperty({ description: 'URL to department logo' })
  @Expose()
  logoUrl: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  updatedAt: Date;

  @ApiProperty({ description: 'Number of staff in this department' })
  @Expose()
  staffCount?: number;

  @ApiProperty({ description: 'Number of active flaggings for this department' })
  @Expose()
  activeFlaggingCount?: number;

  constructor(partial: Partial<DepartmentEntity>) {
    Object.assign(this, partial);
  }
}
