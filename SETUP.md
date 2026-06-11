# Tazkia SIAKAD — Setup (Development)

> Untuk **deploy produksi**, lihat **[DEPLOY.md](./DEPLOY.md)**.

## Prasyarat
- **Node.js >= 20** + npm
- **Docker Desktop** (untuk MySQL + Adminer)
- Port bebas: 3306 (MySQL), 4000 (API), 5173 (Web), 8080 (Adminer)

## Quick start (mode lokal, DB di Docker)

```bash
# 1. Salin env
cp .env.example .env
# (opsional) ganti JWT secrets — perintah node ada di komentar .env.example

# 2. Nyalakan MySQL + Adminer saja (api/web jalan di host)
docker compose up -d mysql adminer

# 3. Install deps semua workspace
npm install

# 4. Generate Prisma client + jalankan migrasi awal + seed
npm run prisma:migrate
npm run prisma:seed

# 5. Jalankan API + Web bersamaan
npm run dev
```

Buka:
- Web: http://localhost:5173
- API health: http://localhost:4000/health
- Adminer (DB GUI): http://localhost:8080 (server: `mysql`, user: `siakad`, db: `siakad_tazkia`)

## Akun seed default

| Peran     | Email                       | Password   |
|-----------|-----------------------------|------------|
| Akademik  | akademik@tazkia.ac.id       | password123 |
| Dosen     | dosen.budi@tazkia.ac.id     | password123 |
| Dosen     | dosen.siti@tazkia.ac.id     | password123 |
| Mahasiswa | aisyah@student.tazkia.ac.id | password123 |
| Mahasiswa | rizky@student.tazkia.ac.id  | password123 |
| Mahasiswa | farah@student.tazkia.ac.id  | password123 |

Mahasiswa juga bisa login pakai NIM (auto-resolved ke email).

## Mode full Docker (semua kontainer)

```bash
cp .env.example .env
docker compose up -d
# tunggu mysql healthy, lalu migrasi:
docker compose exec api npm run prisma:migrate
docker compose exec api npm run prisma:seed
```

## Skrip umum

```bash
npm run dev              # API + Web paralel
npm run dev:api          # API saja
npm run dev:web          # Web saja
npm run prisma:studio    # GUI Prisma di port 5555
npm run db:reset         # DROP + recreate + seed (destruktif)
npm run docker:up        # Semua kontainer
npm run docker:down      # Stop semua
```

## Struktur folder

```
stmik/
├── apps/
│   ├── api/                Node + Express + Prisma + MySQL
│   │   ├── prisma/         schema.prisma, seed.ts, migrations/
│   │   └── src/
│   │       ├── modules/    Per-domain (auth, mahasiswa, dosen, akademik, krs, nilai, …)
│   │       ├── lib/        jwt, password, errors
│   │       └── middleware/ auth, error, requestId
│   └── web/                Vite + React + TS
│       ├── src/
│       │   ├── lib/        api client, auth context, query client
│       │   ├── routes/     login + per-peran (mahasiswa, dosen, akademik)
│       │   └── ds/         re-export design system dari root via alias @ds
│       └── vite.config.ts
├── components/             Design system (sumber tunggal — JANGAN diduplikasi)
├── tokens/  styles.css     Design system
├── ui_kits/siakad/         Prototype lama (tetap, untuk referensi visual)
├── docker-compose.yml
├── .env.example
└── package.json            workspace root
```

## Troubleshooting

- **MySQL menolak koneksi**: tunggu beberapa detik setelah `docker compose up` (healthcheck butuh ~15s pada first boot).
- **Prisma error "P1001 Can't reach database"**: pastikan `DATABASE_URL` di `.env` pakai host `localhost` (mode lokal) atau `mysql` (di dalam container).
- **Port bentrok**: ubah `MYSQL_PORT`/`API_PORT`/`WEB_PORT` di `.env`.
