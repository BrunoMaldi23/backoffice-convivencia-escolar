import { BadRequestException } from '@nestjs/common';

export const PASSWORD_MIN_LENGTH = 12;

export function assertPasswordPolicy(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) throw new BadRequestException(`La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`);
}
