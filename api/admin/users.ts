import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { IncomingMessage, ServerResponse } from 'node:http';

type Request = IncomingMessage & { body?: unknown };
type Response = ServerResponse;

const ROLE_TITLES: Record<string, string> = {
  admin: 'Company Administrator',
  site_supervisor: 'Site Supervisor',
  accountant: 'Chief Accountant',
  worker: 'Site Worker / Specialist',
  project_manager: 'Senior Project Manager',
  site_engineer: 'Site Engineer',
  storekeeper: 'Materials Storekeeper',
  management_viewer: 'Management Auditor / Viewer'
};

const SUPPORTED_ROLES = new Set(Object.keys(ROLE_TITLES));

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
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function getClients(): { admin: SupabaseClient; url: string } | null {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const secret = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !secret) return null;
  return {
    url,
    admin: createClient(url, secret, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
    })
  };
}

async function requireCaller(req: Request, admin: SupabaseClient) {
  const authorization = req.headers.authorization;
  const token = typeof authorization === 'string' && authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : '';
  if (!token) return { error: 'Sign in again to continue.', status: 401 as const };

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return { error: 'Your session is invalid or expired. Sign in again.', status: 401 as const };

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, company_id, role, status, full_name')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.status === 'inactive') {
    return { error: 'Your active company profile could not be verified.', status: 403 as const };
  }
  return { profile, status: 200 as const };
}

function toAccount(row: Record<string, any>) {
  return {
    auth_uid: row.id,
    user_id: row.user_id || '',
    email: row.email || '',
    full_name: row.full_name || '',
    role: row.role,
    role_title: row.role_title || ROLE_TITLES[row.role] || 'Team Member',
    company_id: row.company_id,
    phone: row.phone || undefined,
    assigned_projects: Array.isArray(row.assigned_projects) ? row.assigned_projects : [],
    employee_id: row.employee_id || undefined,
    status: row.status === 'inactive' ? 'inactive' : 'active',
    password_hash: '',
    password_salt: '',
    failed_attempts: 0,
    must_change_password: Boolean(row.must_change_password),
    created_at: row.created_at || new Date(0).toISOString(),
    updated_at: row.updated_at || row.created_at || new Date(0).toISOString(),
    created_by: 'supabase'
  };
}

export default async function handler(req: Request, res: Response) {
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return reply(res, 405, { error: 'Method not allowed.' });
  }

  const clients = getClients();
  if (!clients) return reply(res, 503, { error: 'Cloud account provisioning is not configured on the server.' });

  try {
    const caller = await requireCaller(req, clients.admin);
    if ('error' in caller) return reply(res, caller.status, { error: caller.error });

    if (req.method === 'GET') {
      if (caller.profile.role !== 'admin' && caller.profile.role !== 'project_manager') {
        return reply(res, 403, { error: 'You do not have permission to view company accounts.' });
      }
      const { data, error } = await clients.admin
        .from('profiles')
        .select('id, user_id, email, full_name, role, role_title, company_id, phone, assigned_projects, employee_id, status, must_change_password, created_at, updated_at')
        .eq('company_id', caller.profile.company_id)
        .order('created_at', { ascending: true });
      if (error) return reply(res, 500, { error: `Could not load company accounts: ${error.message}` });
      return reply(res, 200, { accounts: (data || []).map(row => toAccount(row)) });
    }

    const body = await readBody(req) as Record<string, unknown>;
    const targetId = typeof body.id === 'string' ? body.id : '';
    const action = typeof body.action === 'string' ? body.action : 'update';

    if (req.method === 'PATCH' && action === 'complete_password_change') {
      if (targetId !== caller.profile.id) return reply(res, 403, { error: 'A user can only complete their own password change.' });
      const { data: authUser, error: authError } = await clients.admin.auth.admin.getUserById(targetId);
      if (authError || !authUser.user) return reply(res, 404, { error: 'Supabase Auth account was not found.' });
      const { error: metadataError } = await clients.admin.auth.admin.updateUserById(targetId, {
        user_metadata: { ...(authUser.user.user_metadata || {}), must_change_password: false }
      });
      if (metadataError) return reply(res, 500, { error: `Password changed, but the first-login flag could not be cleared: ${metadataError.message}` });
      const { error } = await clients.admin.from('profiles')
        .update({ must_change_password: false, updated_at: new Date().toISOString() })
        .eq('id', targetId)
        .eq('company_id', caller.profile.company_id);
      if (error) return reply(res, 500, { error: `Password changed, but the first-login flag could not be cleared: ${error.message}` });
      return reply(res, 200, { success: true });
    }

    if (caller.profile.role !== 'admin') {
      return reply(res, 403, { error: 'Only a Company Administrator can manage accounts.' });
    }

    if (req.method === 'DELETE' || req.method === 'PATCH') {
      if (!targetId) return reply(res, 400, { error: 'Account ID is required.' });
      const { data: target, error: targetError } = await clients.admin
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .eq('company_id', caller.profile.company_id)
        .maybeSingle();
      if (targetError || !target) return reply(res, 404, { error: 'Company account was not found.' });
      const { data: authTarget, error: authTargetError } = await clients.admin.auth.admin.getUserById(target.id);
      if (authTargetError || !authTarget.user) return reply(res, 404, { error: 'Supabase Auth account was not found.' });
      const targetMetadata = authTarget.user.user_metadata || {};

      const protectLastAdmin = async () => {
        if (target.role !== 'admin' || target.status === 'inactive') return true;
        const { count, error } = await clients.admin
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', caller.profile.company_id)
          .eq('role', 'admin')
          .eq('status', 'active');
        if (error) throw error;
        return (count || 0) > 1;
      };

      if (req.method === 'DELETE') {
        if (target.id === caller.profile.id) return reply(res, 409, { error: 'Sign in with another administrator before deleting your own account.' });
        if (!(await protectLastAdmin())) return reply(res, 409, { error: 'The only active Company Administrator cannot be deleted.' });
        const { error } = await clients.admin.auth.admin.deleteUser(target.id);
        if (error) return reply(res, 400, { error: error.message });
        return reply(res, 200, { success: true });
      }

      if (action === 'reset_password') {
        const password = typeof body.password === 'string' ? body.password : '';
        if (password.length < 8 || password.length > 128) return reply(res, 400, { error: 'Password must be between 8 and 128 characters.' });
        const { error: authError } = await clients.admin.auth.admin.updateUserById(target.id, {
          password,
          user_metadata: { ...targetMetadata, must_change_password: true }
        });
        if (authError) return reply(res, 400, { error: authError.message });
        const { error } = await clients.admin.from('profiles').update({ must_change_password: true, updated_at: new Date().toISOString() }).eq('id', target.id);
        if (error) return reply(res, 500, { error: `Password changed but profile status did not update: ${error.message}` });
        return reply(res, 200, { success: true });
      }

      if (action === 'status') {
        const status = body.status === 'inactive' ? 'inactive' : body.status === 'active' ? 'active' : '';
        if (!status) return reply(res, 400, { error: 'Select active or inactive status.' });
        if (status === 'inactive' && target.id === caller.profile.id) return reply(res, 409, { error: 'Sign in with another administrator before deactivating your own account.' });
        if (status === 'inactive' && !(await protectLastAdmin())) return reply(res, 409, { error: 'The only active Company Administrator cannot be deactivated.' });
        const { error: authError } = await clients.admin.auth.admin.updateUserById(target.id, {
          ban_duration: status === 'inactive' ? '876000h' : 'none'
        });
        if (authError) return reply(res, 400, { error: authError.message });
        const { data, error } = await clients.admin.from('profiles').update({ status, updated_at: new Date().toISOString() })
          .eq('id', target.id)
          .eq('company_id', caller.profile.company_id)
          .select('id, user_id, email, full_name, role, role_title, company_id, phone, assigned_projects, employee_id, status, must_change_password, created_at, updated_at')
          .single();
        if (error || !data) return reply(res, 500, { error: `Auth status changed but profile did not update: ${error?.message || 'Profile missing.'}` });
        return reply(res, 200, { account: toAccount(data) });
      }

      if (action !== 'update') return reply(res, 400, { error: 'Unknown account action.' });
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof body.full_name === 'string') {
        const fullName = body.full_name.trim();
        if (!fullName || fullName.length > 255) return reply(res, 400, { error: 'Enter a valid full name.' });
        updates.full_name = fullName;
      }
      if (typeof body.role === 'string') {
        if (!SUPPORTED_ROLES.has(body.role)) return reply(res, 400, { error: 'Select a supported account role.' });
        updates.role = body.role;
        updates.role_title = ROLE_TITLES[body.role];
      }
      if (typeof body.email === 'string') {
        const email = body.email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(res, 400, { error: 'Enter a valid email address.' });
        updates.email = email;
      }
      if (typeof body.phone === 'string') updates.phone = body.phone.trim().slice(0, 30) || null;
      if (Array.isArray(body.assigned_projects)) updates.assigned_projects = body.assigned_projects.filter((value): value is string => typeof value === 'string' && value.length <= 100);
      if (typeof body.employee_id === 'string') updates.employee_id = body.employee_id.trim().slice(0, 100) || null;
      if (body.status === 'active' || body.status === 'inactive') updates.status = body.status;

      const nextRole = String(updates.role || target.role);
      const nextStatus = String(updates.status || target.status);
      if (target.role === 'admin' && target.status === 'active' && (nextRole !== 'admin' || nextStatus === 'inactive') && !(await protectLastAdmin())) {
        return reply(res, 409, { error: 'The only active Company Administrator cannot be demoted or deactivated.' });
      }
      const nextName = String(updates.full_name || target.full_name);
      const nextEmail = String(updates.email || target.email);
      const authChanges: Record<string, unknown> = {
        user_metadata: { ...targetMetadata, full_name: nextName, user_id: target.user_id }
      };
      if (nextEmail !== target.email) {
        authChanges.email = nextEmail;
        authChanges.email_confirm = true;
      }
      if (nextStatus !== target.status) authChanges.ban_duration = nextStatus === 'inactive' ? '876000h' : 'none';
      const { error: authUpdateError } = await clients.admin.auth.admin.updateUserById(target.id, authChanges);
      if (authUpdateError) return reply(res, 400, { error: authUpdateError.message });
      const { data, error } = await clients.admin.from('profiles').update(updates)
        .eq('id', target.id)
        .eq('company_id', caller.profile.company_id)
        .select('id, user_id, email, full_name, role, role_title, company_id, phone, assigned_projects, employee_id, status, must_change_password, created_at, updated_at')
        .single();
      if (error || !data) {
        if (nextEmail !== target.email) await clients.admin.auth.admin.updateUserById(target.id, { email: target.email, email_confirm: true }).catch(() => undefined);
        return reply(res, 500, { error: `Could not update the company profile: ${error?.message || 'Profile missing.'}` });
      }
      return reply(res, 200, { account: toAccount(data) });
    }

    if (req.method !== 'POST') return reply(res, 405, { error: 'Method not allowed.' });
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
    const userId = typeof body.user_id === 'string' ? body.user_id.trim().toUpperCase() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.initial_password === 'string' ? body.initial_password : '';
    const role = typeof body.role === 'string' ? body.role : '';
    const status = body.status === 'inactive' ? 'inactive' : 'active';
    const assignedProjects = Array.isArray(body.assigned_projects)
      ? body.assigned_projects.filter((value): value is string => typeof value === 'string' && value.length <= 100)
      : [];

    if (!fullName || fullName.length > 255) return reply(res, 400, { error: 'Enter a valid full name.' });
    if (!userId || userId.length > 100) return reply(res, 400, { error: 'Enter a valid User ID.' });
    if (!email || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply(res, 400, { error: 'Enter a valid email address.' });
    }
    if (!SUPPORTED_ROLES.has(role)) return reply(res, 400, { error: 'Select a supported account role.' });
    if (password.length < 8 || password.length > 128) return reply(res, 400, { error: 'Password must be between 8 and 128 characters.' });

    const { data: duplicateUserId, error: duplicateCheckError } = await clients.admin
      .from('profiles')
      .select('id')
      .ilike('user_id', userId)
      .maybeSingle();
    if (duplicateCheckError) return reply(res, 500, { error: `Could not check User ID: ${duplicateCheckError.message}` });
    if (duplicateUserId) return reply(res, 409, { error: `User ID "${userId}" is already in use.` });

    const { data: created, error: createError } = await clients.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        user_id: userId,
        must_change_password: body.require_password_change === true
      }
    });
    if (createError || !created.user) {
      const message = createError?.message || 'Supabase Auth could not create this account.';
      const conflict = /already|exists|registered/i.test(message);
      return reply(res, conflict ? 409 : 400, { error: conflict ? 'An Auth account already exists for this email.' : message });
    }

    const profile = {
      id: created.user.id,
      company_id: caller.profile.company_id,
      user_id: userId,
      email,
      full_name: fullName,
      role,
      role_title: ROLE_TITLES[role],
      phone: typeof body.phone === 'string' ? body.phone.trim().slice(0, 30) || null : null,
      assigned_projects: assignedProjects,
      employee_id: typeof body.employee_id === 'string' ? body.employee_id.trim().slice(0, 100) || null : null,
      status,
      must_change_password: body.require_password_change === true,
      updated_at: new Date().toISOString()
    };

    const { data: savedProfile, error: profileError } = await clients.admin
      .from('profiles')
      .upsert(profile, { onConflict: 'id' })
      .select('id, user_id, email, full_name, role, role_title, company_id, phone, assigned_projects, employee_id, status, must_change_password, created_at, updated_at')
      .single();

    if (profileError || !savedProfile) {
      await clients.admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
      return reply(res, 500, { error: `Could not save the company profile. The Auth account was rolled back. ${profileError?.message || ''}`.trim() });
    }

    if (status === 'inactive') {
      const { error: banError } = await clients.admin.auth.admin.updateUserById(created.user.id, { ban_duration: '876000h' });
      if (banError) {
        await clients.admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
        return reply(res, 500, { error: `Could not apply the inactive status. The new account was rolled back. ${banError.message}` });
      }
    }

    return reply(res, 201, { account: toAccount(savedProfile) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected account provisioning error.';
    return reply(res, 500, { error: message });
  }
}
