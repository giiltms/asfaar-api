import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Roles } from '@modules/app/app.roles';

export class SetUserRoleDto {
  @ApiProperty({
    description: 'The role to assign to the user',
    enum: Roles,
    example: Roles.USER,
  })
  @IsEnum(Roles)
  readonly role!: Roles;
}
