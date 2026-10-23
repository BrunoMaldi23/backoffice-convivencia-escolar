import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { AuditModule } from './modules/audit/audit.module';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SecurityAuditModule } from './common/security/security-audit.module';
import { InstitutionsModule } from './modules/institutions/institutions.module';
import { CasesModule } from './modules/cases/cases.module';
@Module({ imports: [ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }), ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]), DatabaseModule, SecurityAuditModule, HealthModule, AuthModule, UsersModule, RolesModule, AuditModule, InstitutionsModule, CasesModule], providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }] }) export class AppModule {}
