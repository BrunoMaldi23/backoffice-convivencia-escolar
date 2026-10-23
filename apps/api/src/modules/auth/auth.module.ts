import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { MailModule } from '../mail/mail.module';
import { SecurityAuditModule } from '../../common/security/security-audit.module';
@Module({ imports: [MailModule, SecurityAuditModule], controllers: [AuthController], providers: [AuthService, PasswordService], exports: [AuthService] }) export class AuthModule {}
