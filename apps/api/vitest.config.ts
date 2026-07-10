import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    // integration tests yang sentuh DB butuh isolasi proses DAN eksekusi
    // berurutan — singleFork saja tidak cukup, tanpa fileParallelism:false
    // file test tetap diinterleave dalam proses yang sama sehingga
    // resetDb() satu file bisa menghapus fixture file lain yang masih
    // berjalan (race condition, gejala: "login gagal 409 foreign key").
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    include: ['tests/**/*.test.ts'],
  },
});
