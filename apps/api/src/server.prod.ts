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

// Path ke web dist. Layout setelah build:
//   apps/api/dist/server.prod.js
//   apps/web/dist/index.html
// Atau saat deploy bersamaan (web-dist di-copy ke ../public):
//   apps/api/dist/server.prod.js
//   apps/api/public/index.html
const webDistCandidates = [
  path.resolve(__dirname, '../../public'),
  path.resolve(__dirname, '../../../web/dist'),
  path.resolve(__dirname, '../../../apps/web/dist'),
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
