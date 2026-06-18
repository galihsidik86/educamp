// ============================================================
// Mailer — kirim email lewat SMTP nodemailer.
// Kalau SMTP env tidak di-set, tetap berfungsi tapi hanya log ke console
// (dev mode). Semua send mail di-call lewat fire-and-forget agar tidak
// memblokir request handler.
// ============================================================

import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../env.js';

let transporter: Transporter | null = null;
let warned = false;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!env.SMTP_HOST || !env.SMTP_PORT) {
    if (!warned) {
      console.warn('[mailer] SMTP_HOST/PORT belum di-set — email akan di-log ke console saja.');
      warned = true;
    }
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

export type SendMailInput = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
};

/**
 * Fire-and-forget email send. Error di-log tapi tidak di-throw —
 * email gagal tidak boleh membuat request gagal.
 */
export async function sendMail(input: SendMailInput): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.log(`[mailer:dev] to=${input.to} subject="${input.subject}"`);
    return;
  }
  try {
    await t.sendMail({
      from: env.MAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? input.html?.replace(/<[^>]+>/g, ''),
    });
  } catch (e: any) {
    console.error(`[mailer] gagal kirim ke ${input.to}: ${e?.message ?? e}`);
  }
}

/** Template HTML dasar dengan kop SIAKAD. */
export function mailTemplate(title: string, bodyHtml: string, ctaUrl?: string, ctaLabel?: string): string {
  const cta = ctaUrl && ctaLabel
    ? `<p style="text-align:center;margin:24px 0"><a href="${ctaUrl}" style="background:#0a2540;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">${ctaLabel}</a></p>`
    : '';
  return `<!doctype html>
<html><body style="font-family:'Plus Jakarta Sans',Arial,sans-serif;background:#f5f5f5;padding:0;margin:0">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
      <tr><td style="background:#0a2540;color:white;padding:16px 24px;font-weight:600">SIAKAD Tazkia</td></tr>
      <tr><td style="padding:24px;color:#1a1a1a">
        <h2 style="color:#0a2540;margin-top:0">${title}</h2>
        ${bodyHtml}
        ${cta}
        <p style="color:#888;font-size:12px;margin-top:24px;border-top:1px solid #eee;padding-top:12px">
          Email ini dikirim otomatis dari SIAKAD Tazkia. Jangan balas email ini.
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}
