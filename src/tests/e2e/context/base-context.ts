import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { Server } from 'http';
import { AppModule } from '@modules/app/app.module';
import { ConfigModule } from '@nestjs/config';
import TestService from '@tests/e2e/test.service';
import { AdminUserInterface } from '@tests/e2e/interfaces/admin-user.interface';
import { IMakeRequest } from '@tests/e2e/interfaces/make-request.interface';
import makeRequest from '@tests/e2e/common/make-request';

class BaseContext {
  private _app!: INestApplication;
  private _module!: TestingModule;
  private _server!: Server;
  private _connection!: PrismaClient;

  public service!: TestService;
  public globalAdmin!: AdminUserInterface;
  public request!: IMakeRequest;

  async init() {
    this._module = await Test.createTestingModule({
      imports: [AppModule, ConfigModule],
    }).compile();

    this._app = this._module.createNestApplication();

    // Apply global pipes and configurations
    this._app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        skipMissingProperties: false,
      })
    );

    // Set global prefix for API versioning
    this._app.setGlobalPrefix('api');
    this._app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: 'v1',
    });

    this._connection = new PrismaClient();

    await this._app.init();

    this._server = this._app.getHttpServer();
    this.request = makeRequest(this._server);
    this.service = new TestService(this._app, this._connection);
    this.globalAdmin = await this.service.createGlobalAdmin();
  }

  async end() {
    // Cleanup order is important due to foreign key constraints
    await this._connection.transactionRefund.deleteMany();
    await this._connection.transaction.deleteMany();
    await this._connection.paymentMethod.deleteMany();
    await this._connection.wallet.deleteMany();
    await this._connection.subscription.deleteMany();
    await this._connection.plan.deleteMany();
    await this._connection.notification.deleteMany();
    await this._connection.file.deleteMany();
    await this._connection.like.deleteMany();
    await this._connection.comment.deleteMany();
    await this._connection.post.deleteMany();
    await this._connection.tag.deleteMany();
    await this._connection.category.deleteMany();
    await this._connection.userPreference.deleteMany();
    await this._connection.userSession.deleteMany();
    await this._connection.userProfile.deleteMany();
    await this._connection.auditLog.deleteMany();
    await this._connection.token.deleteMany();
    await this._connection.tokenWhiteList.deleteMany();
    await this._connection.user.deleteMany();

    await this._connection.$disconnect();
    await this._app.close();
  }

  get app(): INestApplication {
    return this._app;
  }

  get connection(): PrismaClient {
    return this._connection;
  }

  get server(): Server {
    return this._server;
  }
}

export default BaseContext;
