import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum } from 'class-validator';
import { Roles } from '@modules/app/app.roles';

export class UpdateUserRolesDto {
  @ApiProperty({
    description: 'Array of roles to assign to the user',
    enum: Roles,
    isArray: true,
    example: [Roles.USER, Roles.ADMIN],
  })
  @IsArray()
  @IsEnum(Roles, { each: true })
  readonly roles!: Roles[];
}
