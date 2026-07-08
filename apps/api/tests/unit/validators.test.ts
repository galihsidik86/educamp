import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { httpUrl, optionalHttpUrl, externalHttpUrl, dateString, intParam, intParamOptional } from '../../src/lib/validators.js';

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
  it('string kosong / null → dipetakan ke null (bukan undefined)', () => {
    expect(optionalHttpUrl.safeParse('')).toMatchObject({ success: true, data: null });
    expect(optionalHttpUrl.safeParse(null)).toMatchObject({ success: true, data: null });
  });

  it('http/https valid → lolos', () => {
    expect(optionalHttpUrl.safeParse('https://drive.test/f').success).toBe(true);
  });

  it('skema berbahaya tetap ditolak', () => {
    expect(optionalHttpUrl.safeParse('javascript:alert(1)').success).toBe(false);
    expect(optionalHttpUrl.safeParse('data:text/html,x').success).toBe(false);
  });

  it('regresi: dalam .partial(), key absen = tak berubah (undefined) tapi "" = dikosongkan (null)', () => {
    const schema = z.object({ fileUrl: optionalHttpUrl }).partial();
    expect(schema.parse({}).fileUrl).toBeUndefined();          // absen → Prisma abaikan
    expect(schema.parse({ fileUrl: '' }).fileUrl).toBeNull();  // '' → Prisma set null (clear)
    expect(schema.parse({ fileUrl: 'https://a.test/x' }).fileUrl).toBe('https://a.test/x');
  });
});

describe('externalHttpUrl (anti-SSRF)', () => {
  it('host publik & LAN privat diizinkan (Neo Feeder bisa on-prem)', () => {
    expect(externalHttpUrl.safeParse('https://feeder.pddikti.go.id/ws').success).toBe(true);
    expect(externalHttpUrl.safeParse('http://192.168.1.10:8080').success).toBe(true);
    expect(externalHttpUrl.safeParse('http://10.0.0.5').success).toBe(true);
  });

  it('loopback / link-local / metadata cloud ditolak', () => {
    expect(externalHttpUrl.safeParse('http://localhost/x').success).toBe(false);
    expect(externalHttpUrl.safeParse('http://127.0.0.1').success).toBe(false);
    expect(externalHttpUrl.safeParse('http://169.254.169.254/latest/meta-data').success).toBe(false);
    expect(externalHttpUrl.safeParse('http://[::1]/').success).toBe(false);
  });

  it('skema non-http tetap ditolak', () => {
    expect(externalHttpUrl.safeParse('javascript:alert(1)').success).toBe(false);
  });
});

describe('dateString', () => {
  it('tanggal valid lolos; string rusak & kosong ditolak (cegah Invalid Date → 500)', () => {
    expect(dateString.safeParse('2026-12-31').success).toBe(true);
    expect(dateString.safeParse('2026-12-31T10:00:00Z').success).toBe(true);
    expect(dateString.safeParse('bukan-tanggal').success).toBe(false);
    expect(dateString.safeParse('').success).toBe(false);
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
