import { Module } from '@nestjs/common';
import { AdminSecurityModule } from '../../common/security/admin-security.module';
import { AuditController } from './audit.controller';
@Module({ imports: [AdminSecurityModule], controllers: [AuditController] }) export class AuditModule {}
