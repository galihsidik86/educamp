import { describe, it, expect } from 'vitest';
import { totalDisetujui, totalTerpakai, hitungStatusTagihan } from '../../src/lib/keuangan.js';

// Fixture pembayaran: campuran status untuk memastikan hanya `disetujui` yang
// dihitung sebagai uang masuk, dan `ditolak` tak pernah menahan sisa.
const pembayaran = [
  { status: 'disetujui', jumlah: 500_000 },
  { status: 'menunggu', jumlah: 300_000 },
  { status: 'ditolak', jumlah: 999_000 },
  { status: 'disetujui', jumlah: 200_000 },
];

describe('totalDisetujui', () => {
  it('hanya menjumlahkan pembayaran berstatus disetujui', () => {
    expect(totalDisetujui(pembayaran)).toBe(700_000);
  });

  it('mengabaikan menunggu & ditolak sepenuhnya', () => {
    expect(totalDisetujui([{ status: 'menunggu', jumlah: 1_000_000 }, { status: 'ditolak', jumlah: 1_000_000 }])).toBe(0);
  });

  it('menerima Decimal-like (string/number) dari Prisma', () => {
    expect(totalDisetujui([{ status: 'disetujui', jumlah: '150000.50' }])).toBe(150000.5);
  });

  it('array kosong → 0', () => {
    expect(totalDisetujui([])).toBe(0);
  });
});

describe('totalTerpakai', () => {
  it('menjumlahkan disetujui + menunggu, mengecualikan ditolak', () => {
    // 500k + 300k + 200k (dua disetujui + satu menunggu), 999k ditolak diabaikan
    expect(totalTerpakai(pembayaran)).toBe(1_000_000);
  });

  it('bukti ditolak tidak menahan sisa tagihan', () => {
    expect(totalTerpakai([{ status: 'ditolak', jumlah: 5_000_000 }])).toBe(0);
  });
});

describe('hitungStatusTagihan', () => {
  it('total disetujui >= tagihan → lunas', () => {
    expect(hitungStatusTagihan(1_000_000, 1_000_000)).toBe('lunas');
    expect(hitungStatusTagihan(1_000_000, 1_200_000)).toBe('lunas');
  });

  it('0 < total < tagihan → cicil', () => {
    expect(hitungStatusTagihan(1_000_000, 400_000)).toBe('cicil');
  });

  it('total 0 → belum_bayar', () => {
    expect(hitungStatusTagihan(1_000_000, 0)).toBe('belum_bayar');
  });

  it('regresi: bukti menunggu saja TIDAK boleh membuat tagihan lunas', () => {
    // Skenario bug lama: 1 tagihan 1jt, hanya ada bukti `menunggu` 1jt.
    const only = [{ status: 'menunggu', jumlah: 1_000_000 }];
    expect(hitungStatusTagihan(1_000_000, totalDisetujui(only))).toBe('belum_bayar');
  });
});
