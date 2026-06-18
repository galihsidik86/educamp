import * as XLSX from 'xlsx';

/**
 * Baca file .xlsx/.xls dari input file, kembalikan sheet pertama dalam bentuk
 * { headers, rows } sehingga kompatibel drop-in dengan parseCsv.
 */
export async function parseXlsxFile(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };
  const sheet = wb.Sheets[sheetName]!;
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false });
  if (aoa.length === 0) return { headers: [], rows: [] };
  const headers = (aoa[0] as unknown[]).map((h) => String(h ?? '').trim()).filter((h) => h !== '');
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const arr = aoa[i] as unknown[] | undefined;
    if (!arr || arr.every((v) => v === '' || v == null)) continue;
    const o: Record<string, string> = {};
    headers.forEach((h, idx) => { o[h] = String(arr[idx] ?? '').trim(); });
    rows.push(o);
  }
  return { headers, rows };
}

/** Buat file .xlsx berisi header + baris contoh, lalu picu download di browser. */
export function downloadXlsxTemplate(
  filename: string,
  headers: readonly string[],
  sampleRows: Array<Record<string, string | number | undefined>> = [],
) {
  const aoa: Array<Array<string | number>> = [
    [...headers],
    ...sampleRows.map((r) => headers.map((h) => (r[h] ?? '') as string | number)),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Lebar kolom kasar — header length atau minimal 14 char
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, filename);
}
