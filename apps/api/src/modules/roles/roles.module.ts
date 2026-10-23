import { Module } from '@nestjs/common';
import { AdminSecurityModule } from '../../common/security/admin-security.module';
import { RolesController } from './roles.controller';
@Module({ imports: [AdminSecurityModule], controllers: [RolesController] }) export class RolesModule {}
