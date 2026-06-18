// ============================================================
// Production entry — Domainesia / cPanel Passenger.
// - API routes di-mount di /api/* (strip prefix → existing routes)
// - Static SPA dari apps/web/dist
// - SPA fallback untuk semua route non-/api yang bukan file
// Port: gunakan process.env.PORT (Passenger set otomatis) atau env.API_PORT.
// ============================================================

import 'express-async-errors';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { env } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path ke web dist. __dirname = apps/api/dist
// Kandidat (urutan: yang paling umum dipakai di production lebih dulu):
//   apps/api/public/         (recommended: web-dist di-copy kesini)
//   apps/web/dist/           (monorepo build in-place)
const webDistCandidates = [
  path.resolve(__dirname, '../public'),         // apps/api/dist/../public = apps/api/public
  path.resolve(__dirname, '../../web/dist'),    // apps/api/dist/../../web/dist = apps/web/dist
];
const webDist = webDistCandidates.find((p) => fs.existsSync(path.join(p, 'index.html')));

const outer = express();
const inner = createApp();

// API di /api/*. Strip prefix dengan re-mount sub-app.
outer.use('/api', inner);

if (webDist) {
  console.log(`[prod] Serving SPA from ${webDist}`);
  outer.use(express.static(webDist, { maxAge: '7d', index: false }));
  // SPA fallback (hanya untuk GET, bukan /api/*)
  outer.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(webDist, 'index.html'));
  });
} else {
  console.warn('[prod] web dist tidak ditemukan — SPA tidak akan di-serve.');
}

const port = Number(process.env.PORT) || env.API_PORT;
outer.listen(port, () => {
  console.log(`✓ SIAKAD production listening on port ${port}`);
});
