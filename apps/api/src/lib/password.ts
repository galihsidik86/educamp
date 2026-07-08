import bcrypt from 'bcryptjs';

const ROUNDS = 10;

export const hashPassword = (plain: string) => bcrypt.hash(plain, ROUNDS);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

/**
 * Hash dummy (dihitung sekali saat modul dimuat) untuk menyeragamkan waktu
 * respons login ketika user TIDAK ditemukan. Tanpa ini, path "user tak ada"
 * balik instan sementara path "user ada" menjalankan bcrypt → beda waktu
 * membocorkan keberadaan akun (enumerasi user via timing).
 */
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync('timing-equalizer-not-a-real-password', ROUNDS);
