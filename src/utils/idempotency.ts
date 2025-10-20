import { v4 as uuidv4 } from 'uuid';

export function generateIdempotencyKey(): string {
  return uuidv4();
}

export function validateIdempotencyKey(key: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(key);
}