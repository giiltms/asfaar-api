import { TokenWhiteList } from '@prisma/client';

export class TokensEntity implements TokenWhiteList {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  refreshTokenId: string;
  deviceInfo: any;
  ipAddress: string;
  isRevoked: boolean;
  revokedAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<TokensEntity>) {
    Object.assign(this, partial);
  }
}
