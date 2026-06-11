import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  signAccessToken, verifyAccessToken,
  signRefreshToken, verifyRefreshToken,
  hashToken,
} from '../../src/lib/jwt.js';

describe('JWT helpers', () => {
  it('access token: sign → verify roundtrip mengembalikan payload sama', () => {
    const token = signAccessToken({ sub: 'user-1', role: 'mahasiswa', email: 'a@b.id' });
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('user-1');
    expect(decoded.role).toBe('mahasiswa');
    expect(decoded.email).toBe('a@b.id');
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });

  it('refresh token: sign → verify roundtrip OK', () => {
    const token = signRefreshToken({ sub: 'user-2', jti: 'jti-abc' });
    const decoded = verifyRefreshToken(token);
    expect(decoded.sub).toBe('user-2');
    expect(decoded.jti).toBe('jti-abc');
  });

  it('verifyAccessToken throw untuk token tampered', () => {
    const valid = signAccessToken({ sub: 'x', role: 'dosen', email: 'a@b.id' });
    const tampered = valid.slice(0, -2) + 'XX';
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it('access secret ≠ refresh secret — access tidak bisa verify dengan refresh', () => {
    const access = signAccessToken({ sub: 'x', role: 'dosen', email: 'a@b.id' });
    expect(() => verifyRefreshToken(access)).toThrow();
  });

  it('hashToken: SHA-256 hex 64 char deterministik', () => {
    const h1 = hashToken('abc');
    const h2 = hashToken('abc');
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken('abd')).not.toBe(h1);
  });

  it('token expired → verifyAccessToken throw TokenExpiredError', () => {
    const token = jwt.sign(
      { sub: 'x', role: 'mahasiswa', email: 'a@b.id' },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '-1m' },
    );
    expect(() => verifyAccessToken(token)).toThrow(/jwt expired/);
  });
});
