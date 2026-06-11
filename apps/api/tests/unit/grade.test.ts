import { describe, it, expect } from 'vitest';
import { angkaToHuruf, hurufToBobot, calculateIp } from '../../src/lib/grade.js';

describe('angkaToHuruf', () => {
  it.each([
    [100, 'A'], [90, 'A'], [85, 'A'],
    [84, 'AB'], [80, 'AB'], [75, 'AB'],
    [74, 'B'], [72, 'B'], [70, 'B'],
    [69, 'BC'], [67, 'BC'], [65, 'BC'],
    [64, 'C'], [60, 'C'], [56, 'C'],
    [55, 'D'], [50, 'D'], [40, 'D'],
    [39, 'E'], [10, 'E'], [0, 'E'],
  ] as const)('nilai %i → huruf %s', (angka, huruf) => {
    expect(angkaToHuruf(angka)).toBe(huruf);
  });
});

describe('hurufToBobot', () => {
  it('memetakan huruf ke bobot skala 4', () => {
    expect(hurufToBobot('A')).toBe(4.0);
    expect(hurufToBobot('AB')).toBe(3.5);
    expect(hurufToBobot('B')).toBe(3.0);
    expect(hurufToBobot('BC')).toBe(2.5);
    expect(hurufToBobot('C')).toBe(2.0);
    expect(hurufToBobot('D')).toBe(1.0);
    expect(hurufToBobot('E')).toBe(0.0);
  });

  it('huruf tidak dikenal → 0', () => {
    expect(hurufToBobot('Z')).toBe(0);
    expect(hurufToBobot('')).toBe(0);
  });
});

describe('calculateIp', () => {
  it('return 0 kalau total SKS 0', () => {
    expect(calculateIp([])).toEqual({ ip: 0, totalSks: 0 });
    expect(calculateIp([{ sks: 3, bobot: null }])).toEqual({ ip: 0, totalSks: 0 });
  });

  it('hitung IP semester dengan benar (3 MK)', () => {
    const r = calculateIp([
      { sks: 3, bobot: 4.0 },  // 12
      { sks: 3, bobot: 3.5 },  // 10.5
      { sks: 2, bobot: 3.0 },  // 6
    ]);
    // total mutu 28.5 / 8 sks = 3.5625 → bulatkan 2 desimal = 3.56
    expect(r.ip).toBe(3.56);
    expect(r.totalSks).toBe(8);
  });

  it('abaikan item dengan bobot null saat hitung', () => {
    const r = calculateIp([
      { sks: 3, bobot: 4.0 },
      { sks: 3, bobot: null }, // skip
      { sks: 2, bobot: 2.0 },
    ]);
    // 12 + 4 = 16 / 5 = 3.2
    expect(r.ip).toBe(3.2);
    expect(r.totalSks).toBe(5);
  });

  it('IPK 4.00 sempurna', () => {
    const r = calculateIp([
      { sks: 3, bobot: 4.0 },
      { sks: 3, bobot: 4.0 },
      { sks: 2, bobot: 4.0 },
    ]);
    expect(r.ip).toBe(4.0);
    expect(r.totalSks).toBe(8);
  });
});
