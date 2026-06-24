import { createApp } from './app.js';
import { env } from './env.js';
import { refreshSkalaNilai } from './lib/grade.js';

const app = createApp();
app.listen(env.API_PORT, async () => {
  console.log(`✓ SIAKAD API listening on http://localhost:${env.API_PORT} (${env.NODE_ENV})`);
  // Load skala nilai dari DB ke cache (fallback default kalau row belum ada)
  await refreshSkalaNilai();
});
