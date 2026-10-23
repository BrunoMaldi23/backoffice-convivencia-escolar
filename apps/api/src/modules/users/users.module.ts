import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AdminSecurityModule } from '../../common/security/admin-security.module';
import { MailModule } from '../mail/mail.module';
@Module({ imports: [AdminSecurityModule, MailModule], controllers: [UsersController], providers: [UsersService] }) export class UsersModule {}
