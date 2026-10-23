import { normalizeRut, rutSearchTerm } from './rut';

describe('normalizeRut', () => {
  it.each([['12.345.678-5', '12345678-5'], ['12345678-5', '12345678-5'], ['123456785', '12345678-5'], ['11.111.111-1', '11111111-1'], ['1.000.000-9', '1000000-9']])('normaliza %s', (input, expected) => {
    expect(normalizeRut(input)).toBe(expected);
  });
  it('calcula el dígito K y el cero', () => {
    expect(normalizeRut('6.000.000-k')).toBe('6000000-K');
    expect(normalizeRut('7.000.000-0')).toBeNull();
  });
  it.each(['12.345.678-9', '', 'abc', '1-9', '123456789012', '12.345.678-'])('rechaza %s', (input) => {
    expect(normalizeRut(input)).toBeNull();
  });
  it('arma el término de búsqueda sin puntos ni espacios', () => {
    expect(rutSearchTerm(' 12.345.678-k ')).toBe('12345678-K');
  });
});
