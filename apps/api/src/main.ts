import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser: typeof import('cookie-parser') = require('cookie-parser');
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(new Logger()); app.enableShutdownHooks(); app.setGlobalPrefix('api');
  // Se conserva trust proxy desactivado: solo debe configurarse con la topología conocida del proxy inverso.
  app.use(cookieParser());
  app.use(helmet({ contentSecurityPolicy: process.env.NODE_ENV === 'production' }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  const config = app.get(ConfigService); app.enableCors({ origin: [config.getOrThrow<string>('WEB_ORIGIN')], methods: ['GET', 'POST', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'], credentials: true, allowedHeaders: ['Content-Type', 'X-CSRF-Token'] });
  const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Backoffice Convivencia Escolar').setVersion('1.0.0').addCookieAuth().build());
  if (process.env.NODE_ENV !== 'production') SwaggerModule.setup('api/docs', app, document);
  await app.listen(config.get<number>('API_PORT') ?? 3000, '0.0.0.0');
}
bootstrap();
