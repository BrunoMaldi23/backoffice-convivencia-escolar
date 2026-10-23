import { Module } from '@nestjs/common';
import { AdminSecurityModule } from '../../common/security/admin-security.module';
import { SecurityAuditModule } from '../../common/security/security-audit.module';
import { DatabaseModule } from '../../database/database.module';
import { InstitutionsModule } from '../institutions/institutions.module';
import { ReportsParticipantsController } from './reports-participants.controller';
import { ReportsParticipantsService } from './reports-participants.service';
@Module({ imports: [DatabaseModule, AdminSecurityModule, SecurityAuditModule, InstitutionsModule], controllers: [ReportsParticipantsController], providers: [ReportsParticipantsService] })
export class ReportsParticipantsModule {}
