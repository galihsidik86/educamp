import { useState, type ReactNode } from 'react';
import { Alert, Button } from '@/ds';
import { Download } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { parseXlsxFile, downloadXlsxTemplate } from '@/lib/xlsx';
import { ApiError } from '@/lib/api';

export type ExcelImportResult = {
  totalRows: number;
  created: number;
  failed: number;
  results: Array<{ row: number; key: string | null; status: 'created' | 'failed'; message?: string }>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  expectedHeaders: readonly string[];
  optionalHeaders?: readonly string[];
  templateFilename: string;
  sampleRows?: Array<Record<string, string | number | undefined>>;
  /** Header tabel hasil untuk kolom key (mis. "NIM", "NIDN", "Kode"). */
  keyHeader: string;
  /** Konten tambahan dalam Alert info (mis. catatan format khusus). */
  notes?: ReactNode;
  /** Mutasi import — harus terima Array<Record<string,string>> dan kembalikan ExcelImportResult. */
  importMutation: {
    isPending: boolean;
    mutateAsync: (rows: Array<Record<string, string>>) => Promise<ExcelImportResult>;
  };
};

export function ExcelImportModal({
  open, onClose, title, expectedHeaders, optionalHeaders = [],
  templateFilename, sampleRows = [], keyHeader, notes, importMutation,
}: Props) {
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ExcelImportResult | null>(null);

  if (!open) return null;
  const reset = () => { setRows([]); setHeaders([]); setParseError(null); setResult(null); };
  const handleClose = () => { reset(); onClose(); };

  const onFile = async (file: File | null) => {
    setParseError(null); setResult(null);
    if (!file) return;
    try {
      const parsed = await parseXlsxFile(file);
      const missing = expectedHeaders.filter((h) => !parsed.headers.includes(h));
      if (missing.length > 0) {
        setParseError(`Header Excel kurang: ${missing.join(', ')}. Wajib: ${expectedHeaders.join(', ')}.`);
        return;
      }
      setHeaders(parsed.headers);
      setRows(parsed.rows);
    } catch (e: any) {
      setParseError(`Gagal parse Excel: ${e?.message ?? 'unknown'}`);
    }
  };

  const submit = async () => {
    setResult(null);
    try {
      const r = await importMutation.mutateAsync(rows);
      setResult(r);
    } catch (e) {
      setParseError(e instanceof ApiError ? e.message : 'Gagal mengimpor');
    }
  };

  return (
    <Modal open onClose={handleClose} title={title} width={760}>
      <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
        <Alert variant="info" title="Format Excel (.xlsx)">
          Header wajib: <code>{expectedHeaders.join(', ')}</code>.
          {optionalHeaders.length > 0 && (<><br />Header opsional: <code>{optionalHeaders.join(', ')}</code>.</>)}
          {notes && <><br />{notes}</>}
        </Alert>

        <div>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Download size={14} />}
            type="button"
            onClick={() => downloadXlsxTemplate(templateFilename, [...expectedHeaders, ...optionalHeaders], sampleRows)}
          >
            Unduh template Excel
          </Button>
        </div>

        {!result && (
          <input
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            style={{ fontSize: 'var(--text-sm)' }}
          />
        )}

        {parseError && <Alert variant="danger" title="Gagal">{parseError}</Alert>}

        {!result && rows.length > 0 && (
          <>
            <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              Pratinjau <strong>{rows.length}</strong> baris (5 pertama):
            </div>
            <div className="tz-table-wrap" style={{ maxHeight: 280, overflow: 'auto' }}>
              <table className="tz-table">
                <thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i}>{headers.map((h) => <td key={h}>{r[h] || <span className="muted">—</span>}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {result && (
          <>
            <Alert variant={result.failed === 0 ? 'success' : 'warning'} title="Hasil impor">
              {result.created} berhasil, {result.failed} gagal dari {result.totalRows} baris.
            </Alert>
            <div className="tz-table-wrap" style={{ maxHeight: 300, overflow: 'auto' }}>
              <table className="tz-table">
                <thead><tr><th>Baris</th><th>{keyHeader}</th><th>Status</th><th>Catatan</th></tr></thead>
                <tbody>
                  {result.results.map((r) => (
                    <tr key={r.row}>
                      <td className="num mono">{r.row}</td>
                      <td className="mono">{r.key ?? '—'}</td>
                      <td>
                        {r.status === 'created'
                          ? <span className="pill pill--success">ok</span>
                          : <span className="pill pill--danger">failed</span>}
                      </td>
                      <td className="muted" style={{ fontSize: 'var(--text-xs)' }}>{r.message ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          {result
            ? <Button variant="primary" size="sm" onClick={handleClose}>Tutup</Button>
            : (
              <>
                <Button variant="ghost" size="sm" onClick={handleClose}>Batal</Button>
                <Button variant="primary" size="sm" disabled={rows.length === 0 || importMutation.isPending} onClick={submit}>
                  {importMutation.isPending ? 'Mengimpor…' : `Import ${rows.length} baris`}
                </Button>
              </>
            )}
        </div>
      </div>
    </Modal>
  );
}
