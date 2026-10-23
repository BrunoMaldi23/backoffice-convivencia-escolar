import { Module } from '@nestjs/common';
import { AdminSecurityModule } from '../../common/security/admin-security.module';
import { SecurityAuditModule } from '../../common/security/security-audit.module';
import { DatabaseModule } from '../../database/database.module';
import { InstitutionsModule } from '../institutions/institutions.module';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';
@Module({ imports: [DatabaseModule, AdminSecurityModule, SecurityAuditModule, InstitutionsModule], controllers: [InterviewsController], providers: [InterviewsService] }) export class InterviewsModule {}
