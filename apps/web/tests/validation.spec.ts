import { describe, expect, it } from 'vitest';
import { email, minLength, required, rut, validate, validateAll } from '../src/lib/validation';
import { safeRedirect } from '../src/lib/redirect';

describe('validaciones de formulario', () => {
  it('exige campos obligatorios, incluidos textos en blanco y listas vacías', () => {
    expect(required()('')).not.toBeNull();
    expect(required()('   ')).not.toBeNull();
    expect(required()([])).not.toBeNull();
    expect(required()('ok')).toBeNull();
  });

  it('valida correo solo si hay valor', () => {
    expect(email()('')).toBeNull();
    expect(email()('nombre@colegio.cl')).toBeNull();
    expect(email()('nombre@colegio')).not.toBeNull();
  });

  it('aplica el largo mínimo de contraseña del backend', () => {
    expect(minLength(12)('corta')).not.toBeNull();
    expect(minLength(12)('suficientemente-larga')).toBeNull();
  });

  it('valida RUT', () => {
    expect(rut()('12.345.678-5')).toBeNull();
    expect(rut()('12.345.678-0')).not.toBeNull();
  });

  it('devuelve el primer error y un mapa por campo', () => {
    expect(validate('', [required('A'), email('B')])).toBe('A');
    expect(validateAll({ email: 'x', password: '' }, { email: [email()], password: [required()] })).toEqual({
      email: expect.any(String), password: expect.any(String)
    });
  });
});

describe('redirección tras iniciar sesión', () => {
  it('acepta solo rutas internas', () => {
    expect(safeRedirect('/casos/1')).toBe('/casos/1');
    expect(safeRedirect('https://externo.example')).toBe('/');
    expect(safeRedirect('//externo.example')).toBe('/');
    expect(safeRedirect(undefined)).toBe('/');
    expect(safeRedirect(['/casos'])).toBe('/');
  });
});
