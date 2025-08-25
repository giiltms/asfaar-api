import * as basicAuth from 'express-basic-auth';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import {
  INestApplication,
  Logger,
  RequestMethod,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './modules/app/app.module';
import { VersioningOptions } from '@nestjs/common/interfaces/version-options.interface';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap(): Promise<{ port: number }> {
  /**
   * Create NestJS application
   */
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    bodyParser: true,
  });

  // Configure static file serving for uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
    index: false, // Don't serve index.html
    fallthrough: false, // Don't fall through to other handlers
  });

  // Increase body size limits for large biometric payloads
  // Note: Using global pipes or custom middleware is typical; here we rely on Nest's underlying body-parser options via main bootstrap config.

  const configService: ConfigService = app.get(ConfigService);
  const appConfig = configService.get('app');

  {
    /**
     * Set logger levels based on configuration
     */
    app.useLogger([appConfig.LOG_LEVEL]);
  }

  {
    /**
     * Set global prefix for all routes except GET /
     */
    const options = {
      exclude: [{ path: '/', method: RequestMethod.GET }],
    };

    app.setGlobalPrefix(appConfig.API_PREFIX, options);
  }

  {
    /**
     * Enable versioning for all routes
     */
    const options: VersioningOptions = {
      type: VersioningType.URI,
      defaultVersion: appConfig.API_VERSION,
    };

    app.enableVersioning(options);
  }

  {
    /**
     * Setup Swagger API documentation
     */
    app.use(
      ['/docs'],
      basicAuth({
        challenge: true,
        users: {
          admin: 'admin', // In production, use environment variables
        },
      }),
    );

    const options: Omit<OpenAPIObject, 'paths'> = new DocumentBuilder()
      .setTitle(appConfig.APP_NAME)
      .setDescription(appConfig.APP_DESCRIPTION)
      .setVersion(appConfig.APP_VERSION)
      .addBearerAuth({ in: 'header', type: 'http' })
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Users', 'User management endpoints')
      .addTag('Health', 'Health check endpoints')
      .build();

    const document: OpenAPIObject = SwaggerModule.createDocument(app, options);

    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  await app.listen(appConfig.PORT);

  return {
    port: appConfig.PORT,
  };
}

bootstrap().then((config) => {
  Logger.log(
    `🚀 Application is running on: http://localhost:${config.port}`,
    'Bootstrap',
  );
  Logger.log(
    `📚 Swagger documentation: http://localhost:${config.port}/docs`,
    'Bootstrap',
  );
});

export { bootstrap };
