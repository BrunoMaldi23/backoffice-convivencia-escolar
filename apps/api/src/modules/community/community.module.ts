import { Module } from '@nestjs/common';
import { AdminSecurityModule } from '../../common/security/admin-security.module';
import { SecurityAuditModule } from '../../common/security/security-audit.module';
import { DatabaseModule } from '../../database/database.module';
import { InstitutionsModule } from '../institutions/institutions.module';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';

@Module({ imports: [DatabaseModule, AdminSecurityModule, SecurityAuditModule, InstitutionsModule], controllers: [CommunityController], providers: [CommunityService] })
export class CommunityModule {}
