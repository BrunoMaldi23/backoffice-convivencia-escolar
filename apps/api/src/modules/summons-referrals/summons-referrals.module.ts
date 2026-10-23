import { Module } from '@nestjs/common';
import { AdminSecurityModule } from '../../common/security/admin-security.module';
import { SecurityAuditModule } from '../../common/security/security-audit.module';
import { DatabaseModule } from '../../database/database.module';
import { InstitutionsModule } from '../institutions/institutions.module';
import { SummonsReferralsController } from './summons-referrals.controller';
import { SummonsReferralsService } from './summons-referrals.service';

@Module({ imports: [DatabaseModule, AdminSecurityModule, SecurityAuditModule, InstitutionsModule], controllers: [SummonsReferralsController], providers: [SummonsReferralsService] })
export class SummonsReferralsModule {}
