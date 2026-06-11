import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createFixtures, resetDb, disconnectDb, loginAs, type Fixtures } from './helpers.js';

const app = createApp();
let f: Fixtures;

beforeAll(async () => {
  await resetDb();
  f = await createFixtures();
});

afterAll(async () => {
  await resetDb();
  await disconnectDb();
});

describe('Role-Based Access Control', () => {
  it('mahasiswa hit /akademik/* → 403 FORBIDDEN', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const res = await request(app).get('/akademik/dashboard').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('mahasiswa hit /dosen/* → 403', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const res = await request(app).get('/dosen/dashboard').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('dosen hit /akademik/* → 403', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const res = await request(app).get('/akademik/dashboard').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('dosen hit /mahasiswa/* → 403', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const res = await request(app).get('/mahasiswa/profil').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('akademik hit /mahasiswa/* → 403', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const res = await request(app).get('/mahasiswa/profil').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('tanpa token → 401', async () => {
    const res = await request(app).get('/akademik/dashboard');
    expect(res.status).toBe(401);
  });

  it('peran sesuai → 200', async () => {
    const tokens = {
      mhs: await loginAs(request(app), f.mahasiswa.nim),
      dosen: await loginAs(request(app), f.dosenUser.email),
      akademik: await loginAs(request(app), f.akademikUser.email),
    };

    const [a, b, c] = await Promise.all([
      request(app).get('/mahasiswa/profil').set('Authorization', `Bearer ${tokens.mhs}`),
      request(app).get('/dosen/profil').set('Authorization', `Bearer ${tokens.dosen}`),
      request(app).get('/akademik/profil').set('Authorization', `Bearer ${tokens.akademik}`),
    ]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(c.status).toBe(200);
  });

  it('/notifikasi shared — semua peran boleh akses', async () => {
    const tokens = {
      mhs: await loginAs(request(app), f.mahasiswa.nim),
      dosen: await loginAs(request(app), f.dosenUser.email),
      akademik: await loginAs(request(app), f.akademikUser.email),
    };
    for (const token of Object.values(tokens)) {
      const res = await request(app).get('/notifikasi/unread-count').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(typeof res.body.unread).toBe('number');
    }
  });
});
