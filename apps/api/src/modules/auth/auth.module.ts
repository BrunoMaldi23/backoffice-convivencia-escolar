import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { MailModule } from '../mail/mail.module';
@Module({ imports: [MailModule], controllers: [AuthController], providers: [AuthService, PasswordService], exports: [AuthService] }) export class AuthModule {}
