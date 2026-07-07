import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { createFixtures, resetDb, disconnectDb, loginAs, type Fixtures } from './helpers.js';
import { Jenjang } from '@prisma/client';

const app = createApp();
let f: Fixtures;

beforeAll(async () => { await resetDb(); });
beforeEach(async () => { await resetDb(); f = await createFixtures(); });
afterAll(async () => { await resetDb(); await disconnectDb(); });

function createMk(token: string, prodiId: string, kode: string) {
  return request(app).post('/akademik/mata-kuliah')
    .set('Authorization', `Bearer ${token}`)
    .send({ kode, nama: 'Bahasa Inggris', sks: 2, prodiId, kelompokMatkul: 'MKWU' });
}

describe('MataKuliah — kode unik per prodi (MKWU/MKDU lintas prodi)', () => {
  it('kode sama boleh dipakai di prodi berbeda; duplikat di prodi yang sama ditolak', async () => {
    const token = await loginAs(request(app), 'akademik-t@test.id');
    const prodiSI = await prisma.prodi.create({
      data: { kode: '57201T', nama: 'SI Test', jenjang: Jenjang.s1, fakultasId: f.prodi.fakultasId },
    });

    // ENG-101 di prodi TI → 201
    const a = await createMk(token, f.prodi.id, 'ENG-101');
    expect(a.status).toBe(201);

    // ENG-101 di prodi SI → 201 (regresi: dulu 409 karena kode unik global)
    const b = await createMk(token, prodiSI.id, 'ENG-101');
    expect(b.status).toBe(201);

    // ENG-101 lagi di prodi TI → 409 (duplikat dalam prodi yang sama)
    const c = await createMk(token, f.prodi.id, 'ENG-101');
    expect(c.status).toBe(409);

    // dua baris MK berbeda benar-benar tersimpan
    const count = await prisma.mataKuliah.count({ where: { kode: 'ENG-101' } });
    expect(count).toBe(2);
  });
});
