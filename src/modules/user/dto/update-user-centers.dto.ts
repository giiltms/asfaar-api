import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class UpdateUserCentersDto {
  @ApiProperty({
    description: 'List of center IDs to assign to the user',
    example: ['center-uuid-1', 'center-uuid-2'],
    type: [String],
    required: true,
  })
  @IsArray()
  @IsUUID('4', { each: true })
  centerIds: string[];
}
