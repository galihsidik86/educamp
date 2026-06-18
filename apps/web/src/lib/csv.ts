/**
 * CSV parser minimal. Mendukung quoted field dengan escape "",
 * pemisah koma, end-of-row LF atau CRLF. Header dari baris pertama.
 */
export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const result: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuote = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') inQuote = true;
      else if (ch === ',') { cur.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        cur.push(field);
        // skip the LF after CR
        if (ch === '\r' && text[i + 1] === '\n') i++;
        // only push row if non-empty
        if (cur.length > 1 || cur[0] !== '') result.push(cur);
        cur = []; field = '';
      } else {
        field += ch;
      }
    }
  }
  // sisa di akhir tanpa newline
  if (field !== '' || cur.length > 0) {
    cur.push(field);
    if (cur.length > 1 || cur[0] !== '') result.push(cur);
  }
  if (result.length === 0) return { headers: [], rows: [] };
  const headers = result[0]!.map((h) => h.trim());
  const rows = result.slice(1).map((arr) => {
    const o: Record<string, string> = {};
    headers.forEach((h, i) => { o[h] = (arr[i] ?? '').trim(); });
    return o;
  });
  return { headers, rows };
}

/** Bungkus nilai dengan tanda kutip jika mengandung koma/quote/newline. */
function csvCell(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/**
 * Buat string CSV dari header + baris contoh, lalu picu download di browser.
 * `sampleRows` opsional — kalau diisi, jadi baris contoh siap edit.
 */
export function downloadCsvTemplate(filename: string, headers: readonly string[], sampleRows: Array<Record<string, string | number | undefined>> = []) {
  const lines = [headers.join(',')];
  for (const row of sampleRows) {
    lines.push(headers.map((h) => csvCell(String(row[h] ?? ''))).join(','));
  }
  const csv = lines.join('\n') + '\n';
  // BOM agar Excel mengenali UTF-8 (penting kalau ada karakter non-ASCII)
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
