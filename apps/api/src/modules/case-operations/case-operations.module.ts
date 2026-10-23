import { Module } from '@nestjs/common';
import { AdminSecurityModule } from '../../common/security/admin-security.module';
import { SecurityAuditModule } from '../../common/security/security-audit.module';
import { DatabaseModule } from '../../database/database.module';
import { InstitutionsModule } from '../institutions/institutions.module';
import { CaseOperationsController } from './case-operations.controller';
import { CaseOperationsService } from './case-operations.service';
import { PrivateStorageService } from './private-storage.service';
@Module({ imports: [DatabaseModule, AdminSecurityModule, SecurityAuditModule, InstitutionsModule], controllers: [CaseOperationsController], providers: [CaseOperationsService, PrivateStorageService] }) export class CaseOperationsModule {}
