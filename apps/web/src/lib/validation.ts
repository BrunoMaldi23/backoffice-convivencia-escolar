import { isValidRut } from './rut';

export type Rule = (value: unknown) => string | null;

const isEmpty = (value: unknown) => value === null || value === undefined || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0);

export const required = (message = 'Este campo es obligatorio.'): Rule => (value) => (isEmpty(value) ? message : null);

export const email = (message = 'Ingrese un correo válido, por ejemplo nombre@colegio.cl.'): Rule => (value) =>
  isEmpty(value) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim()) ? null : message;

export const minLength = (length: number, message?: string): Rule => (value) =>
  isEmpty(value) || String(value).length >= length ? null : message ?? `Debe tener al menos ${length} caracteres.`;

export const maxLength = (length: number): Rule => (value) =>
  isEmpty(value) || String(value).length <= length ? null : `Debe tener como máximo ${length} caracteres.`;

export const rut = (message = 'Ingrese un RUT válido, por ejemplo 12.345.678-5.'): Rule => (value) =>
  isEmpty(value) || isValidRut(String(value)) ? null : message;

/** Ejecuta reglas en orden y devuelve el primer error. */
export function validate(value: unknown, rules: Rule[]): string | null {
  for (const rule of rules) {
    const error = rule(value);
    if (error) return error;
  }
  return null;
}

/** Valida un objeto completo. Devuelve un mapa de errores; vacío si todo es válido. */
export function validateAll<T extends Record<string, unknown>>(values: T, schema: Partial<Record<keyof T, Rule[]>>): Partial<Record<keyof T, string>> {
  const errors: Partial<Record<keyof T, string>> = {};
  for (const key of Object.keys(schema) as (keyof T)[]) {
    const error = validate(values[key], schema[key] ?? []);
    if (error) errors[key] = error;
  }
  return errors;
}
