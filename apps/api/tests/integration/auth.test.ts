import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createFixtures, resetDb, disconnectDb, type Fixtures } from './helpers.js';

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

describe('POST /auth/login', () => {
  it('berhasil login pakai email + password benar', async () => {
    const res = await request(app).post('/auth/login').send({
      identifier: f.akademikUser.email,
      password: f.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTypeOf('string');
    expect(res.body.refreshToken).toBeTypeOf('string');
    expect(res.body.user.role).toBe('akademik');
  });

  it('berhasil login mahasiswa pakai NIM', async () => {
    const res = await request(app).post('/auth/login').send({
      identifier: f.mahasiswa.nim,
      password: f.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('mahasiswa');
  });

  it('gagal login dengan password salah → 401', async () => {
    const res = await request(app).post('/auth/login').send({
      identifier: f.akademikUser.email,
      password: 'salah-banget',
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('gagal login dengan email tidak terdaftar → 401', async () => {
    const res = await request(app).post('/auth/login').send({
      identifier: 'tidak-ada@test.id',
      password: f.password,
    });
    expect(res.status).toBe(401);
  });

  it('validasi body kosong → 400 VALIDATION_ERROR', async () => {
    const res = await request(app).post('/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /auth/me', () => {
  it('tanpa token → 401', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('dengan token valid → return profile', async () => {
    const login = await request(app).post('/auth/login').send({
      identifier: f.mahasiswa.nim, password: f.password,
    });
    const token = login.body.accessToken;
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(f.mahasiswaUser.email);
    expect(res.body.role).toBe('mahasiswa');
    expect(res.body.mahasiswa.nim).toBe(f.mahasiswa.nim);
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('token rusak → 401', async () => {
    const res = await request(app).get('/auth/me').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
  });
});

describe('POST /auth/change-password', () => {
  beforeEach(async () => {
    await resetDb();
    f = await createFixtures();
  });

  it('berhasil ganti password + revoke refresh token', async () => {
    const login = await request(app).post('/auth/login').send({
      identifier: f.mahasiswa.nim, password: f.password,
    });
    const oldRefresh = login.body.refreshToken;
    const access = login.body.accessToken;

    const change = await request(app).post('/auth/change-password')
      .set('Authorization', `Bearer ${access}`)
      .send({ currentPassword: f.password, newPassword: 'newPasswordKuat99' });
    expect(change.status).toBe(200);
    expect(change.body.ok).toBe(true);

    // login dengan password baru → OK
    const re = await request(app).post('/auth/login').send({
      identifier: f.mahasiswa.nim, password: 'newPasswordKuat99',
    });
    expect(re.status).toBe(200);

    // refresh token lama sudah di-revoke
    const refResp = await request(app).post('/auth/refresh').send({ refreshToken: oldRefresh });
    expect(refResp.status).toBe(401);
  });

  it('gagal kalau current password salah', async () => {
    const login = await request(app).post('/auth/login').send({
      identifier: f.mahasiswa.nim, password: f.password,
    });
    const change = await request(app).post('/auth/change-password')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ currentPassword: 'salah', newPassword: 'newPasswordKuat99' });
    expect(change.status).toBe(400);
    expect(change.body.error.message).toMatch(/password lama salah/i);
  });

  it('gagal kalau new password < 8 char', async () => {
    const login = await request(app).post('/auth/login').send({
      identifier: f.mahasiswa.nim, password: f.password,
    });
    const change = await request(app).post('/auth/change-password')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ currentPassword: f.password, newPassword: 'short' });
    expect(change.status).toBe(400);
  });
});
