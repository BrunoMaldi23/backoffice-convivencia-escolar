import { Module } from '@nestjs/common';
import { AuthModule } from '../../modules/auth/auth.module';
import { SessionGuard, CsrfGuard, PermissionsGuard } from './admin-guards';
@Module({ imports: [AuthModule], providers: [SessionGuard, CsrfGuard, PermissionsGuard], exports: [AuthModule, SessionGuard, CsrfGuard, PermissionsGuard] })
export class AdminSecurityModule {}
