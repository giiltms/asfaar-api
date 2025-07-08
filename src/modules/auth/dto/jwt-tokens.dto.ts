import { ApiProperty } from '@nestjs/swagger';

export default class JwtTokensDTO {
  @ApiProperty({ type: String })
  readonly accessToken!: string;

  @ApiProperty({ type: String })
  readonly refreshToken!: string;
}
