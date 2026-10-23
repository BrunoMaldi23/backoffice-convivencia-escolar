/**
 * Arma el cuerpo de una solicitud con solo los campos que la API acepta. La API rechaza con 400 cualquier campo desconocido
 * (`forbidNonWhitelisted`), por lo que un objeto de formulario o de mutación nunca debe enviarse tal cual: por ejemplo,
 * el identificador del registro va en la ruta y no en el cuerpo. Los campos ausentes se omiten; `null` sí se envía.
 */
export function pick<T extends object, K extends keyof T>(source: T, keys: readonly K[]): Pick<T, K> {
  const body = {} as Pick<T, K>;
  for (const key of keys) if (key in source && source[key] !== undefined) body[key] = source[key];
  return body;
}
