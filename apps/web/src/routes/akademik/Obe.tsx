import { useMemo, useState } from 'react';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { Plus, Pencil, Trash2, Target, Link2, ChevronRight, Sparkles, Search } from 'lucide-react';
import {
  useCpl, useCplActions, useCpmk, useCpmkActions,
  type Cpl, type Cpmk, type CplInput, type CpmkInput, type AspekCpl,
} from '@/lib/queries-obe';
import { useProdi, useMataKuliah } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { ApiError } from '@/lib/api';

const ASPEK_LABEL: Record<AspekCpl, string> = {
  sikap: 'Sikap',
  pengetahuan: 'Pengetahuan',
  ketrampilan_umum: 'Keterampilan Umum',
  ketrampilan_khusus: 'Keterampilan Khusus',
};

export function AkademikObe() {
  const [tab, setTab] = useState<'cpl' | 'cpmk'>('cpl');

  return (
    <div className="stack">
      <PageHead
        eyebrow="OBE"
        title="Capaian Pembelajaran"
        subtitle="Kelola CPL (lulusan) per prodi dan CPMK (mata kuliah) + mapping kontribusi untuk laporan akreditasi BAN-PT."
      />

      <div className="row" style={{ gap: 'var(--space-2)' }}>
        <Button size="sm" variant={tab === 'cpl' ? 'primary' : 'ghost'} leftIcon={<Target size={14} />} onClick={() => setTab('cpl')}>CPL (Prodi)</Button>
        <Button size="sm" variant={tab === 'cpmk' ? 'primary' : 'ghost'} leftIcon={<Sparkles size={14} />} onClick={() => setTab('cpmk')}>CPMK (Mata Kuliah)</Button>
      </div>

      {tab === 'cpl' ? <CplTab /> : <CpmkTab />}
    </div>
  );
}

function CplTab() {
  const prodi = useProdi();
  const [prodiId, setProdiId] = useState('');
  const { data, isLoading, error } = useCpl({ prodiId: prodiId || undefined });
  const actions = useCplActions();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Cpl | null>(null);
  const [form, setForm] = useState<Partial<CplInput>>({ aspek: 'sikap', urutan: 0, isAktif: true });
  const [actErr, setActErr] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ prodiId: prodiId || prodi.data?.items[0]?.id, aspek: 'sikap', urutan: 0, isAktif: true });
    setActErr(null);
    setModalOpen(true);
  };
  const openEdit = (c: Cpl) => {
    setEditing(c);
    setForm({ prodiId: c.prodiId, kode: c.kode, deskripsi: c.deskripsi, aspek: c.aspek, urutan: c.urutan, isAktif: c.isAktif });
    setActErr(null);
    setModalOpen(true);
  };

  const save = async () => {
    setActErr(null);
    if (!form.prodiId || !form.kode || !form.deskripsi || !form.aspek) { setActErr('Semua field wajib'); return; }
    try {
      if (editing) await actions.update.mutateAsync({ id: editing.id, patch: form });
      else await actions.create.mutateAsync(form as CplInput);
      setModalOpen(false);
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const onDelete = async (c: Cpl) => {
    if (!confirm(`Hapus CPL ${c.kode}?`)) return;
    setActErr(null);
    try { await actions.remove.mutateAsync(c.id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  // Group by aspek
  const grouped: Record<AspekCpl, Cpl[]> = { sikap: [], pengetahuan: [], ketrampilan_umum: [], ketrampilan_khusus: [] };
  for (const c of data?.items ?? []) grouped[c.aspek].push(c);

  return (
    <>
      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 240 }}>
          <Select label="Prodi" value={prodiId} onChange={(e) => setProdiId((e.target as HTMLSelectElement).value)}>
            <option value="">Semua prodi</option>
            {prodi.data?.items.map((p) => <option key={p.id} value={p.id}>{p.kode} — {p.nama}</option>)}
          </Select>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>Tambah CPL</Button>
      </div>

      {isLoading && <p className="muted">Memuat…</p>}

      {(Object.keys(grouped) as AspekCpl[]).map((aspek) => grouped[aspek].length > 0 && (
        <Card key={aspek}>
          <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-2)' }}>
            {ASPEK_LABEL[aspek]}
          </div>
          <div className="stack">
            {grouped[aspek].map((c) => (
              <div key={c.id} className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ flex: 1 }}>
                  <strong className="mono">{c.kode}</strong>
                  {!c.isAktif && <span className="pill pill--neutral" style={{ marginLeft: 8 }}>Nonaktif</span>}
                  <span className="pill pill--neutral" style={{ marginLeft: 8 }}>{c._count?.cpmk ?? 0} CPMK</span>
                  <p className="muted" style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)' }}>{c.deskripsi}</p>
                </div>
                <div className="row" style={{ gap: 4 }}>
                  <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => openEdit(c)}>Ubah</Button>
                  <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(c)}>Hapus</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada CPL">Klik "Tambah CPL" untuk mendefinisikan capaian pembelajaran lulusan prodi.</Alert>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Ubah CPL' : 'CPL baru'} width={620}>
        <div className="stack" style={{ padding: 'var(--space-4)' }}>
          {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
          <Select label="Prodi" value={form.prodiId ?? ''} onChange={(e) => setForm({ ...form, prodiId: (e.target as HTMLSelectElement).value })} disabled={!!editing}>
            <option value="">— pilih prodi —</option>
            {prodi.data?.items.map((p) => <option key={p.id} value={p.id}>{p.kode} — {p.nama}</option>)}
          </Select>
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 1 }}>
              <Input label="Kode" value={form.kode ?? ''} onChange={(e) => setForm({ ...form, kode: (e.target as HTMLInputElement).value })} placeholder="CPL-1, S1, P1" />
            </div>
            <div style={{ flex: 1 }}>
              <Select label="Aspek" value={form.aspek ?? 'sikap'} onChange={(e) => setForm({ ...form, aspek: (e.target as HTMLSelectElement).value as AspekCpl })}>
                {(Object.keys(ASPEK_LABEL) as AspekCpl[]).map((a) => <option key={a} value={a}>{ASPEK_LABEL[a]}</option>)}
              </Select>
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Urutan" type="number" min={0} value={String(form.urutan ?? 0)} onChange={(e) => setForm({ ...form, urutan: Number((e.target as HTMLInputElement).value) })} />
            </div>
          </div>
          <div>
            <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Deskripsi CPL</label>
            <textarea
              value={form.deskripsi ?? ''}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
              rows={4}
              className="tz-input"
              style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
              placeholder="Lulusan mampu …"
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)' }}>
            <input type="checkbox" checked={form.isAktif ?? true} onChange={(e) => setForm({ ...form, isAktif: e.target.checked })} />
            Aktif
          </label>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" disabled={actions.create.isPending || actions.update.isPending} onClick={save}>Simpan</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function CpmkTab() {
  const mk = useMataKuliah();
  const [mataKuliahId, setMataKuliahId] = useState('');
  const { data, isLoading, error } = useCpmk(mataKuliahId || undefined);
  const actions = useCpmkActions();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Cpmk | null>(null);
  const [form, setForm] = useState<Partial<CpmkInput>>({ bobotPenilaian: 1.0, ambangTercapai: 56, urutan: 0, isAktif: true });
  const [actErr, setActErr] = useState<string | null>(null);
  const [mapFor, setMapFor] = useState<Cpmk | null>(null);
  const [q, setQ] = useState('');

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return data?.items ?? [];
    return (data?.items ?? []).filter((c) =>
      c.kode.toLowerCase().includes(query) ||
      c.deskripsi.toLowerCase().includes(query) ||
      (c.mataKuliah?.kode ?? '').toLowerCase().includes(query),
    );
  }, [data, q]);

  const openCreate = () => {
    setEditing(null);
    setForm({ mataKuliahId: mataKuliahId || mk.data?.items[0]?.id, bobotPenilaian: 1.0, ambangTercapai: 56, urutan: 0, isAktif: true });
    setActErr(null);
    setModalOpen(true);
  };
  const openEdit = (c: Cpmk) => {
    setEditing(c);
    setForm({
      mataKuliahId: c.mataKuliahId, kode: c.kode, deskripsi: c.deskripsi,
      bobotPenilaian: c.bobotPenilaian, ambangTercapai: c.ambangTercapai,
      urutan: c.urutan, isAktif: c.isAktif,
    });
    setActErr(null);
    setModalOpen(true);
  };

  const save = async () => {
    setActErr(null);
    if (!form.mataKuliahId || !form.kode || !form.deskripsi) { setActErr('Semua field wajib'); return; }
    try {
      if (editing) await actions.update.mutateAsync({ id: editing.id, patch: form });
      else await actions.create.mutateAsync(form as CpmkInput);
      setModalOpen(false);
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const onDelete = async (c: Cpmk) => {
    if (!confirm(`Hapus CPMK ${c.kode}?`)) return;
    setActErr(null);
    try { await actions.remove.mutateAsync(c.id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <>
      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 280 }}>
          <Select label="Mata Kuliah" value={mataKuliahId} onChange={(e) => setMataKuliahId((e.target as HTMLSelectElement).value)}>
            <option value="">Semua MK</option>
            {mk.data?.items.map((m) => <option key={m.id} value={m.id}>{m.kode} — {m.nama}</option>)}
          </Select>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>Tambah CPMK</Button>
        {data && data.items.length > 0 && (
          <div style={{ flex: 1, minWidth: 240, maxWidth: 340 }}>
            <Input
              icon={<Search size={16} />}
              placeholder="Cari kode atau deskripsi…"
              value={q}
              onChange={(e) => setQ((e.target as HTMLInputElement).value)}
            />
          </div>
        )}
      </div>

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length > 0 && items.length === 0 && (
        <p className="muted">Tidak ada CPMK yang cocok dengan &ldquo;{q.trim()}&rdquo;.</p>
      )}

      <Card>
        <div className="tz-table-wrap">
          <table className="tz-table">
            <thead>
              <tr>
                <th>Mata Kuliah</th>
                <th>Kode</th>
                <th>Deskripsi</th>
                <th className="num">Bobot</th>
                <th className="num">Ambang</th>
                <th>CPL Ter-mapping</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.length === 0 && <tr><td colSpan={7} className="muted center">Belum ada CPMK.</td></tr>}
              {items.map((c) => (
                <tr key={c.id} style={{ opacity: c.isAktif ? 1 : 0.6 }}>
                  <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>{c.mataKuliah?.kode}</td>
                  <td className="mono"><strong>{c.kode}</strong></td>
                  <td>{c.deskripsi}</td>
                  <td className="num mono">{c.bobotPenilaian.toFixed(2)}</td>
                  <td className="num mono">{c.ambangTercapai}</td>
                  <td>
                    {(c.cpl ?? []).length === 0 ? <span className="muted">—</span> : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {c.cpl!.map((m) => (
                          <span key={m.cpl.id} className="pill pill--neutral" title={m.cpl.deskripsi}>
                            {m.cpl.kode} <span className="mono">({m.bobot.toFixed(2)})</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                      <Button size="sm" variant="ghost" leftIcon={<Link2 size={12} />} onClick={() => setMapFor(c)}>Map CPL</Button>
                      <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => openEdit(c)}>Ubah</Button>
                      <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(c)}>Hapus</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Ubah CPMK' : 'CPMK baru'} width={640}>
        <div className="stack" style={{ padding: 'var(--space-4)' }}>
          {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
          <Select label="Mata Kuliah" value={form.mataKuliahId ?? ''} onChange={(e) => setForm({ ...form, mataKuliahId: (e.target as HTMLSelectElement).value })} disabled={!!editing}>
            <option value="">— pilih MK —</option>
            {mk.data?.items.map((m) => <option key={m.id} value={m.id}>{m.kode} — {m.nama}</option>)}
          </Select>
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 1 }}>
              <Input label="Kode" value={form.kode ?? ''} onChange={(e) => setForm({ ...form, kode: (e.target as HTMLInputElement).value })} placeholder="CPMK-1, M1" />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Bobot Penilaian" type="number" step="0.05" min={0} max={10} value={String(form.bobotPenilaian ?? 1.0)} onChange={(e) => setForm({ ...form, bobotPenilaian: Number((e.target as HTMLInputElement).value) })} />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Ambang Tercapai" type="number" min={0} max={100} value={String(form.ambangTercapai ?? 56)} onChange={(e) => setForm({ ...form, ambangTercapai: Number((e.target as HTMLInputElement).value) })} />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Urutan" type="number" min={0} value={String(form.urutan ?? 0)} onChange={(e) => setForm({ ...form, urutan: Number((e.target as HTMLInputElement).value) })} />
            </div>
          </div>
          <div>
            <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Deskripsi CPMK</label>
            <textarea
              value={form.deskripsi ?? ''}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
              rows={4}
              className="tz-input"
              style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
              placeholder="Mahasiswa mampu …"
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)' }}>
            <input type="checkbox" checked={form.isAktif ?? true} onChange={(e) => setForm({ ...form, isAktif: e.target.checked })} />
            Aktif
          </label>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" disabled={actions.create.isPending || actions.update.isPending} onClick={save}>Simpan</Button>
          </div>
        </div>
      </Modal>

      {mapFor && <MappingModal cpmk={mapFor} onClose={() => setMapFor(null)} />}
    </>
  );
}

function MappingModal({ cpmk, onClose }: { cpmk: Cpmk; onClose: () => void }) {
  const cplList = useCpl({ prodiId: undefined });
  const actions = useCpmkActions();
  const [cplId, setCplId] = useState('');
  const [bobot, setBobot] = useState(0.5);
  const [err, setErr] = useState<string | null>(null);

  // Prodi dari MK
  const mkProdiCpl = (cplList.data?.items ?? []).filter((c) => true); // backend already filters; show all
  const existing = new Set(cpmk.cpl?.map((m) => m.cpl.id) ?? []);

  const addMap = async () => {
    setErr(null);
    if (!cplId) { setErr('Pilih CPL'); return; }
    try {
      await actions.addMapping.mutateAsync({ cpmkId: cpmk.id, cplId, bobot });
      setCplId(''); setBobot(0.5);
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const removeMap = async (cId: string) => {
    setErr(null);
    try { await actions.removeMapping.mutateAsync({ cpmkId: cpmk.id, cplId: cId }); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <Modal open onClose={onClose} title={`Mapping CPL — ${cpmk.kode}`} width={720}>
      <div className="stack" style={{ padding: 'var(--space-4)' }}>
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}

        <Card>
          <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{cpmk.mataKuliah?.kode}</div>
          <strong>{cpmk.kode}</strong>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)' }}>{cpmk.deskripsi}</p>
        </Card>

        <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          CPL yang sudah di-map
        </div>
        <div className="stack" style={{ gap: 'var(--space-2)' }}>
          {(cpmk.cpl ?? []).length === 0 && <Alert variant="info" title="Belum ada mapping">Tambah mapping CPL di bawah.</Alert>}
          {cpmk.cpl?.map((m) => (
            <Card key={m.cpl.id}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <strong className="mono">{m.cpl.kode}</strong>
                  <span className="pill pill--neutral" style={{ marginLeft: 8 }}>Bobot: {m.bobot.toFixed(2)}</span>
                  <p className="muted" style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)' }}>{m.cpl.deskripsi}</p>
                </div>
                <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => removeMap(m.cpl.id)}>Lepas</Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Tambah Mapping
        </div>
        <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <Select label="CPL" value={cplId} onChange={(e) => setCplId((e.target as HTMLSelectElement).value)}>
              <option value="">— pilih CPL —</option>
              {mkProdiCpl.filter((c) => !existing.has(c.id)).map((c) => (
                <option key={c.id} value={c.id}>{c.prodi?.kode ?? ''} · {c.kode} — {c.deskripsi.slice(0, 60)}…</option>
              ))}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Bobot kontribusi (0–1)" type="number" min={0} max={1} step={0.05} value={String(bobot)} onChange={(e) => setBobot(Number((e.target as HTMLInputElement).value))} />
          </div>
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} disabled={actions.addMapping.isPending} onClick={addMap}>Tambah</Button>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="sm" onClick={onClose} rightIcon={<ChevronRight size={14} />}>Tutup</Button>
        </div>
      </div>
    </Modal>
  );
}
