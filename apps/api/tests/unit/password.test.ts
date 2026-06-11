import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/lib/password.js';

describe('password helpers (bcrypt)', () => {
  it('hashPassword menghasilkan string non-plain', async () => {
    const hash = await hashPassword('password123');
    expect(hash).toBeTypeOf('string');
    expect(hash).not.toBe('password123');
    expect(hash.length).toBeGreaterThan(50);
    // bcrypt $2 format
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('verifyPassword cocok untuk password yang benar', async () => {
    const hash = await hashPassword('secret');
    expect(await verifyPassword('secret', hash)).toBe(true);
  });

  it('verifyPassword gagal untuk password salah', async () => {
    const hash = await hashPassword('secret');
    expect(await verifyPassword('SECRET', hash)).toBe(false);
    expect(await verifyPassword('secret ', hash)).toBe(false);
    expect(await verifyPassword('', hash)).toBe(false);
  });

  it('hash dua kali untuk password sama menghasilkan hash berbeda (salt unik)', async () => {
    const h1 = await hashPassword('same-pw');
    const h2 = await hashPassword('same-pw');
    expect(h1).not.toBe(h2);
    expect(await verifyPassword('same-pw', h1)).toBe(true);
    expect(await verifyPassword('same-pw', h2)).toBe(true);
  });
});
