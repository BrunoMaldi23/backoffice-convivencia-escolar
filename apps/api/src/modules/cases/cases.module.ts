import { Module } from '@nestjs/common';
import { AdminSecurityModule } from '../../common/security/admin-security.module';
import { SecurityAuditModule } from '../../common/security/security-audit.module';
import { DatabaseModule } from '../../database/database.module';
import { InstitutionsModule } from '../institutions/institutions.module';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';

@Module({ imports: [DatabaseModule, AdminSecurityModule, SecurityAuditModule, InstitutionsModule], controllers: [CasesController], providers: [CasesService] })
export class CasesModule {}
