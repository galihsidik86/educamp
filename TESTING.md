# Tazkia SIAKAD — Testing

Test suite menggunakan **Vitest** + **Supertest** untuk API, dan **Vitest** untuk web helper.

## Struktur

```
apps/api/
├── vitest.config.ts
└── tests/
    ├── setup.ts                  set env var sebelum modul di-import
    ├── unit/
    │   ├── grade.test.ts         skala nilai → huruf → bobot → IPK
    │   ├── password.test.ts      bcrypt hash + verify
    │   └── jwt.test.ts           access/refresh sign + verify + tampering
    └── integration/
        ├── helpers.ts            resetDb + createFixtures + loginAs
        ├── auth.test.ts          login (email/NIM/fail), /me, change-password
        ├── rbac.test.ts          role guards lintas portal
        └── krs.test.ts           penawaran → submit → DPA validate + audit log

apps/web/
└── tests/
    └── format.test.ts            formatRupiah / formatTanggal / formatIp
```

## Jalankan

### Unit tests (cepat, no DB)

```bash
npm run test:unit
```

Ini menjalankan:
- `apps/api`: 3 file unit (grade, password, jwt) — ~30 test cases
- `apps/web`: format helper — ~25 test cases

### Integration tests (perlu test DB)

Integration tests menyentuh MySQL nyata. **Wajib siapkan database test terpisah** dulu, agar data dev/prod tidak tertimpa.

**Setup awal (sekali):**

```bash
# 1. Pastikan MySQL dev sudah jalan (docker compose up -d mysql)

# 2. Buat database `siakad_test`
docker compose exec mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" \
  -e "CREATE DATABASE IF NOT EXISTS siakad_test CHARACTER SET utf8mb4;
      GRANT ALL ON siakad_test.* TO 'siakad'@'%';
      FLUSH PRIVILEGES;"

# 3. Apply migrasi ke siakad_test
cd apps/api
TEST_DATABASE_URL="mysql://siakad:siakad_change_me@localhost:3306/siakad_test" \
  npx prisma migrate deploy
```

**Jalankan integration tests:**

```bash
TEST_DATABASE_URL="mysql://siakad:siakad_change_me@localhost:3306/siakad_test" \
  npm run test:integration
```

> Tip Windows PowerShell:
> ```powershell
> $env:TEST_DATABASE_URL="mysql://siakad:siakad_change_me@localhost:3306/siakad_test"
> npm run test:integration
> ```

### Semua test (unit + integration + web)

```bash
TEST_DATABASE_URL="mysql://siakad:siakad_change_me@localhost:3306/siakad_test" \
  npm run test
```

### Watch mode (development)

```bash
npm --workspace apps/api run test:watch
npm --workspace apps/web  run test:watch
```

## Konvensi

- **Setiap file integration** punya `beforeAll(resetDb + createFixtures)` lalu `afterAll(resetDb + disconnect)` — tabel transactional dibersihkan, koneksi pool ditutup biar Vitest exit clean
- **Fixtures pakai data berbeda** (kode prodi `55201T`, NIM `9999000001`, email `*-t@test.id`) supaya tidak konflik dengan seed dev jika tidak sengaja terjalan di DB yang sama
- **Fire-and-forget side-effects** (audit, notif) di-await dengan `setTimeout 50ms` sebelum di-assert
- **Rate limiting di-skip** di `NODE_ENV=test` (lihat `middleware/rateLimit.ts`) supaya test bebas hit auth endpoint berkali-kali
- **Logger morgan disable** di test env (lihat `src/app.ts`)

## Apa yang diuji

| Area | Unit | Integration |
|---|---|---|
| `lib/grade.ts` | ✅ 21 case (semua threshold huruf, IP roundtrip, null-skip) | — |
| `lib/password.ts` | ✅ hash≠plain, verify true/false, salt unik | — |
| `lib/jwt.ts` | ✅ sign/verify, expired, tampering, secret isolation | — |
| `lib/format.ts` (web) | ✅ Rupiah, tanggal id-locale, IPK 2 desimal | — |
| `POST /auth/login` | — | ✅ email + NIM + 401 salah + validation |
| `GET /auth/me` | — | ✅ tanpa token 401, valid 200, tampered 401 |
| `POST /auth/change-password` | — | ✅ sukses, current salah, min length, refresh revoke |
| Role-based access | — | ✅ silang 3 peran × 3 portal + notifikasi shared |
| KRS happy path | — | ✅ penawaran → add → submit → DPA approve → jadwal terisi |
| Audit log | — | ✅ login.success/fail tercatat |
| Notifikasi | — | ✅ KRS disetujui → notif untuk mahasiswa |

## CI (rekomendasi)

GitHub Actions sketch:

```yaml
# .github/workflows/test.yml
name: test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.4
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: siakad_test
          MYSQL_USER: siakad
          MYSQL_PASSWORD: siakad_pass
        ports: ['3306:3306']
        options: >-
          --health-cmd "mysqladmin ping -uroot -proot"
          --health-interval 10s --health-timeout 5s --health-retries 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: cd apps/api && TEST_DATABASE_URL="mysql://siakad:siakad_pass@localhost:3306/siakad_test" npx prisma migrate deploy
      - run: TEST_DATABASE_URL="mysql://siakad:siakad_pass@localhost:3306/siakad_test" npm test
```

## Catatan menambah test baru

- **Tambah unit test**: file baru di `apps/api/tests/unit/<topic>.test.ts` — tidak butuh setup khusus
- **Tambah integration test**: import `createApp` + helpers, gunakan `beforeAll`/`beforeEach` pattern yang sama. Jangan share state lintas file (Vitest sudah `singleFork`, tapi tetap reset per file)
- **Tambah seed fixture**: edit `helpers.ts → createFixtures()` — pastikan ID/kode unik berakhiran `T`/`Test` agar mudah dikenali
- **Test mutasi yang memicu audit/notif**: tunggu ~50ms (`await new Promise(r => setTimeout(r, 50))`) sebelum query log/notif — side-effect fire-and-forget
