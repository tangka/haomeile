import { ApiError } from './errors';
export async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
export function requirePepper(pepper: string): void {
  if (!pepper || pepper.length < 32) throw new ApiError('NOT_CONFIGURED', '服务尚未配置完成，请稍后再试。', 503);
}
export function constantTimeEqual(a: string, b: string): boolean {
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return difference === 0;
}
export async function hashSecret(secret: string, pepper: string): Promise<string> {
  requirePepper(pepper);
  return sha256(pepper + secret);
}
export async function hashVisitor(visitor: string, pepper: string): Promise<string> {
  requirePepper(pepper);
  return sha256(visitor + pepper);
}
export async function createCredentials(pepper: string): Promise<{ id: string; secret: string; secret_hash: string }> {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const id = Array.from(crypto.getRandomValues(new Uint8Array(10)), (byte) => alphabet[byte & 31]).join('');
  const secret = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  return { id, secret, secret_hash: await hashSecret(secret, pepper) };
}
