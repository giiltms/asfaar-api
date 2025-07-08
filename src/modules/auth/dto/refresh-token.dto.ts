import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export default class RefreshTokenDTO {
  @ApiProperty({ type: String })
  @IsString()
  readonly refreshToken: string;
}
