import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card } from '@/ds';
import { ChevronLeft, Save } from 'lucide-react';
import { useEdomDetail, useEdomSubmit } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { ApiError } from '@/lib/api';

const SKALA = [1, 2, 3, 4, 5];
const SKALA_LABEL = ['Sangat kurang', 'Kurang', 'Cukup', 'Baik', 'Sangat baik'];

export function MahasiswaEdomDetail() {
  const { kelasId } = useParams<{ kelasId: string }>();
  const { data, isLoading } = useEdomDetail(kelasId);
  const submit = useEdomSubmit(kelasId);
  const navigate = useNavigate();

  const [jawaban, setJawaban] = useState<Record<string, number>>({});
  const [actErr, setActErr] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    const init: Record<string, number> = {};
    for (const a of data.aspek) {
      if (a.nilai != null) init[a.id] = a.nilai;
    }
    setJawaban(init);
  }, [data]);

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (!data) return <Alert variant="danger" title="Gagal">Data tidak ditemukan.</Alert>;

  const lengkap = data.aspek.every((a) => jawaban[a.id]);

  const handleSubmit = async () => {
    if (!lengkap) { setActErr('Mohon jawab semua aspek dulu'); return; }
    setActErr(null); setSavedMsg(null);
    try {
      const items = data.aspek.map((a) => ({ aspekId: a.id, nilai: jawaban[a.id]! }));
      await submit.mutateAsync(items);
      setSavedMsg('Jawaban EDOM tersimpan. Terima kasih atas masukan Anda.');
      setTimeout(() => navigate('/mahasiswa/edom'), 1500);
    } catch (e) {
      setActErr(e instanceof ApiError ? e.message : 'Gagal');
    }
  };

  return (
    <div className="stack">
      <Link
        to="/mahasiswa/edom"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}
      >
        <ChevronLeft size={14} /> Kembali ke daftar kelas
      </Link>

      <PageHead
        eyebrow={`${data.kelas.kodeMK} · KELAS ${data.kelas.kodeKelas}`}
        title={data.kelas.namaMK}
        subtitle={`Dosen: ${data.kelas.dosen}`}
      />

      <Alert variant="info" title={data.kuesioner.judul}>
        Skala 1 sangat kurang — 5 sangat baik. Jawaban tidak terhubung dengan identitas Anda di sisi dosen.
      </Alert>

      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
      {savedMsg && <Alert variant="success" title="Tersimpan">{savedMsg}</Alert>}

      <div className="stack">
        {data.aspek.map((a) => (
          <Card key={a.id}>
            <div className="muted" style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>Aspek {a.urutan}</div>
            <p style={{ marginTop: 4, color: 'var(--text-strong)', fontWeight: 600 }}>{a.pertanyaan}</p>
            <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
              {SKALA.map((s, i) => {
                const active = jawaban[a.id] === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setJawaban({ ...jawaban, [a.id]: s })}
                    className="tz-btn"
                    style={{
                      flex: 1, minWidth: 90, textAlign: 'center',
                      padding: 'var(--space-2)',
                      background: active ? 'var(--brand-primary, #0c2340)' : 'var(--surface-card)',
                      color: active ? 'white' : 'var(--text-strong)',
                      border: `1px solid ${active ? 'var(--brand-primary, #0c2340)' : 'var(--border-default)'}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{s}</div>
                    <div style={{ fontSize: '10px', opacity: active ? 0.9 : 0.7 }}>{SKALA_LABEL[i]}</div>
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          {Object.keys(jawaban).length} dari {data.aspek.length} aspek terjawab
        </span>
        <Button variant="primary" leftIcon={<Save size={16} />} disabled={!lengkap || submit.isPending} onClick={handleSubmit}>
          {submit.isPending ? 'Menyimpan…' : data.sudahDiisi ? 'Perbarui jawaban' : 'Kirim jawaban'}
        </Button>
      </div>
    </div>
  );
}
