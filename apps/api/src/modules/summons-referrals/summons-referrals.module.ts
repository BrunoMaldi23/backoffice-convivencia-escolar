import { Module } from '@nestjs/common';
import { AdminSecurityModule } from '../../common/security/admin-security.module';
import { SecurityAuditModule } from '../../common/security/security-audit.module';
import { DatabaseModule } from '../../database/database.module';
import { InstitutionsModule } from '../institutions/institutions.module';
import { MailModule } from '../mail/mail.module';
import { SummonsReferralsController } from './summons-referrals.controller';
import { SummonsReferralsService } from './summons-referrals.service';
import { SummonsPdfService } from './summons-pdf.service';

@Module({ imports: [DatabaseModule, AdminSecurityModule, SecurityAuditModule, InstitutionsModule, MailModule], controllers: [SummonsReferralsController], providers: [SummonsReferralsService, SummonsPdfService] })
export class SummonsReferralsModule {}
