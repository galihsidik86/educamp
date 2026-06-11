import { describe, it, expect } from 'vitest';
import {
  formatRupiah, formatTanggal, formatTanggalWaktu,
  capitalize, formatStatus, formatIp,
} from '../src/lib/format';

describe('formatRupiah', () => {
  // Intl.NumberFormat id-ID pakai NBSP (U+00A0) sebagai pemisah simbol mata uang
  const NBSP = '\u00A0';

  it('format dengan grouping ID', () => {
    expect(formatRupiah(0)).toBe(`Rp${NBSP}0`);
    expect(formatRupiah(1500)).toBe(`Rp${NBSP}1.500`);
    expect(formatRupiah(4500000)).toBe(`Rp${NBSP}4.500.000`);
  });

  it('membulatkan ke integer', () => {
    expect(formatRupiah(1234.56)).toBe(`Rp${NBSP}1.235`);
  });
});

describe('formatTanggal', () => {
  it('format pendek default', () => {
    const d = new Date('2025-08-12T03:00:00Z');
    const out = formatTanggal(d);
    expect(out).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4}$/);
    expect(out).toContain('Agu');
  });

  it('format panjang', () => {
    const d = new Date('2025-01-15T03:00:00Z');
    expect(formatTanggal(d, { long: true })).toContain('Januari');
  });

  it('nullish → em dash', () => {
    expect(formatTanggal(null)).toBe('—');
    expect(formatTanggal(undefined)).toBe('—');
  });

  it('string tidak valid → em dash', () => {
    expect(formatTanggal('bukan-tanggal')).toBe('—');
  });

  it('format ISO string', () => {
    expect(formatTanggal('2025-12-25T00:00:00Z')).toContain('Des');
    expect(formatTanggal('2025-12-25T00:00:00Z')).toContain('2025');
  });
});

describe('formatTanggalWaktu', () => {
  it('include jam menit + WIB', () => {
    const out = formatTanggalWaktu('2025-08-12T03:00:00Z');
    expect(out).toMatch(/WIB$/);
  });

  it('null → em dash', () => {
    expect(formatTanggalWaktu(null)).toBe('—');
  });
});

describe('capitalize', () => {
  it.each([
    ['senin', 'Senin'],
    ['budi', 'Budi'],
    ['a', 'A'],
    ['', ''],
  ])('"%s" → "%s"', (input, expected) => {
    expect(capitalize(input)).toBe(expected);
  });
});

describe('formatStatus', () => {
  it('replace underscore + capitalize', () => {
    expect(formatStatus('belum_bayar')).toBe('Belum bayar');
    expect(formatStatus('jatuh_tempo')).toBe('Jatuh tempo');
    expect(formatStatus('lektor_kepala')).toBe('Lektor kepala');
  });

  it('single word OK', () => {
    expect(formatStatus('aktif')).toBe('Aktif');
  });
});

describe('formatIp', () => {
  it('format 2 desimal', () => {
    expect(formatIp(3.5)).toBe('3.50');
    // (3.625).toFixed(2) → "3.63" (round half-up)
    expect(formatIp(3.625)).toBe('3.63');
    expect(formatIp(4)).toBe('4.00');
  });

  it('null / undefined → em dash', () => {
    expect(formatIp(null)).toBe('—');
    expect(formatIp(undefined)).toBe('—');
  });

  it('0 → 0.00 (bukan em dash)', () => {
    expect(formatIp(0)).toBe('0.00');
  });
});
