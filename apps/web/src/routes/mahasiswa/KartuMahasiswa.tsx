import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, User as UserIcon } from 'lucide-react';
import { Button } from '@/ds';
import { useProfil } from '@/lib/queries';

const MASA_BERLAKU_TAHUN = 4;

export function MahasiswaKartu() {
  const navigate = useNavigate();
  const profil = useProfil();

  useEffect(() => {
    document.body.classList.add('print-mode', 'kartu-print-mode');
    return () => { document.body.classList.remove('print-mode', 'kartu-print-mode'); };
  }, []);

  if (profil.isLoading) return <p className="muted">Memuat…</p>;
  if (!profil.data) return <p className="muted">Data tidak tersedia.</p>;

  const m = profil.data;
  const masaBerlaku = m.angkatan + MASA_BERLAKU_TAHUN;

  return (
    <div className="kartu-page">
      <div className="kartu-page__toolbar no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mahasiswa/profil')} leftIcon={<ArrowLeft size={14} />}>
          Kembali
        </Button>
        <Button variant="primary" size="sm" onClick={() => window.print()} leftIcon={<Printer size={14} />}>
          Cetak
        </Button>
      </div>

      <div className="kartu">
        <header className="kartu__head">
          <img src="/@ds/assets/logo-tazkia-inverse.svg" alt="" className="kartu__logo" width={36} height={36} />
          <div>
            <strong>INSTITUT AGAMA ISLAM TAZKIA</strong>
            <div className="kartu__head-sub">{m.prodi.fakultas.nama}</div>
          </div>
        </header>

        <div className="kartu__body">
          <div className="kartu__photo" aria-hidden>
            <UserIcon size={56} />
          </div>
          <div className="kartu__fields">
            <Field label="NIM" mono>{m.nim}</Field>
            <Field label="Nama">{m.nama}</Field>
            <Field label="Program Studi">{m.prodi.nama}</Field>
            <Field label="Angkatan" mono>{m.angkatan}</Field>
            <Field label="Berlaku s.d." mono>{masaBerlaku}</Field>
          </div>
        </div>

        <footer className="kartu__foot">
          <div className="kartu__sign">
            <div className="muted" style={{ fontSize: '8pt' }}>Bogor</div>
            <div className="muted" style={{ fontSize: '8pt' }}>Rektor,</div>
            <div className="kartu__sign-line" />
            <div style={{ fontSize: '8pt', fontWeight: 700 }}>(...........................)</div>
          </div>
          <div className="kartu__qr-placeholder" aria-hidden>
            <div className="mono" style={{ fontSize: '7pt' }}>{m.nim}</div>
          </div>
        </footer>
      </div>

      <p className="muted no-print" style={{ textAlign: 'center', fontSize: 'var(--text-xs)', marginTop: 'var(--space-3)' }}>
        Ukuran kartu mengikuti standar ID (85 × 54 mm). Untuk cetak hasil terbaik, gunakan ukuran kertas A4 portrait.
      </p>
    </div>
  );
}

function Field({ label, mono, children }: { label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div className="kartu__field">
      <div className="kartu__field-label">{label}</div>
      <div className="kartu__field-value" style={{ fontFamily: mono ? 'var(--font-mono)' : undefined }}>{children}</div>
    </div>
  );
}
