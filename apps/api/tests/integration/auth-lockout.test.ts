import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createFixtures, resetDb, disconnectDb, type Fixtures } from './helpers.js';

const app = createApp();
let f: Fixtures;

beforeAll(async () => { await resetDb(); });
beforeEach(async () => { await resetDb(); f = await createFixtures(); });
afterAll(async () => { await resetDb(); await disconnectDb(); });

describe('Login lockout per-akun (anti brute-force, NAT-friendly)', () => {
  it('10 gagal → akun terkunci; password BENAR pun ditolak selama masa kunci', async () => {
    const id = f.akademikUser.email;
    for (let i = 0; i < 10; i++) {
      const r = await request(app).post('/auth/login').send({ identifier: id, password: 'salah-terus' });
      expect(r.status).toBe(401);
    }
    const locked = await request(app).post('/auth/login').send({ identifier: id, password: f.password });
    expect(locked.status).toBe(401);
    expect(locked.body.error.message).toMatch(/terkunci/i);
  });

  it('gagal < ambang lalu login sukses → counter direset (tidak terkunci)', async () => {
    const id = f.akademikUser.email;
    for (let i = 0; i < 3; i++) {
      await request(app).post('/auth/login').send({ identifier: id, password: 'salah' });
    }
    const ok = await request(app).post('/auth/login').send({ identifier: id, password: f.password });
    expect(ok.status).toBe(200);
  });
});
