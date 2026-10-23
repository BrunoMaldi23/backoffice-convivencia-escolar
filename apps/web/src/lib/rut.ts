/** Limpia un RUT dejando solo dígitos y K mayúscula. */
export function cleanRut(value: string): string {
  return value.replace(/[^0-9kK]/g, '').toUpperCase();
}

/** Calcula el dígito verificador con el algoritmo módulo 11. */
export function rutCheckDigit(body: string): string {
  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const rest = 11 - (sum % 11);
  return rest === 11 ? '0' : rest === 10 ? 'K' : String(rest);
}

export function isValidRut(value: string): boolean {
  const clean = cleanRut(value);
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  if (!/^\d{1,8}$/.test(body)) return false;
  return rutCheckDigit(body) === clean.slice(-1);
}

/** Formato 12.345.678-5. Devuelve el texto original si no se puede interpretar. */
export function formatRut(value: string): string {
  const clean = cleanRut(value);
  if (clean.length < 2) return value;
  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${body}-${clean.slice(-1)}`;
}
