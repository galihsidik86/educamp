import { createApp } from './app.js';
import { env } from './env.js';

const app = createApp();
app.listen(env.API_PORT, () => {
  console.log(`✓ SIAKAD API listening on http://localhost:${env.API_PORT} (${env.NODE_ENV})`);
});
