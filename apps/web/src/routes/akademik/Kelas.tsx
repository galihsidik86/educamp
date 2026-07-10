import { useMemo, useState } from 'react';
import { Alert, Button, Input, Select } from '@/ds';
import { Plus, Pencil, Trash2, Users, Upload, Search } from 'lucide-react';
import {
  useKelasAdmin, useKelasActions, useMataKuliah, useAdminDosen,
  useRuangan, usePeriode,
  useKelasTeam, useKelasTeamActions,
  type Kelas, type KelasInput, type KelasTeamItem,
} from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { ExcelImportModal } from '@/components/ExcelImportModal';
import { ApiError } from '@/lib/api';
import { capitalize } from '@/lib/format';

const HARI = ['', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'] as const;

export function AdminKelas() {
  const periode = usePeriode();
  const aktif = useMemo(() => periode.data?.items.flatMap((ta) => ta.semester).find((s) => s.isAktif), [periode.data]);
  const [semesterId, setSemesterId] = useState<string>('');
  const semIdEff = semesterId || aktif?.id || '';

  // Form "Tambah Kelas" mengirim semesterId = semester efektif (aktif/terpilih).
  // Kalau kosong (belum ada semester aktif & belum dipilih), request pasti
  // ditolak backend dengan "Permintaan tidak valid" yang membingungkan — jadi
  // blokir di sini dengan pesan yang jelas.
  const noSemester = !semIdEff;

  const { data, isLoading, error } = useKelasAdmin({ semesterId: semIdEff });
  const actions = useKelasActions();
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; kelas: Kelas } | null>(null);
  const [teamFor, setTeamFor] = useState<Kelas | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const aktifSemKode = aktif?.kode ?? '20261';
  const [q, setQ] = useState('');

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return data?.items ?? [];
    return (data?.items ?? []).filter((k) =>
      k.mataKuliah.kode.toLowerCase().includes(query) ||
      k.mataKuliah.nama.toLowerCase().includes(query) ||
      k.kodeKelas.toLowerCase().includes(query) ||
      k.dosen.nama.toLowerCase().includes(query),
    );
  }, [data, q]);

  const onDelete = async (k: Kelas) => {
    if (!confirm(`Hapus kelas ${k.mataKuliah.kode} ${k.kodeKelas}?`)) return;
    try { await actions.remove.mutateAsync(k.id); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="KURIKULUM"
        title="Kelas (Penawaran)"
        subtitle="Kelola kelas per semester — assign MK, dosen, ruangan, jadwal."
        right={
          <div className="row" style={{ gap: 'var(--space-2)' }}>
            <Button variant="ghost" leftIcon={<Upload size={16} />} onClick={() => setImportOpen(true)} disabled={noSemester}>Import Excel</Button>
            <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setModal({ mode: 'create' })} disabled={noSemester}>Tambah Kelas</Button>
          </div>
        }
      />

      {noSemester && (
        <Alert variant="warning" title="Belum ada semester aktif">
          Aktifkan semester dulu di menu <strong>Akademik → Periode</strong> (tombol “Aktifkan”), atau pilih semester pada filter di bawah, sebelum menambah kelas.
        </Alert>
      )}

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 240 }}>
          <Select label="Semester" value={semIdEff} onChange={(e) => setSemesterId((e.target as HTMLSelectElement).value)}>
            {periode.data?.items.flatMap((ta) =>
              ta.semester.map((s) => (
                <option key={s.id} value={s.id}>{s.jenis} {ta.kode} ({s.kode}){s.isAktif ? ' · aktif' : ''}</option>
              )),
            )}
          </Select>
        </div>
        {data && data.items.length > 0 && (
          <div style={{ flex: 1, minWidth: 240, maxWidth: 340 }}>
            <Input
              icon={<Search size={16} />}
              placeholder="Cari kode/nama MK, kelas, atau dosen…"
              value={q}
              onChange={(e) => setQ((e.target as HTMLInputElement).value)}
            />
          </div>
        )}
      </div>
      {data && data.items.length > 0 && items.length === 0 && (
        <p className="muted">Tidak ada kelas yang cocok dengan &ldquo;{q.trim()}&rdquo;.</p>
      )}

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>Kode MK</th><th>Mata Kuliah</th>
              <th className="center">SKS</th><th>Kelas</th>
              <th>Dosen</th><th>Jadwal</th><th>Ruang</th>
              <th className="num">Peserta/Kap</th><th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="muted center">Memuat…</td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={9} className="muted center">Belum ada kelas.</td></tr>}
            {items.map((k) => (
              <tr key={k.id}>
                <td className="mono">{k.mataKuliah.kode}</td>
                <td>{k.mataKuliah.nama}</td>
                <td className="num">{k.mataKuliah.sks}</td>
                <td>{k.kodeKelas}</td>
                <td>{[k.dosen.gelarDepan, k.dosen.nama, k.dosen.gelarBelakang].filter(Boolean).join(' ')}</td>
                <td className="mono">
                  {k.hari ? `${capitalize(k.hari)}, ${k.jamMulai}–${k.jamSelesai}` : '—'}
                </td>
                <td className="mono">{k.ruangan?.kode ?? '—'}</td>
                <td className="num">{k._count.krs}/{k.kapasitas}</td>
                <td>
                  <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    <Button size="sm" variant="ghost" leftIcon={<Users size={12} />} onClick={() => setTeamFor(k)}>Team</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => setModal({ mode: 'edit', kelas: k })}>Edit</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(k)}>Hapus</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <KelasModal
          mode={modal.mode}
          initial={modal.mode === 'edit' ? modal.kelas : undefined}
          defaultSemesterId={semIdEff}
          onClose={() => setModal(null)}
          onSubmit={async (input, id) => {
            if (id) await actions.update.mutateAsync({ id, patch: input });
            else await actions.create.mutateAsync(input as KelasInput);
            setModal(null);
          }}
        />
      )}

      {teamFor && (
        <TeamModal kelas={teamFor} onClose={() => setTeamFor(null)} />
      )}

      <ExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Kelas (Penawaran) via Excel"
        expectedHeaders={['mkKode', 'semesterKode', 'dosenNidn', 'kodeKelas']}
        optionalHeaders={['prodiKode', 'kapasitas', 'hari', 'jamMulai', 'jamSelesai', 'ruanganKode']}
        templateFilename="template-kelas.xlsx"
        keyHeader="MK / Kelas"
        notes={<>MK & dosen via kode/NIDN. <code>semesterKode</code>: contoh <code>{aktifSemKode}</code> (semester aktif). <code>prodiKode</code>: isi hanya bila kode MK yang sama dipakai di beberapa prodi (mis. MKWU/MKDU). <code>hari</code>: senin–minggu. Jam format <code>HH:MM</code>. Pertemuan otomatis di-generate 16 minggu.</>}
        sampleRows={[
          { mkKode: 'IF-3101', semesterKode: aktifSemKode, dosenNidn: '0412019001', kodeKelas: 'A', kapasitas: 40, hari: 'senin', jamMulai: '08:00', jamSelesai: '10:30', ruanganKode: 'R-201' },
          { mkKode: 'MKWU-104', prodiKode: '55201', semesterKode: aktifSemKode, dosenNidn: '0412019002', kodeKelas: 'B', kapasitas: 35, hari: 'rabu', jamMulai: '13:00', jamSelesai: '15:30' },
        ]}
        importMutation={actions.importCsv}
      />
    </div>
  );
}

function TeamModal({ kelas, onClose }: { kelas: Kelas; onClose: () => void }) {
  const team = useKelasTeam(kelas.id);
  const dosen = useAdminDosen();
  const actions = useKelasTeamActions(kelas.id);
  const [addDosenId, setAddDosenId] = useState('');
  const [addPeran, setAddPeran] = useState<KelasTeamItem['peran']>('anggota');
  const [err, setErr] = useState<string | null>(null);

  const onAdd = async () => {
    setErr(null);
    if (!addDosenId) { setErr('Pilih dosen'); return; }
    try {
      await actions.add.mutateAsync({ dosenId: addDosenId, peran: addPeran });
      setAddDosenId(''); setAddPeran('anggota');
    } catch (e: any) { setErr(e?.message ?? 'Gagal'); }
  };

  const onChangePeran = async (dosenId: string, peran: KelasTeamItem['peran']) => {
    setErr(null);
    try { await actions.update.mutateAsync({ dosenId, peran }); }
    catch (e: any) { setErr(e?.message ?? 'Gagal'); }
  };

  const onRemove = async (dosenId: string, nama: string) => {
    if (!confirm(`Hapus ${nama} dari team?`)) return;
    setErr(null);
    try { await actions.remove.mutateAsync(dosenId); }
    catch (e: any) { setErr(e?.message ?? 'Gagal'); }
  };

  const existingIds = new Set(team.data?.items.map((t) => t.dosenId) ?? []);
  const dosenAvailable = dosen.data?.items.filter((d) => !existingIds.has(d.id)) ?? [];
  const mkProdiKode = kelas.mataKuliah.prodi?.kode;
  const selectedDosen = dosen.data?.items.find((d) => d.id === addDosenId);
  const isCrossProdi = selectedDosen && mkProdiKode && selectedDosen.prodi.kode !== mkProdiKode;

  return (
    <Modal open onClose={onClose} title={`Team Dosen — ${kelas.mataKuliah.kode} ${kelas.kodeKelas}`} width={700}>
      <div className="stack" style={{ padding: 'var(--space-4)' }}>
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}

        <div className="tz-table-wrap">
          <table className="tz-table">
            <thead>
              <tr><th>NIDN</th><th>Nama</th><th>Prodi</th><th>Peran</th><th></th></tr>
            </thead>
            <tbody>
              {team.isLoading && <tr><td colSpan={5} className="muted center">Memuat…</td></tr>}
              {team.data?.items.length === 0 && <tr><td colSpan={5} className="muted center">Belum ada anggota team.</td></tr>}
              {team.data?.items.map((t) => {
                const cross = t.prodi && mkProdiKode && t.prodi.kode !== mkProdiKode;
                return (
                  <tr key={t.dosenId}>
                    <td className="mono">{t.nidn}</td>
                    <td>{[t.gelarDepan, t.nama, t.gelarBelakang].filter(Boolean).join(' ')}</td>
                    <td>
                      <span className={`pill ${cross ? 'pill--warning' : 'pill--neutral'}`} title={t.prodi?.nama ?? ''}>
                        {t.prodi?.kode ?? '—'}
                        {cross ? ' · lintas' : ''}
                      </span>
                    </td>
                    <td>
                      <Select value={t.peran} onChange={(e) => onChangePeran(t.dosenId, (e.target as HTMLSelectElement).value as KelasTeamItem['peran'])}>
                        <option value="lead">Lead</option>
                        <option value="anggota">Anggota</option>
                        <option value="asisten">Asisten</option>
                      </Select>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} disabled={t.peran === 'lead'} onClick={() => onRemove(t.dosenId, t.nama)}>Hapus</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <Select label="Tambah dosen" value={addDosenId} onChange={(e) => setAddDosenId((e.target as HTMLSelectElement).value)}>
              <option value="">— pilih dosen —</option>
              {dosenAvailable.map((d) => {
                const cross = mkProdiKode && d.prodi.kode !== mkProdiKode;
                return (
                  <option key={d.id} value={d.id}>
                    {[d.gelarDepan, d.nama, d.gelarBelakang].filter(Boolean).join(' ')} ({d.nidn})
                    {cross ? ` · ⚠ ${d.prodi.kode}` : ''}
                  </option>
                );
              })}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Select label="Peran" value={addPeran} onChange={(e) => setAddPeran((e.target as HTMLSelectElement).value as KelasTeamItem['peran'])}>
              <option value="anggota">Anggota</option>
              <option value="asisten">Asisten</option>
              <option value="lead">Lead</option>
            </Select>
          </div>
          <Button variant="primary" leftIcon={<Plus size={14} />} disabled={actions.add.isPending} onClick={onAdd}>Tambah</Button>
        </div>

        {isCrossProdi && selectedDosen && (
          <Alert variant="warning" title="Assignment lintas prodi">
            Dosen <strong>{selectedDosen.nama}</strong> dari prodi <strong className="mono">{selectedDosen.prodi.kode}</strong>
            {' '}berbeda dengan prodi MK <strong className="mono">{mkProdiKode}</strong>. Tetap boleh — umum untuk MKDU/service course.
          </Alert>
        )}

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>Tutup</Button>
        </div>
      </div>
    </Modal>
  );
}

function KelasModal({ mode, initial, defaultSemesterId, onClose, onSubmit }: {
  mode: 'create' | 'edit'; initial?: Kelas; defaultSemesterId: string;
  onClose: () => void;
  onSubmit: (input: Partial<KelasInput>, id?: string) => Promise<void>;
}) {
  const mk = useMataKuliah();
  const dosen = useAdminDosen();
  const ruangan = useRuangan();
  const periode = usePeriode();

  const [form, setForm] = useState<Partial<KelasInput>>({
    mataKuliahId: initial?.mataKuliahId ?? '',
    semesterId: initial?.semesterId ?? defaultSemesterId,
    dosenId: initial?.dosenId ?? '',
    ruanganId: initial?.ruanganId ?? null,
    kodeKelas: initial?.kodeKelas ?? 'A',
    kapasitas: initial?.kapasitas ?? 40,
    hari: (initial?.hari as KelasInput['hari']) ?? null,
    jamMulai: initial?.jamMulai ?? '08:00',
    jamSelesai: initial?.jamSelesai ?? '09:40',
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const patch: any = { ...form };
      if (patch.ruanganId === '') patch.ruanganId = null;
      if (patch.hari === '') patch.hari = null;
      if (!patch.semesterId) {
        setErr('Belum ada semester aktif — aktifkan di menu Periode dulu.');
        return;
      }
      await onSubmit(patch, mode === 'edit' ? initial!.id : undefined);
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={mode === 'create' ? 'Tambah Kelas' : 'Edit Kelas'} width={700}>
      <form onSubmit={submit} className="stack">
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}

        <Select label="Mata Kuliah" required value={form.mataKuliahId ?? ''} onChange={(e) => setForm({ ...form, mataKuliahId: (e.target as HTMLSelectElement).value })} disabled={mode === 'edit'}>
          <option value="">— pilih MK —</option>
          {mk.data?.items.map((m) => <option key={m.id} value={m.id}>{m.kode} — {m.nama} ({m.sks} SKS)</option>)}
        </Select>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 2 }}>
            <Select label="Semester" required value={form.semesterId ?? ''} onChange={(e) => setForm({ ...form, semesterId: (e.target as HTMLSelectElement).value })} disabled={mode === 'edit'}>
              {periode.data?.items.flatMap((ta) =>
                ta.semester.map((s) => <option key={s.id} value={s.id}>{s.jenis} {ta.kode} ({s.kode})</option>),
              )}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Kode Kelas" required value={form.kodeKelas ?? ''} onChange={(e) => setForm({ ...form, kodeKelas: (e.target as HTMLInputElement).value })} placeholder="A" disabled={mode === 'edit'} />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Kapasitas" type="number" min={1} value={String(form.kapasitas ?? 40)} onChange={(e) => setForm({ ...form, kapasitas: Number((e.target as HTMLInputElement).value) })} />
          </div>
        </div>

        <Select label="Dosen Pengampu" required value={form.dosenId ?? ''} onChange={(e) => setForm({ ...form, dosenId: (e.target as HTMLSelectElement).value })}>
          <option value="">— pilih dosen —</option>
          {dosen.data?.items.map((d) => {
            const selectedMk = mk.data?.items.find((m) => m.id === form.mataKuliahId);
            const cross = selectedMk && d.prodi.kode !== selectedMk.prodi.kode;
            return (
              <option key={d.id} value={d.id}>
                {[d.gelarDepan, d.nama, d.gelarBelakang].filter(Boolean).join(' ')} ({d.nidn})
                {cross ? ` · ⚠ ${d.prodi.kode}` : ''}
              </option>
            );
          })}
        </Select>
        {/* Warning lintas prodi: dosen prodi ≠ MK prodi */}
        {(() => {
          const selMk = mk.data?.items.find((m) => m.id === form.mataKuliahId);
          const selDosen = dosen.data?.items.find((d) => d.id === form.dosenId);
          if (!selMk || !selDosen) return null;
          if (selMk.prodi.kode === selDosen.prodi.kode) return null;
          return (
            <Alert variant="warning" title="Assignment lintas prodi">
              Dosen <strong>{selDosen.nama}</strong> dari prodi <strong className="mono">{selDosen.prodi.kode}</strong> ({selDosen.prodi.nama})
              {' '}— berbeda dengan prodi MK <strong className="mono">{selMk.prodi.kode}</strong> ({selMk.prodi.nama}).
              Pastikan ini sengaja (mis. dosen MKDU/service course).
            </Alert>
          );
        })()}

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 2 }}>
            <Select label="Ruangan" value={form.ruanganId ?? ''} onChange={(e) => setForm({ ...form, ruanganId: (e.target as HTMLSelectElement).value || null })}>
              <option value="">— tanpa ruangan —</option>
              {ruangan.data?.items.map((r) => <option key={r.id} value={r.id}>{r.kode} — {r.nama}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Select label="Hari" value={form.hari ?? ''} onChange={(e) => setForm({ ...form, hari: ((e.target as HTMLSelectElement).value || null) as any })}>
              {HARI.map((h) => <option key={h} value={h}>{h ? capitalize(h) : '— pilih hari —'}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Jam Mulai" type="time" value={form.jamMulai ?? ''} onChange={(e) => setForm({ ...form, jamMulai: (e.target as HTMLInputElement).value })} />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Jam Selesai" type="time" value={form.jamSelesai ?? ''} onChange={(e) => setForm({ ...form, jamSelesai: (e.target as HTMLInputElement).value })} />
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={onClose} type="button">Batal</Button>
          <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </form>
    </Modal>
  );
}
