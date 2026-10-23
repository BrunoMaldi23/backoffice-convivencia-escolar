/**
 * Normaliza un RUT chileno a `12345678-5` (sin puntos, dígito verificador en mayúscula).
 * Devuelve `null` si el formato o el dígito verificador no son válidos.
 */
export function normalizeRut(value: string): string | null {
  const clean = value.replace(/[.\s-]/g, '').toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(clean)) return null;
  const body = clean.slice(0, -1);
  const verifier = clean.slice(-1);
  let sum = 0;
  let factor = 2;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return verifier === expected ? `${Number(body)}-${verifier}` : null;
}

/** Texto de búsqueda de RUT: sin puntos ni espacios, se compara contra el valor normalizado `12345678-5`. */
export function rutSearchTerm(value: string): string {
  return value.replace(/[.\s]/g, '').toUpperCase();
}
