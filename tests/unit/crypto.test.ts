import { describe, expect, it } from 'vitest';
import { constantTimeEqual, createCredentials, hashSecret, hashVisitor, sha256 } from '../../src/worker/lib/crypto';
describe('anonymous credentials', () => {
  const pepper = 'unit-test-only-not-a-production-secret-value';
  it('generates base32 identifiers and 256-bit secrets without reuse', async () => {
    const first = await createCredentials(pepper), second = await createCredentials(pepper);
    expect(first.id).toMatch(/^[A-Z2-7]{10}$/);
    expect(first.secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.secret_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.secret_hash).not.toContain(first.secret);
    expect(first.id).not.toBe(second.id);
    expect(first.secret).not.toBe(second.secret);
    expect(await hashSecret(first.secret, pepper)).toBe(first.secret_hash);
  });
  it('separates visitor hashes and requires a configured pepper', async () => {
    expect(await hashVisitor('visitor', pepper)).not.toBe(await hashSecret('visitor', pepper));
    await expect(hashSecret('secret', '')).rejects.toThrow('配置');
    expect(await sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('compares full hashes including length differences', () => {
    expect(constantTimeEqual('abcd', 'abcd')).toBe(true);
    expect(constantTimeEqual('abcd', 'abce')).toBe(false);
    expect(constantTimeEqual('abcd', 'abc')).toBe(false);
  });
});
