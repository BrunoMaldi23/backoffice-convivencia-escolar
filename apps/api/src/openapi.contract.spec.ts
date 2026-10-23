import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

describe('Contrato OpenAPI', () => {
  let app: INestApplication;
  beforeAll(async () => { app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication(); app.setGlobalPrefix('api'); await app.init(); });
  afterAll(async () => app?.close());
  it('expone las 93 operaciones implementadas, sin referencias rotas', () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Backoffice Convivencia Escolar').setVersion('1.0.0').addCookieAuth().build());
    const operations = Object.entries(document.paths).flatMap(([path, value]) => Object.entries(value ?? {}).filter(([method]) => ['get', 'post', 'patch'].includes(method)).map(([method, operation]) => ({ path, method, operation })));
    expect(operations).toHaveLength(93);
    expect(operations.every(({ operation }) => operation.responses && Object.keys(operation.responses).length > 0)).toBe(true);
    const secured = operations.filter(({ path }) => path !== '/api/health' && !path.startsWith('/api/auth/login') && !path.startsWith('/api/auth/forgot-password') && !path.startsWith('/api/auth/reset-password') && !path.startsWith('/api/auth/accept-invitation'));
    const missingSecurity = secured.filter(({ operation }) => !operation.security?.some((item: Record<string, string[]>) => 'cookie' in item)).map(({ path, method }) => `${method.toUpperCase()} ${path}`);
    expect(missingSecurity).toEqual([]);
    const schemas = document.components?.schemas ?? {};
    const refs = JSON.stringify(document).match(/#\/components\/schemas\/([^"}]+)/g) ?? [];
    for (const reference of refs) expect(schemas[reference.replace('#/components/schemas/', '')]).toBeDefined();
  });
});
