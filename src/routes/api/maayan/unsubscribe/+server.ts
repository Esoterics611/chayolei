import { text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkUnsubscribe } from '$lib/server/mail';
import { unsubscribe } from '$lib/server/maayan';

// GET or POST /api/maayan/unsubscribe?u=<uid>&t=<token>: the link in every email
// (POST is the one-click form mail clients send, RFC 8058).
async function handle(url: URL): Promise<Response> {
  const uid = url.searchParams.get('u') ?? '';
  const token = url.searchParams.get('t') ?? '';
  if (!uid || !checkUnsubscribe(uid, token)) return text('הקישור אינו תקין.', { status: 400 });
  await unsubscribe(uid);
  return new Response('<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><title>הוסרתם</title><body style="font-family:Arial,sans-serif;padding:40px"><p>לא יישלחו אליכם עוד מיילים מהמעיינות. אפשר להפעיל אותם שוב מהדף שלכם.</p></body></html>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export const GET: RequestHandler = ({ url }) => handle(url);
export const POST: RequestHandler = ({ url }) => handle(url);
