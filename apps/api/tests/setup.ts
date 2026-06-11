// ============================================================
// Setup global Vitest — set env vars sebelum modul aplikasi di-import.
// ============================================================

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'a'.repeat(64);
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'b'.repeat(64);
process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
process.env.JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL || '7d';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || 'http://localhost:5173';
process.env.API_PORT = process.env.API_PORT || '4001';

// DATABASE_URL — integration tests gunakan TEST_DATABASE_URL kalau diset,
// jika tidak fallback ke siakad_test pada MySQL lokal.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'mysql://siakad:siakad_change_me@localhost:3306/siakad_test';
