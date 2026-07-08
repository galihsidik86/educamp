import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createFixtures, resetDb, disconnectDb, type Fixtures } from './helpers.js';

const app = createApp();
let f: Fixtures;

beforeAll(async () => { await resetDb(); });
beforeEach(async () => { await resetDb(); f = await createFixtures(); });
afterAll(async () => { await resetDb(); await disconnectDb(); });

const creds = () => ({ identifier: f.akademikUser.email, password: f.password });
const cookies = (res: request.Response) => (res.headers['set-cookie'] as unknown as string[] | undefined) ?? [];

describe('Refresh token via cookie httpOnly', () => {
  it('login menyetel cookie httpOnly siakad_rt', async () => {
    const res = await request(app).post('/auth/login').send(creds());
    expect(res.status).toBe(200);
    const rt = cookies(res).find((c) => c.startsWith('siakad_rt='));
    expect(rt).toBeTruthy();
    expect(rt).toMatch(/HttpOnly/i);
  });

  it('refresh TANPA body berhasil memakai cookie (agent membawa cookie otomatis)', async () => {
    const agent = request.agent(app);
    const login = await agent.post('/auth/login').send(creds());
    expect(login.status).toBe(200);
    const ref = await agent.post('/auth/refresh').send({});
    expect(ref.status).toBe(200);
    expect(ref.body.accessToken).toBeTypeOf('string');
  });

  it('logout mencabut sesi → refresh berikutnya via cookie gagal 401', async () => {
    const agent = request.agent(app);
    await agent.post('/auth/login').send(creds());
    const out = await agent.post('/auth/logout').send({});
    expect(out.status).toBe(200);
    const ref = await agent.post('/auth/refresh').send({});
    expect(ref.status).toBe(401);
  });

  it('kompatibilitas: refresh via body (klien lama/test) tetap jalan', async () => {
    const login = await request(app).post('/auth/login').send(creds());
    const ref = await request(app).post('/auth/refresh').send({ refreshToken: login.body.refreshToken });
    expect(ref.status).toBe(200);
    expect(ref.body.accessToken).toBeTypeOf('string');
  });
});
