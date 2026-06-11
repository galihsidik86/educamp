import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Card } from '@/ds';
import { useKhs, useTranskrip } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { formatIp } from '@/lib/format';
import { Printer } from 'lucide-react';
import { Button } from '@/ds';

type Tab = 'khs' | 'transkrip';

export function MahasiswaNilai() {
  const [tab, setTab] = useState<Tab>('khs');
  const khs = useKhs();
  const transkrip = useTranskrip();
  const navigate = useNavigate();
  const canPrintKhs = (khs.data?.semesters.length ?? 0) > 0;
  const canPrintTranskrip = (transkrip.data?.items.length ?? 0) > 0;

  return (
    <div className="stack">
      <PageHead
        title="Nilai & Transkrip"
        subtitle="KHS per semester serta transkrip kumulatif."
        right={
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Printer size={14} />}
            disabled={tab === 'khs' ? !canPrintKhs : !canPrintTranskrip}
            onClick={() => navigate(tab === 'khs' ? '/mahasiswa/nilai/khs/cetak' : '/mahasiswa/nilai/transkrip/cetak')}
          >
            {tab === 'khs' ? 'Cetak KHS' : 'Cetak Transkrip'}
          </Button>
        }
      />

      <div className="row" style={{ gap: 'var(--space-6)' }}>
        <Stat label="IPK Sementara" value={formatIp(transkrip.data?.ipk)} />
        <Stat label="Total SKS Lulus" value={transkrip.data ? `${transkrip.data.totalSksLulus} SKS` : '—'} />
      </div>

      <div className="tablist">
        <button onClick={() => setTab('khs')} aria-selected={tab === 'khs'}>KHS per Semester</button>
        <button onClick={() => setTab('transkrip')} aria-selected={tab === 'transkrip'}>Transkrip</button>
      </div>

      {tab === 'khs' && (
        <div className="stack">
          {khs.isLoading && <Card><p className="muted" style={{ margin: 0 }}>Memuat KHS…</p></Card>}
          {khs.data && khs.data.semesters.length === 0 && (
            <Alert variant="info" title="Belum ada nilai">KHS akan muncul setelah dosen menginput nilai.</Alert>
          )}
          {khs.data?.semesters.map((s) => (
            <div key={s.semesterKode} className="stack" style={{ gap: 8 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, color: 'var(--text-strong)' }}>{capFirst(s.semesterNama)} <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>({s.semesterKode})</span></h3>
                <div className="row" style={{ gap: 'var(--space-4)' }}>
                  <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>IP: <strong style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-mono)' }}>{formatIp(s.ip)}</strong></span>
                  <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>SKS: <strong style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-mono)' }}>{s.totalSks}</strong></span>
                </div>
              </div>
              <div className="tz-table-wrap">
                <table className="tz-table">
                  <thead>
                    <tr>
                      <th>Kode</th><th>Mata Kuliah</th><th className="center">SKS</th>
                      <th className="num">Tugas</th><th className="num">UTS</th><th className="num">UAS</th>
                      <th className="num">Angka</th><th className="center">Huruf</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.items.map((it) => (
                      <tr key={it.kodeMK}>
                        <td className="mono">{it.kodeMK}</td>
                        <td>{it.namaMK}</td>
                        <td className="num">{it.sks}</td>
                        <td className="num">{it.tugas ?? '—'}</td>
                        <td className="num">{it.uts ?? '—'}</td>
                        <td className="num">{it.uas ?? '—'}</td>
                        <td className="num">{it.nilaiAngka ?? '—'}</td>
                        <td className="center mono"><strong>{it.nilaiHuruf ?? '—'}</strong></td>
                        <td><StatusPill status={it.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'transkrip' && (
        <div className="tz-table-wrap">
          <table className="tz-table">
            <thead>
              <tr>
                <th>Semester</th><th>Kode</th><th>Mata Kuliah</th>
                <th className="center">SKS</th><th className="num">Angka</th><th className="center">Huruf</th><th className="num">Bobot</th>
              </tr>
            </thead>
            <tbody>
              {transkrip.isLoading && <tr><td colSpan={7} className="muted center">Memuat…</td></tr>}
              {transkrip.data?.items.length === 0 && (
                <tr><td colSpan={7} className="muted center">Belum ada nilai yang difinalisasi.</td></tr>
              )}
              {transkrip.data?.items.map((it, idx) => (
                <tr key={`${it.semesterKode}-${it.kodeMK}-${idx}`}>
                  <td className="mono">{it.semesterKode}</td>
                  <td className="mono">{it.kodeMK}</td>
                  <td>{it.namaMK}</td>
                  <td className="num">{it.sks}</td>
                  <td className="num">{it.nilaiAngka ?? '—'}</td>
                  <td className="center mono"><strong>{it.nilaiHuruf ?? '—'}</strong></td>
                  <td className="num">{it.bobot?.toFixed(2) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
            {transkrip.data && (
              <tfoot>
                <tr>
                  <td colSpan={3}>Total SKS Lulus & IPK</td>
                  <td className="num">{transkrip.data.totalSksLulus}</td>
                  <td className="num" colSpan={3}>IPK: {formatIp(transkrip.data.ipk)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-strong)' }}>{value}</div>
    </div>
  );
}

const capFirst = (s: string) => s ? s[0]!.toUpperCase() + s.slice(1) : s;
