import { ConfigService } from '@nestjs/config';
import { createApplication } from './bootstrap';
async function bootstrap() {
  const app = await createApplication();
  const config = app.get(ConfigService);
  await app.listen(config.get<number>('PORT') ?? config.getOrThrow<number>('API_PORT'), '0.0.0.0');
}
bootstrap();
