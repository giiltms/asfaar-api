import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { TokenRepository } from '@modules/auth/token.repository';
import { TokenWhiteList } from '@prisma/client';

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenRepository: TokenRepository,
  ) {}

  async sign(payload): Promise<Auth.AccessRefreshTokens> {
    const userId = payload.id;
    const _accessToken = this.createJwtAccessToken(payload);
    const _refreshToken = this.createJwtRefreshToken(payload);

    const _savedRefreshToken =
      await this.tokenRepository.saveRefreshTokenToWhitelist(
        userId,
        _refreshToken,
      );

    await this.tokenRepository.saveAccessTokenToWhitelist(
      userId,
      _savedRefreshToken.id,
      _accessToken,
    );

    return {
      accessToken: _accessToken,
      refreshToken: _refreshToken,
    };
  }

  async getAccessTokenFromWhitelist(
    accessToken: string,
  ): Promise<TokenWhiteList | void> {
    const token = await this.tokenRepository.getAccessTokenFromWhitelist(
      accessToken,
    );

    if (!token) {
      throw new UnauthorizedException();
    }
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<Auth.AccessRefreshTokens | void> {
    const token = await this.tokenRepository.getRefreshTokenFromWhitelist(
      refreshToken,
    );

    if (!token) {
      throw new UnauthorizedException();
    }

    const payload = await this.jwtService.verifyAsync(refreshToken, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });

    const _payload = {
      id: payload.id,
      email: payload.email,
      roles: payload.roles,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
    };

    const _accessToken = this.createJwtAccessToken(_payload);
    const _refreshToken = this.createJwtRefreshToken(_payload);

    const _savedRefreshToken =
      await this.tokenRepository.saveRefreshTokenToWhitelist(
        _payload.id,
        _refreshToken,
      );

    await this.tokenRepository.saveAccessTokenToWhitelist(
      _payload.id,
      _savedRefreshToken.id,
      _accessToken,
    );

    return {
      accessToken: _accessToken,
      refreshToken: _refreshToken,
    };
  }

  async logout(userId: string, accessToken: string): Promise<void> {
    const _accessToken =
      await this.tokenRepository.getUserAccessTokenFromWhitelist(
        userId,
        accessToken,
      );

    await Promise.all([
      this.tokenRepository.deleteAccessTokenFromWhitelist(_accessToken.id),
      this.tokenRepository.deleteRefreshTokenFromWhitelist(
        _accessToken.refreshTokenId,
      ),
    ]);

    return;
  }

  async isPasswordCorrect(
    dtoPassword: string,
    password: string,
  ): Promise<boolean> {
    return bcrypt.compare(dtoPassword, password);
  }

  createJwtAccessToken(payload: Buffer | object): string {
    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>(
        'JWT_ACCESS_TOKEN_EXPIRATION_TIME',
        '15m',
      ),
      secret: this.configService.get<string>('JWT_SECRET'),
    });
  }

  createJwtRefreshToken(payload: Buffer | object): string {
    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>(
        'JWT_REFRESH_TOKEN_EXPIRATION_TIME',
        '7d',
      ),
      secret: this.configService.get<string>('JWT_SECRET'),
    });
  }
}
