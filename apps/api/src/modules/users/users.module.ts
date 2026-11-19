import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AdminSecurityModule } from '../../common/security/admin-security.module';
import { SupabaseAuthModule } from '../auth/supabase-auth.module';
@Module({ imports: [AdminSecurityModule, SupabaseAuthModule], controllers: [UsersController], providers: [UsersService] }) export class UsersModule {}
