import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Roles } from '@common/constants/roles.constants';

export class SetUserRoleDto {
  @ApiProperty({
    description: 'The role to assign to the user',
    enum: Roles,
    example: Roles.APPLICANT,
  })
  @IsEnum(Roles)
  readonly role!: Roles;
}
