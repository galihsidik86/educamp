import { describe, it, expect } from 'vitest';
import { httpUrl, optionalHttpUrl, intParam, intParamOptional } from '../../src/lib/validators.js';

describe('httpUrl', () => {
  it('menerima http/https', () => {
    expect(httpUrl.safeParse('https://a.test/x').success).toBe(true);
    expect(httpUrl.safeParse('http://a.test').success).toBe(true);
  });

  it('menolak skema berbahaya (javascript:/data:/vbscript:)', () => {
    expect(httpUrl.safeParse('javascript:alert(1)').success).toBe(false);
    expect(httpUrl.safeParse('data:text/html,<script>').success).toBe(false);
    expect(httpUrl.safeParse('vbscript:msgbox').success).toBe(false);
  });

  it('menolak string non-URL', () => {
    expect(httpUrl.safeParse('bukan url').success).toBe(false);
  });
});

describe('optionalHttpUrl', () => {
  it('string kosong / null / undefined → lolos sebagai undefined (tidak diisi)', () => {
    expect(optionalHttpUrl.safeParse('')).toMatchObject({ success: true, data: undefined });
    expect(optionalHttpUrl.safeParse(null)).toMatchObject({ success: true, data: undefined });
    expect(optionalHttpUrl.safeParse(undefined)).toMatchObject({ success: true, data: undefined });
  });

  it('http/https valid → lolos', () => {
    expect(optionalHttpUrl.safeParse('https://drive.test/f').success).toBe(true);
  });

  it('skema berbahaya tetap ditolak', () => {
    expect(optionalHttpUrl.safeParse('javascript:alert(1)').success).toBe(false);
    expect(optionalHttpUrl.safeParse('data:text/html,x').success).toBe(false);
  });
});

describe('intParam', () => {
  it('parse angka valid', () => {
    expect(intParam('50', 100)).toBe(50);
  });

  it('fallback saat NaN / bukan angka', () => {
    expect(intParam('abc', 100)).toBe(100);
    expect(intParam(undefined, 100)).toBe(100);
    expect(intParam(null, 100)).toBe(100);
  });

  it('clamp min & max', () => {
    expect(intParam('9999', 100, { max: 200 })).toBe(200);
    expect(intParam('-5', 100, { min: 0 })).toBe(0);
  });

  it('regresi: input jahat tidak menghasilkan NaN (yang bikin Prisma 500)', () => {
    expect(Number.isNaN(intParam('abc', 100, { min: 1, max: 200 }))).toBe(false);
  });
});

describe('intParamOptional', () => {
  it('angka valid → number', () => {
    expect(intParamOptional('2021')).toBe(2021);
  });

  it('kosong / bukan angka → undefined (bukan NaN)', () => {
    expect(intParamOptional('')).toBeUndefined();
    expect(intParamOptional('abc')).toBeUndefined();
    expect(intParamOptional(undefined)).toBeUndefined();
  });
});
