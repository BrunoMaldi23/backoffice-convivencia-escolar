import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { InstitutionsService } from './institutions.service';
import { InstitutionsController } from './institutions.controller';
import { AdminSecurityModule } from '../../common/security/admin-security.module';
import { SecurityAuditModule } from '../../common/security/security-audit.module';

@Module({ imports: [DatabaseModule, AdminSecurityModule, SecurityAuditModule], controllers: [InstitutionsController], providers: [InstitutionsService], exports: [InstitutionsService] })
export class InstitutionsModule {}
