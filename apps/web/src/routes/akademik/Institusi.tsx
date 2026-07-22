import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Input } from '@/ds';
import { Building2, Save, Phone, Mail, Globe, MapPin, ShieldCheck, FileSignature, Image } from 'lucide-react';
import type { TextareaHTMLAttributes } from 'react';
import { useInstitusi, useInstitusiActions, type Institusi } from '@/lib/queries-institusi';
import { PageHead } from '@/components/PageHead';
import { ApiError } from '@/lib/api';
import { Skeleton } from '@/components/Skeleton';

function Textarea({ label, ...rest }: { label?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      {label && <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>{label}</label>}
      <textarea
        {...rest}
        className="tz-input"
        style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)', ...(rest.style ?? {}) }}
      />
    </div>
  );
}

export function AkademikInstitusi() {
  const { data, isLoading, error } = useInstitusi();
  const actions = useInstitusiActions();
  const [form, setForm] = useState<Partial<Institusi>>({});
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);

  // Populate form ketika data datang
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const handle = (key: keyof Institusi) => (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => {
    setForm({ ...form, [key]: e.target.value });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMsg(null);
    setActErr(null);
    if (!form.nama || form.nama.trim().length < 2) {
      setActErr('Nama institusi wajib diisi (minimal 2 karakter)');
      return;
    }
    actions.update.mutate(form, {
      onSuccess: () => setSavedMsg('Identitas institusi tersimpan. Perubahan akan tampak di sidebar, laporan cetak, dan halaman verifikasi publik.'),
      onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal menyimpan'),
    });
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="PENGATURAN"
        title="Identitas Kampus"
        subtitle="Atur identitas institusi yang dipakai untuk header laporan cetak, kop surat, sidebar, dan halaman verifikasi publik (ijazah/sertifikat/survei)."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang halaman.</Alert>}
      {isLoading && <Skeleton variant="card" height={140} count={2} />}
      {savedMsg && <Alert variant="success" title="Tersimpan">{savedMsg}</Alert>}
      {actErr && <Alert variant="danger" title="Gagal menyimpan">{actErr}</Alert>}

      {data && (
        <form className="stack" onSubmit={submit}>
          {/* Identitas utama */}
          <Card>
            <SectionHead icon={<Building2 size={16} />} label="Identitas Utama" />
            <div className="row" style={{ gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
              <div style={{ flex: 2 }}>
                <Input label="Nama institusi" value={form.nama ?? ''} onChange={handle('nama') as any} required placeholder="Institut Agama Islam Tazkia" />
              </div>
              <div style={{ flex: 1 }}>
                <Input label="Nama pendek (sidebar)" value={form.namaPendek ?? ''} onChange={handle('namaPendek') as any} placeholder="IAI Tazkia" />
              </div>
            </div>
            <Input label="Tagline" value={form.tagline ?? ''} onChange={handle('tagline') as any} placeholder="Portal Akademik" style={{ marginTop: 'var(--space-2)' }} />
            <div className="row" style={{ gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <div style={{ flex: 1 }}>
                <Input label="Akreditasi PT" value={form.akreditasiPT ?? ''} onChange={handle('akreditasiPT') as any} placeholder="Unggul / A / B" />
              </div>
              <div style={{ flex: 2 }}>
                <Input label="No SK Akreditasi" value={form.akreditasiSk ?? ''} onChange={handle('akreditasiSk') as any} placeholder="BAN-PT No. XXX/SK/BAN-PT/Akred/XX/2025" />
              </div>
            </div>
          </Card>

          {/* Alamat & kontak */}
          <Card>
            <SectionHead icon={<MapPin size={16} />} label="Alamat & Kontak" />
            <Textarea label="Alamat" rows={2} value={form.alamat ?? ''} onChange={handle('alamat') as any} placeholder="Jl. Ir. H. Juanda No. 78, Sentul City" />
            <div className="row" style={{ gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <div style={{ flex: 2 }}>
                <Input label="Kota" value={form.kota ?? ''} onChange={handle('kota') as any} placeholder="Bogor" />
              </div>
              <div style={{ flex: 1 }}>
                <Input label="Kode pos" value={form.kodePos ?? ''} onChange={handle('kodePos') as any} placeholder="16810" />
              </div>
            </div>
            <div className="row" style={{ gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <div style={{ flex: 1 }}>
                <Input label="Telepon" value={form.telepon ?? ''} onChange={handle('telepon') as any} icon={<Phone size={14} />} placeholder="(0251) 8245 555" />
              </div>
              <div style={{ flex: 1 }}>
                <Input label="Email" type="email" value={form.email ?? ''} onChange={handle('email') as any} icon={<Mail size={14} />} placeholder="info@tazkia.ac.id" />
              </div>
              <div style={{ flex: 1 }}>
                <Input label="Website" value={form.website ?? ''} onChange={handle('website') as any} icon={<Globe size={14} />} placeholder="https://tazkia.ac.id" />
              </div>
            </div>
          </Card>

          {/* Branding */}
          <Card>
            <SectionHead icon={<Image size={16} />} label="Branding (URL Logo)" />
            <p className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
              Tautan ke file logo (SVG/PNG). Logo standar untuk header putih, logo invers untuk sidebar gelap.
            </p>
            <div className="row" style={{ gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <div style={{ flex: 1 }}>
                <Input label="Logo standar (URL)" value={form.logoUrl ?? ''} onChange={handle('logoUrl') as any} placeholder="https://… atau /assets/logo.svg" />
              </div>
              <div style={{ flex: 1 }}>
                <Input label="Logo invers (URL)" value={form.logoInverseUrl ?? ''} onChange={handle('logoInverseUrl') as any} placeholder="Untuk sidebar gelap" />
              </div>
            </div>
          </Card>

          {/* Pejabat penandatangan */}
          <Card>
            <SectionHead icon={<FileSignature size={16} />} label="Pejabat Penandatangan (untuk kop laporan)" />
            <div className="row" style={{ gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
              <div style={{ flex: 2 }}>
                <Input label="Nama Rektor" value={form.rektorNama ?? ''} onChange={handle('rektorNama') as any} placeholder="Prof. Dr. Nama Rektor, M.Si." />
              </div>
              <div style={{ flex: 1 }}>
                <Input label="NIP Rektor" value={form.rektorNip ?? ''} onChange={handle('rektorNip') as any} placeholder="NIP 1234..." />
              </div>
              <div style={{ flex: 1 }}>
                <Input label="Jabatan Rektor" value={form.rektorJabatan ?? ''} onChange={handle('rektorJabatan') as any} placeholder="Rektor" />
              </div>
            </div>
            <div className="row" style={{ gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <div style={{ flex: 1 }}>
                <Input label="Nama Bagian Akademik" value={form.bagianAkademikNama ?? ''} onChange={handle('bagianAkademikNama') as any} placeholder="Bagian Akademik (BAAK)" />
              </div>
              <div style={{ flex: 1 }}>
                <Input label="Nama Kepala BAAK" value={form.kepalaBaakNama ?? ''} onChange={handle('kepalaBaakNama') as any} placeholder="Nama Kepala BAAK" />
              </div>
            </div>
          </Card>

          {/* Kop surat */}
          <Card>
            <SectionHead icon={<ShieldCheck size={16} />} label="Kop Surat (footer alamat lengkap)" />
            <Textarea
              rows={3}
              value={form.kopSurat ?? ''}
              onChange={handle('kopSurat') as any}
              placeholder={"Jl. Ir. H. Juanda No. 78, Sentul City, Bogor 16810\nTelp. (0251) 8245 555 · Web: tazkia.ac.id"}
            />
            <p className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
              Multi-baris bebas. Dipakai di footer dokumen formal seperti surat keterangan & SK.
            </p>
          </Card>

          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
              <Badge variant="neutral">Singleton</Badge> Perubahan langsung tampak di sidebar, kop laporan cetak, dan halaman verifikasi publik.
            </div>
            <Button type="submit" variant="primary" leftIcon={<Save size={14} />} disabled={actions.update.isPending}>
              {actions.update.isPending ? 'Menyimpan…' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function SectionHead({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="row" style={{ gap: 6, alignItems: 'center' }}>
      <span className="muted">{icon}</span>
      <strong style={{ color: 'var(--text-strong)' }}>{label}</strong>
    </div>
  );
}
