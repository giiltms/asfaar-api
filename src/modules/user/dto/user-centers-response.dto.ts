import { ApiProperty } from '@nestjs/swagger';

export class UserCenterDto {
  @ApiProperty({
    description: 'Center ID',
    example: 'center-uuid-1',
  })
  id: string;

  @ApiProperty({
    description: 'Center name',
    example: 'ASFAAR-ABUJA HQ',
  })
  name: string;

  @ApiProperty({
    description: 'Center code',
    example: 'ASFAAR-ABJ-HQ',
  })
  code: string;

  @ApiProperty({
    description: 'Center address',
    example: '123 Main Street, Abuja',
  })
  address: string;

  @ApiProperty({
    description: 'Center city',
    example: 'Abuja',
  })
  city: string;

  @ApiProperty({
    description: 'Center state',
    example: 'FCT',
  })
  state: string;

  @ApiProperty({
    description: 'Whether center is active',
    example: true,
  })
  isActive: boolean;
}

export class UserCentersResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: 'user-uuid-1',
  })
  userId: string;

  @ApiProperty({
    description: 'User email',
    example: 'staff@example.com',
  })
  userEmail: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  userName: string;

  @ApiProperty({
    description: 'List of centers assigned to the user',
    type: [UserCenterDto],
  })
  centers: UserCenterDto[];

  @ApiProperty({
    description: 'Total number of centers assigned',
    example: 2,
  })
  totalCenters: number;
}
