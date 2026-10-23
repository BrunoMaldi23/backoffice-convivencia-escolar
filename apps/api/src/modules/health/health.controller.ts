import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
@ApiTags('health') @Controller('health') export class HealthController {
  constructor(private readonly health: HealthService) {}
  @Get() @ApiOperation({ summary: 'Comprueba la disponibilidad de la API y PostgreSQL' }) @ApiOkResponse({ description: 'Servicios disponibles' }) check() { return this.health.check(); }
}
