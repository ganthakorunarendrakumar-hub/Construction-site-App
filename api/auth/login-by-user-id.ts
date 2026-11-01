import { createClient } from '@supabase/supabase-js';
import type { IncomingMessage, ServerResponse } from 'node:http';

type Request = IncomingMessage & { body?: unknown };
type Response = ServerResponse;

function reply(res: Response, status: number, payload: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

async function readBody(req: Request): Promise<unknown> {
  if (req.body !== undefined) return req.body;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return reply(res, 405, { error: 'Method not allowed.' });
  }

  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const secret = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !secret) {
    return reply(res, 503, { error: 'Cloud login by User ID is not configured on the server.' });
  }

  try {
    const body = await readBody(req) as Record<string, unknown>;
    const userId = typeof body.user_id === 'string' ? body.user_id.trim().toUpperCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!userId || !password || userId.length > 100 || password.length > 128) {
      return reply(res, 400, { error: 'Enter a valid User ID and password.' });
    }

    const admin = createClient(url, secret, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
    });
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, email, status')
      .ilike('user_id', userId)
      .maybeSingle();

    // Use the same response for an unknown ID, inactive account, and bad
    // password so the endpoint does not disclose whether a User ID exists.
    if (profileError || !profile || profile.status === 'inactive' || !profile.email) {
      return reply(res, 401, { error: 'Invalid User ID or password.' });
    }

    const forwardedFor = req.headers['x-forwarded-for'];
    const clientIp = (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0] : Array.isArray(forwardedFor) ? forwardedFor[0]?.split(',')[0] : '')?.trim();
    const authClient = createClient(url, secret, {
      global: { headers: clientIp ? { 'Sb-Forwarded-For': clientIp } : {} },
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
    });
    const { data, error } = await authClient.auth.signInWithPassword({
      email: profile.email,
      password
    });
    if (error || !data.session || !data.user || data.user.id !== profile.id) {
      return reply(res, 401, { error: 'Invalid User ID or password.' });
    }

    return reply(res, 200, {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    });
  } catch {
    return reply(res, 400, { error: 'Could not sign in with that User ID and password.' });
  }
}
