import { Module } from '@nestjs/common';
import { AdminSecurityModule } from '../../common/security/admin-security.module';
import { SecurityAuditModule } from '../../common/security/security-audit.module';
import { DatabaseModule } from '../../database/database.module';
import { InstitutionsModule } from '../institutions/institutions.module';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';
import { CaseOperationsModule } from '../case-operations/case-operations.module';
import { InterviewPdfService } from './interview-pdf.service';
@Module({ imports: [DatabaseModule, AdminSecurityModule, SecurityAuditModule, InstitutionsModule, CaseOperationsModule], controllers: [InterviewsController], providers: [InterviewsService, InterviewPdfService] }) export class InterviewsModule {}
