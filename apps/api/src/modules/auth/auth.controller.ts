import { Body, Controller, Get, Headers, Post, Req, Res } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCookieAuth, ApiForbiddenResponse, ApiOperation, ApiProperty, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, MinLength } from 'class-validator';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { ConfigService } from '@nestjs/config';
import { PASSWORD_MIN_LENGTH } from '../../common/security/password-policy';

class LoginDto { @ApiProperty({ example: 'funcionario@establecimiento.cl' }) @IsEmail() email!: string; @ApiProperty({ minLength: PASSWORD_MIN_LENGTH }) @IsString() @MinLength(PASSWORD_MIN_LENGTH) password!: string; }
class ForgotDto { @ApiProperty({ example: 'funcionario@establecimiento.cl' }) @IsEmail() email!: string; }
class ConsumeDto { @ApiProperty({ description: 'Código recibido por correo' }) @IsString() @MinLength(32) token!: string; @ApiProperty({ minLength: 12 }) @IsString() @MinLength(12) password!: string; }

@ApiTags('auth') @Controller('auth') export class AuthController {
  constructor(private readonly auth: AuthService, private readonly passwords: PasswordService, private readonly config: ConfigService) {}
  private cookie(res: Response, token: string) { res.cookie('bce_session', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: this.config.getOrThrow<number>('SESSION_TTL_HOURS') * 3600000 }); }
  @Post('login') @Throttle({ default: { limit: 5, ttl: 60000 } }) @ApiOperation({ summary: 'Inicia sesión', description: 'Crea una sesión en cookie HttpOnly.' }) @ApiBadRequestResponse({ description: 'DTO inválido' }) @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' }) @ApiTooManyRequestsResponse({ description: 'Límite de intentos excedido' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const data = await this.auth.login(dto.email, dto.password, { userAgent: req.get('user-agent'), ipAddress: req.ip });
    this.cookie(res, data.token);
    res.cookie('bce_csrf', data.csrf, { httpOnly: false, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: this.config.getOrThrow<number>('SESSION_TTL_HOURS') * 3600000 });
    return { user: data.user };
  }
  @Get('me') @ApiCookieAuth() async me(@Req() req: Request) { const s = await this.auth.session(req.cookies?.bce_session); return { user: { id: s.user.id, email: s.user.email, displayName: s.user.displayName, roles: s.user.roles.map((r) => r.role.name) } }; }
  @Get('csrf') @ApiCookieAuth() async csrf(@Req() req: Request) { await this.auth.csrf(req.cookies?.bce_session); return { token: req.cookies?.bce_csrf }; }
  @Post('logout') @ApiCookieAuth() @ApiForbiddenResponse({ description: 'CSRF inválido' }) @ApiUnauthorizedResponse({ description: 'Sesión inválida' }) async logout(@Req() req: Request, @Headers('x-csrf-token') csrf: string | undefined, @Res({ passthrough: true }) res: Response) {
    await this.auth.validCsrf(req.cookies?.bce_session, csrf); await this.auth.logout(req.cookies?.bce_session, { userAgent: req.get('user-agent'), ipAddress: req.ip });
    res.clearCookie('bce_session', { path: '/' }); res.clearCookie('bce_csrf', { path: '/' }); return { success: true };
  }
  @Post('forgot-password') @Throttle({ default: { limit: 3, ttl: 60000 } }) @ApiOperation({ summary: 'Solicita recuperación de contraseña' })
  forgot(@Body() dto: ForgotDto, @Req() req: Request) { return this.passwords.forgot(dto.email, { userAgent: req.get('user-agent'), ipAddress: req.ip }); }
  @Post('reset-password') @Throttle({ default: { limit: 5, ttl: 60000 } }) @ApiOperation({ summary: 'Restablece contraseña con código de un solo uso' })
  reset(@Body() dto: ConsumeDto, @Req() req: Request) { return this.passwords.consume(dto.token, dto.password, 'RESET', { userAgent: req.get('user-agent'), ipAddress: req.ip }); }
  @Post('accept-invitation') @Throttle({ default: { limit: 5, ttl: 60000 } }) @ApiOperation({ summary: 'Activa cuenta invitada' })
  accept(@Body() dto: ConsumeDto, @Req() req: Request) { return this.passwords.consume(dto.token, dto.password, 'INVITE', { userAgent: req.get('user-agent'), ipAddress: req.ip }); }
}
