import { HealthService } from './health.service';
describe('HealthService', () => { it('informa servicios disponibles cuando PostgreSQL responde', async () => { const service = new HealthService({ isHealthy: jest.fn().mockResolvedValue(true) } as never); await expect(service.check()).resolves.toMatchObject({ status: 'ok', database: 'connected' }); }); });
