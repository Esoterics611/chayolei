// Email to members (docs/MAAYAN.md §5): one message when the teacher answers.
// Sent through Resend's HTTP API when RESEND_API_KEY is set; otherwise only
// logged, so the app runs without it. Every message carries a one-click
// unsubscribe link, signed with MAAYAN_SECRET.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import type { MaayanMember, Question, Wellspring } from '$lib/maayan/types';

function secret(): string {
  if (env.MAAYAN_SECRET) return env.MAAYAN_SECRET;
  // Without a secret anyone could forge unsubscribe links: refuse to mail for real.
  if (env.RESEND_API_KEY) throw new Error('MAAYAN_SECRET is not set');
  return 'dev-only-secret';
}

export function unsubscribeToken(uid: string): string {
  return createHmac('sha256', secret()).update(`unsub:${uid}`).digest('base64url');
}

export function checkUnsubscribe(uid: string, token: string): boolean {
  const a = Buffer.from(unsubscribeToken(uid));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const title = (w?: Wellspring) => (w ? (typeof w.title === 'string' ? w.title : w.title.he) : '');

export async function sendAnswerMail(to: MaayanMember, q: Question, w?: Wellspring): Promise<void> {
  const origin = env.PUBLIC_ORIGIN || 'https://chayolei.web.app';
  const page = `${origin}/maayan/${q.wellspringId}`;
  const unsub = `${origin}/api/maayan/unsubscribe?u=${encodeURIComponent(to.uid)}&t=${unsubscribeToken(to.uid)}`;
  const subject = `המלמד ענה על שאלתך${w ? ` · ${title(w)}` : ''}`;
  const html = `<div dir="rtl" lang="he" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#181b1d;max-width:560px">
<p>שלום ${esc(to.name)},</p>
<p>המלמד ענה על השאלה ששאלת${w ? ` במעיין <b>${esc(title(w))}</b>` : ''}:</p>
<blockquote style="margin:0 0 16px;padding:8px 12px;border-inline-start:3px solid #c9c6bc;color:#474d53">${esc(q.text)}</blockquote>
<blockquote style="margin:0 0 16px;padding:8px 12px;border-inline-start:3px solid #1e5a50">${esc(q.answer?.text ?? '').replace(/\n/g, '<br>')}</blockquote>
<p><a href="${page}" style="color:#1e5a50">לשאלות ולתשובות במעיין</a></p>
<p style="font-size:13px;color:#5f666d">קיבלת את המייל הזה כי ביקשת מייל כשהמלמד עונה. <a href="${unsub}" style="color:#5f666d">להפסיק לקבל מיילים</a></p>
</div>`;
  if (!env.RESEND_API_KEY) {
    console.info(`[mail] would send "${subject}" to member ${to.uid}`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM || 'Maayan <maayan@example.org>',
      to: [to.email],
      subject,
      html,
      headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    }),
  });
  if (!res.ok) throw new Error(`mail ${res.status}`);
}
