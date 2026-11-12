import { z } from 'zod';

/** Only plain JSON objects have protocol field names; arrays preserve their order. */
export function transformKeys(
  value: unknown,
  transform: (key: string) => string,
): unknown {
  if (Array.isArray(value))
    return value.map((item) => transformKeys(item, transform));
  if (
    value !== null &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  )
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        transform(key),
        transformKeys(item, transform),
      ]),
    );
  return value;
}

export const toSnakeKey = (key: string) =>
  key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
export const toCamelKey = (key: string) =>
  key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());

export const apiEnvelopeSchema = z.object({
  requestId: z.string().min(1),
  code: z.number().int(),
  message: z.string(),
  data: z.unknown(),
});

export interface ApiEnvelope<T> {
  requestId: string;
  code: number;
  message: string;
  data: T;
}
