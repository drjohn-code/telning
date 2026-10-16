/* Small Stripe helpers with fetch (no SDK): form encoding, one API call, and webhook signature checks.
   Key: STRIPE_SECRET_KEY: a secret key (sk_test_… / sk_live_…) or a restricted key (rk_test_… / rk_live_…, needs write
   access to Checkout Sessions and Coupons). Webhook secret: STRIPE_WEBHOOK_SECRET (whsec_…). Both are cleaned: a space, a
   line break or the quotes of an .env line pasted into Vercel must not switch the shop off. */
export const cleanSecret = (v) => String(v || '').trim().replace(/^(['"])(.*)\1$/, '$2').trim();
import { createHmac, timingSafeEqual } from 'node:crypto';

const API = 'https://api.stripe.com/v1';
export const stripeKey = () => cleanSecret(process.env.STRIPE_SECRET_KEY);
export const hasStripe = () => /^(sk|rk)_(test|live)_/.test(stripeKey());
export const stripeMode = () => (/^(sk|rk)_live_/.test(stripeKey()) ? 'live' : 'test');
/** Only the kind of key, for the logs when it cannot be used (e.g. "pk_live_" = the publishable key by mistake). Never the key. */
export const stripeKeyKind = () => (stripeKey().match(/^[a-z]+_(?:live_|test_)?/) || [stripeKey() ? 'other' : 'none'])[0];

/** { a: { b: [1, 2] } } → a[b][0]=1&a[b][1]=2 (Stripe's form encoding). */
export function formEncode(obj, prefix = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (item !== null && typeof item === 'object' ? formEncode(item, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(item))));
    else if (typeof v === 'object') formEncode(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}

/** One Stripe API call. Returns { status, json }; never throws on HTTP errors. */
export async function stripeApi(method, path, params, { key = stripeKey(), idempotencyKey } = {}) {
  const body = params && method !== 'GET' ? formEncode(params).toString() : undefined;
  const qs = params && method === 'GET' ? '?' + formEncode(params).toString() : '';
  const res = await fetch(API + path + qs, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': '2025-03-31.basil', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
    body,
  });
  let json = null;
  try { json = await res.json(); } catch { json = null; }
  return { status: res.status, json };
}

/** Check a Stripe-Signature header against the raw body. tolerance in seconds. */
export function verifySignature(rawBody, header, secret, { tolerance = 300, now = Date.now() } = {}) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(String(header).split(',').map((p) => p.split('=')).filter((p) => p.length === 2).map(([k, v]) => [k.trim(), v]));
  const t = Number(parts.t);
  if (!t || Math.abs(now / 1000 - t) > tolerance) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  const sigs = String(header).split(',').filter((p) => p.trim().startsWith('v1=')).map((p) => p.trim().slice(3));
  return sigs.some((s) => s.length === expected.length && timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
}
