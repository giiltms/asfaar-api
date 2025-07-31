import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum } from 'class-validator';
import { Roles } from '@common/constants/roles.constants';

export class UpdateUserRolesDto {
  @ApiProperty({
    description: 'Array of roles to assign to the user',
    enum: Roles,
    isArray: true,
    example: [Roles.APPLICANT, Roles.ADMIN],
  })
  @IsArray()
  @IsEnum(Roles, { each: true })
  readonly roles!: Roles[];
}
