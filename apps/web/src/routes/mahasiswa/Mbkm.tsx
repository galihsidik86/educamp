import { useState } from 'react';
import { Card, Alert, Button, Input, Select } from '@/ds';
import { Plus, Trash2, ExternalLink, FileText, Award } from 'lucide-react';
import { useMbkm, useMbkmActions, type JenisMbkm, type MbkmDaftarInput, type MbkmItem } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { Modal } from '@/components/Modal';
import { formatTanggal } from '@/lib/format';
import { ApiError } from '@/lib/api';

const JENIS_LABEL: Record<JenisMbkm, string> = {
  pertukaran_mahasiswa: 'Pertukaran Mahasiswa',
  magang_industri:      'Magang / Praktik Kerja',
  asistensi_mengajar:   'Asistensi Mengajar',
  penelitian:           'Penelitian / Riset',
  proyek_kemanusiaan:   'Proyek Kemanusiaan',
  kewirausahaan:        'Wirausaha',
  studi_independen:     'Studi Independen',
  kkn_tematik:          'KKN Tematik',
};

const TAHUN_NOW = new Date().getFullYear();
const PERIODE_OPSI = [`${TAHUN_NOW}1`, `${TAHUN_NOW}2`, `${TAHUN_NOW + 1}1`, `${TAHUN_NOW + 1}2`];

export function MahasiswaMbkm() {
  const { data, isLoading, error } = useMbkm();
  const { daftar, cancel, update } = useMbkmActions();

  const [open, setOpen] = useState(false);
  const [linkModal, setLinkModal] = useState<MbkmItem | null>(null);
  const [form, setForm] = useState<MbkmDaftarInput>({
    jenis: 'magang_industri', namaProgram: '', mitra: '', periode: PERIODE_OPSI[0]!,
  });
  const [actErr, setActErr] = useState<string | null>(null);

  const submit = async () => {
    setActErr(null);
    if (!form.namaProgram.trim() || !form.mitra.trim()) { setActErr('Nama program dan mitra wajib diisi'); return; }
    try {
      await daftar.mutateAsync(form);
      setOpen(false);
      setForm({ jenis: 'magang_industri', namaProgram: '', mitra: '', periode: PERIODE_OPSI[0]! });
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const onCancel = async (m: MbkmItem) => {
    if (!confirm(`Batalkan pengajuan MBKM "${m.namaProgram}"?`)) return;
    try { await cancel.mutateAsync(m.id); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="TRI DHARMA"
        title="Program MBKM"
        subtitle="Merdeka Belajar Kampus Merdeka — kegiatan di luar kelas yang dapat dikonversi menjadi SKS."
        right={
          <Button variant="primary" leftIcon={<Plus size={14} />} onClick={() => { setActErr(null); setOpen(true); }}>
            Daftar Program MBKM
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <Card><p className="muted" style={{ margin: 0 }}>Memuat…</p></Card>}

      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada program MBKM">
          Klik "Daftar Program MBKM" untuk mengajukan kegiatan magang, studi independen, asistensi mengajar, dan lainnya.
        </Alert>
      )}

      <div className="stack">
        {data?.items.map((m) => (
          <Card key={m.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                  <span className="pill pill--neutral">{JENIS_LABEL[m.jenis]}</span>
                  <StatusPill status={m.status} />
                </div>
                <strong style={{ color: 'var(--text-strong)', fontSize: 'var(--text-base)', display: 'block', marginTop: 6 }}>
                  {m.namaProgram}
                </strong>
                <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                  Mitra: <strong style={{ color: 'var(--text-default)' }}>{m.mitra}</strong>
                  {m.lokasi && ` · ${m.lokasi}`}
                  {' · Periode '}<span className="mono">{m.periode}</span>
                </div>
                {m.tanggalMulai && (
                  <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                    Pelaksanaan: {formatTanggal(m.tanggalMulai)} – {formatTanggal(m.tanggalSelesai)}
                  </div>
                )}
                {m.dpl && (
                  <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>DPL: {m.dpl}</div>
                )}
                {m.catatan && (
                  <div style={{ marginTop: 8, fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
                    <strong>Catatan akademik:</strong> {m.catatan}
                  </div>
                )}
              </div>
              <div className="row" style={{ gap: 4 }}>
                {(m.status === 'berjalan' || m.status === 'selesai') && (
                  <Button size="sm" variant="ghost" leftIcon={<FileText size={14} />} onClick={() => setLinkModal(m)}>Link</Button>
                )}
                {(m.status === 'pengajuan' || m.status === 'ditolak') && (
                  <Button size="sm" variant="ghost" leftIcon={<Trash2 size={14} />} onClick={() => onCancel(m)}>Batalkan</Button>
                )}
              </div>
            </div>

            {m.konversi.length > 0 && (
              <>
                <div style={{ marginTop: 12, borderTop: '1px dashed var(--border-default)', paddingTop: 12 }}>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-strong)' }}>Konversi SKS</strong>
                    <span className="muted mono" style={{ fontSize: 'var(--text-xs)' }}>{m.totalSksKonversi} SKS</span>
                  </div>
                  <table className="tz-table" style={{ width: '100%' }}>
                    <thead>
                      <tr><th>Kode</th><th>Mata Kuliah</th><th className="num">SKS</th><th className="center">Nilai</th></tr>
                    </thead>
                    <tbody>
                      {m.konversi.map((k) => (
                        <tr key={k.id}>
                          <td className="mono">{k.kodeMK}</td>
                          <td>{k.namaMK}</td>
                          <td className="num">{k.sks}</td>
                          <td className="center mono"><strong>{k.nilaiHuruf ?? '—'}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {(m.linkProposal || m.linkLaporan || m.linkSertifikat) && (
              <div className="row" style={{ gap: 'var(--space-2)', marginTop: 12, fontSize: 'var(--text-xs)' }}>
                {m.linkProposal && <ExternalLinkA href={m.linkProposal} icon={<FileText size={12} />}>Proposal</ExternalLinkA>}
                {m.linkLaporan && <ExternalLinkA href={m.linkLaporan} icon={<FileText size={12} />}>Laporan</ExternalLinkA>}
                {m.linkSertifikat && <ExternalLinkA href={m.linkSertifikat} icon={<Award size={12} />}>Sertifikat</ExternalLinkA>}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Daftar Program MBKM" width={620}>
        <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
          {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 2 }}>
              <Select label="Jenis BKP" value={form.jenis} onChange={(e) => setForm({ ...form, jenis: (e.target as HTMLSelectElement).value as JenisMbkm })}>
                {Object.entries(JENIS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </div>
            <div style={{ flex: 1 }}>
              <Select label="Periode (semester)" value={form.periode} onChange={(e) => setForm({ ...form, periode: (e.target as HTMLSelectElement).value })}>
                {PERIODE_OPSI.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </div>
          </div>
          <Input label="Nama program" value={form.namaProgram} onChange={(e) => setForm({ ...form, namaProgram: (e.target as HTMLInputElement).value })} placeholder="mis. Bangkit Academy 2026" />
          <Input label="Mitra / lembaga" value={form.mitra} onChange={(e) => setForm({ ...form, mitra: (e.target as HTMLInputElement).value })} placeholder="mis. PT Tokopedia" />
          <Input label="Lokasi (opsional)" value={form.lokasi ?? ''} onChange={(e) => setForm({ ...form, lokasi: (e.target as HTMLInputElement).value })} />
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 1 }}><Input label="Tanggal mulai" type="date" value={form.tanggalMulai ?? ''} onChange={(e) => setForm({ ...form, tanggalMulai: (e.target as HTMLInputElement).value })} /></div>
            <div style={{ flex: 1 }}><Input label="Tanggal selesai" type="date" value={form.tanggalSelesai ?? ''} onChange={(e) => setForm({ ...form, tanggalSelesai: (e.target as HTMLInputElement).value })} /></div>
          </div>
          <Input label="Link proposal (opsional)" value={form.linkProposal ?? ''} onChange={(e) => setForm({ ...form, linkProposal: (e.target as HTMLInputElement).value })} placeholder="https://..." />
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" disabled={daftar.isPending} onClick={submit}>
              {daftar.isPending ? 'Mengirim…' : 'Ajukan'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!linkModal} onClose={() => setLinkModal(null)} title="Update tautan dokumen" width={520}>
        {linkModal && (
          <LinkUpdateForm
            mbkm={linkModal}
            onSave={async (patch) => {
              try { await update.mutateAsync({ id: linkModal.id, patch }); setLinkModal(null); }
              catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
            }}
            onClose={() => setLinkModal(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function LinkUpdateForm({ mbkm, onSave, onClose }: {
  mbkm: MbkmItem;
  onSave: (patch: { linkProposal?: string; linkLaporan?: string; linkSertifikat?: string }) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    linkProposal: mbkm.linkProposal ?? '',
    linkLaporan: mbkm.linkLaporan ?? '',
    linkSertifikat: mbkm.linkSertifikat ?? '',
  });
  return (
    <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
      <Input label="Link proposal" value={form.linkProposal} onChange={(e) => setForm({ ...form, linkProposal: (e.target as HTMLInputElement).value })} />
      <Input label="Link laporan akhir" value={form.linkLaporan} onChange={(e) => setForm({ ...form, linkLaporan: (e.target as HTMLInputElement).value })} />
      <Input label="Link sertifikat" value={form.linkSertifikat} onChange={(e) => setForm({ ...form, linkSertifikat: (e.target as HTMLInputElement).value })} />
      <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
        <Button variant="primary" size="sm" onClick={() => onSave(form)}>Simpan</Button>
      </div>
    </div>
  );
}

function ExternalLinkA({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)' }}>
      {icon} {children} <ExternalLink size={10} />
    </a>
  );
}
