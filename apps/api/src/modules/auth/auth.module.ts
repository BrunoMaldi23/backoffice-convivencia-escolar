import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { SupabaseAuthModule } from './supabase-auth.module';
import { SecurityAuditModule } from '../../common/security/security-audit.module';
@Module({ imports: [SupabaseAuthModule, SecurityAuditModule], controllers: [AuthController], providers: [AuthService, PasswordService], exports: [AuthService] }) export class AuthModule {}
