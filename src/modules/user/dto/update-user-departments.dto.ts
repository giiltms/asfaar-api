import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class UpdateUserDepartmentsDto {
  @ApiProperty({
    description: 'List of department IDs to assign to the user',
    example: ['dept-uuid-1', 'dept-uuid-2'],
    type: [String],
    required: true,
  })
  @IsArray()
  @IsUUID('4', { each: true })
  departmentIds: string[];
}
