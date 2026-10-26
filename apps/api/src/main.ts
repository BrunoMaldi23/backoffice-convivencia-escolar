import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import type { RequestHandler } from 'express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser: typeof import('cookie-parser') = require('cookie-parser');
// `express` no es una dependencia directa: se toma la misma copia que usa @nestjs/platform-express para no tocar el lockfile.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { json, urlencoded } = require(require.resolve('express', { paths: [require.resolve('@nestjs/platform-express')] })) as { json: (options: { limit: string }) => RequestHandler; urlencoded: (options: { extended: boolean; limit: string }) => RequestHandler };

/** Los archivos viajan en base64 dentro del JSON (10 MiB ≈ 13,4 MB): solo la carga de documentos admite cuerpos grandes; el resto, 100 KB. */
const DOCUMENT_BODY_LIMIT = '15mb';
const DEFAULT_BODY_LIMIT = '100kb';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, bodyParser: false });
  app.useLogger(new Logger()); app.enableShutdownHooks(); app.setGlobalPrefix('api');
  const config = app.get(ConfigService);
  const trustProxyHops = config.getOrThrow<number>('TRUST_PROXY_HOPS');
  // Local conserva la IP directa; en Render se configura exactamente un proxy mediante la variable de entorno.
  if (trustProxyHops > 0) (app.getHttpAdapter().getInstance() as { set(name: string, value: number): void }).set('trust proxy', trustProxyHops);
  app.use('/api/cases/:caseId/documents', json({ limit: DOCUMENT_BODY_LIMIT }));
  app.use(json({ limit: DEFAULT_BODY_LIMIT }), urlencoded({ extended: true, limit: DEFAULT_BODY_LIMIT }));
  app.use(cookieParser());
  app.use(helmet({ contentSecurityPolicy: process.env.NODE_ENV === 'production' }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.enableCors({ origin: [config.getOrThrow<string>('WEB_ORIGIN')], methods: ['GET', 'POST', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'], credentials: true, allowedHeaders: ['Content-Type', 'X-CSRF-Token'] });
  const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Backoffice Convivencia Escolar').setVersion('1.0.0').addCookieAuth().build());
  if (process.env.NODE_ENV !== 'production') SwaggerModule.setup('api/docs', app, document);
  await app.listen(config.get<number>('PORT') ?? config.getOrThrow<number>('API_PORT'), '0.0.0.0');
}
bootstrap();
