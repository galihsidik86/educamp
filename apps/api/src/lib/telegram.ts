// ============================================================
// Telegram — kirim notifikasi admin lewat Telegram Bot API.
// Kalau TELEGRAM_BOT_TOKEN/TELEGRAM_ADMIN_CHAT_ID tidak di-set, tetap
// berfungsi tapi hanya log ke console (dev mode). Fire-and-forget agar
// tidak memblokir request handler / proses pemanggil.
// ============================================================

import { env } from '../env.js';

let warned = false;

function isConfigured(): boolean {
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_ADMIN_CHAT_ID) return true;
  if (!warned) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN/ADMIN_CHAT_ID belum di-set — notifikasi akan di-log ke console saja.');
    warned = true;
  }
  return false;
}

/**
 * Fire-and-forget kirim pesan Telegram ke admin. Error di-log tapi tidak
 * di-throw — gagal kirim tidak boleh menggagalkan proses pemanggil.
 */
export async function notifyAdmin(text: string): Promise<void> {
  if (!isConfigured()) {
    console.log(`[telegram:dev] ${text}`);
    return;
  }
  try {
    const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_ADMIN_CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error(`[telegram] gagal kirim: ${res.status} ${await res.text().catch(() => '')}`);
    }
  } catch (e: any) {
    console.error(`[telegram] gagal kirim: ${e?.message ?? e}`);
  }
}
