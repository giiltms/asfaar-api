import { Injectable } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';
import { TokenWhiteList } from '.prisma/client';
import * as moment from 'moment';

@Injectable()
export class TokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  getAccessTokenFromWhitelist(accessToken: string): Promise<TokenWhiteList> {
    return this.prisma.tokenWhiteList.findFirst({
      where: {
        accessToken,
      },
    });
  }

  getUserAccessTokenFromWhitelist(
    userId: string,
    accessToken: string,
  ): Promise<TokenWhiteList> {
    return this.prisma.tokenWhiteList.findFirst({
      where: {
        userId,
        accessToken,
      },
    });
  }

  deleteAccessTokenFromWhitelist(
    accessTokenId: string,
  ): Promise<TokenWhiteList> {
    return this.prisma.tokenWhiteList.delete({
      where: {
        id: accessTokenId,
      },
    });
  }

  deleteRefreshTokenFromWhitelist(
    refreshTokenId: string,
  ): Promise<TokenWhiteList> {
    return this.prisma.tokenWhiteList.delete({
      where: {
        id: refreshTokenId,
      },
    });
  }

  getRefreshTokenFromWhitelist(refreshToken: string): Promise<TokenWhiteList> {
    return this.prisma.tokenWhiteList.findFirst({
      where: {
        refreshToken,
      },
    });
  }

  saveAccessTokenToWhitelist(
    userId: string,
    refreshTokenId: string,
    accessToken: string,
  ): Promise<TokenWhiteList> {
    // Convert '15m' to actual date using moment - 15 minutes
    const expiresAt = moment().add(15, 'minutes').toDate();

    return this.prisma.tokenWhiteList.create({
      data: {
        userId: userId,
        refreshTokenId,
        accessToken,
        refreshToken: null,
        expiresAt,
      },
    });
  }

  saveRefreshTokenToWhitelist(
    userId: string,
    refreshToken: string,
  ): Promise<TokenWhiteList> {
    // Convert '7d' to actual date using moment - 7 days
    const expiresAt = moment().add(7, 'days').toDate();

    return this.prisma.tokenWhiteList.create({
      data: {
        userId: userId,
        accessToken: null,
        refreshTokenId: null,
        refreshToken,
        expiresAt,
      },
    });
  }
}
