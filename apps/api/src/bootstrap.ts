import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { RequestHandler } from 'express';
import { AppModule } from './app.module';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser: typeof import('cookie-parser') = require('cookie-parser');
// Express es una dependencia transitiva de Nest; se resuelve desde su adaptador.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { json, urlencoded } = require(require.resolve('express', { paths: [require.resolve('@nestjs/platform-express')] })) as {
  json: (options: { limit: string }) => RequestHandler;
  urlencoded: (options: { extended: boolean; limit: string }) => RequestHandler;
};

export async function createApplication() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, bodyParser: false });
  app.useLogger(new Logger());
  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  const config = app.get(ConfigService);
  const trustProxyHops = config.getOrThrow<number>('TRUST_PROXY_HOPS');
  if (trustProxyHops > 0) (app.getHttpAdapter().getInstance() as { set(name: string, value: number): void }).set('trust proxy', trustProxyHops);
  app.use('/api/cases/:caseId/documents', json({ limit: '15mb' }));
  app.use(json({ limit: '100kb' }), urlencoded({ extended: true, limit: '100kb' }));
  app.use(cookieParser());
  app.use(helmet({ contentSecurityPolicy: process.env.NODE_ENV === 'production' }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.enableCors({ origin: [config.getOrThrow<string>('WEB_ORIGIN')], methods: ['GET', 'POST', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'], credentials: true, allowedHeaders: ['Content-Type', 'X-CSRF-Token'] });
  const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Backoffice Convivencia Escolar').setVersion('1.0.0').addCookieAuth().build());
  if (process.env.NODE_ENV !== 'production') SwaggerModule.setup('api/docs', app, document);
  return app;
}
