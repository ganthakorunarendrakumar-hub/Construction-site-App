import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import type { AuthAccount } from '../src/types/index.ts';

const values = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, String(value)); },
  removeItem: (key: string) => { values.delete(key); },
  clear: () => values.clear(),
  key: (index: number) => Array.from(values.keys())[index] ?? null,
  get length() { return values.size; }
};

Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorageMock });
Object.defineProperty(globalThis, 'window', { configurable: true, value: { crypto: webcrypto } });

const { AuthCrypto, AuthService } = await import('../src/services/authService.ts');
const { dataService, restoreCloudStateSnapshot } = await import('../src/services/dataService.ts');
const ACCOUNTS_KEY = 'buildpulse_auth_accounts_v1';
const SESSION_KEY = 'buildpulse_auth_session_v1';

const makeAccount = async (input: {
  auth_uid: string;
  user_id: string;
  email: string;
  full_name: string;
  role: AuthAccount['role'];
  created_by: string;
  password: string;
}): Promise<AuthAccount> => {
  const password_salt = AuthCrypto.generateSalt();
  const password_hash = await AuthCrypto.hashPassword(input.password, password_salt);
  return {
    auth_uid: input.auth_uid,
    user_id: input.user_id,
    email: input.email,
    full_name: input.full_name,
    role: input.role,
    role_title: input.role === 'admin' ? 'Company Administrator' : 'Site Worker / Specialist',
    company_id: 'comp-apex-01',
    status: 'active',
    password_hash,
    password_salt,
    failed_attempts: 0,
    created_at: '2026-01-10T09:00:00.000Z',
    updated_at: '2026-01-10T09:00:00.000Z',
    created_by: input.created_by
  };
};

const readAccounts = (): AuthAccount[] => JSON.parse(values.get(ACCOUNTS_KEY) || '[]') as AuthAccount[];

const withMockedCloudAuth = async <T>(
  authenticate: (email: string, password: string) => Promise<import('../src/types/index.ts').UserProfile>,
  run: () => Promise<T>
): Promise<T> => {
  const target = dataService as unknown as Record<string, unknown>;
  const oldConfigured = target.isCloudConfigured;
  const oldConnected = target.isCloudConnected;
  const oldSignIn = target.signInWithSupabase;
  const oldSync = target.syncCloudState;
  const oldSignOut = target.signOutFromSupabase;
  target.isCloudConfigured = () => true;
  target.isCloudConnected = () => true;
  target.signInWithSupabase = authenticate;
  target.syncCloudState = async () => undefined;
  target.signOutFromSupabase = async () => undefined;
  try {
    return await run();
  } finally {
    if (oldConfigured === undefined) delete target.isCloudConfigured; else target.isCloudConfigured = oldConfigured;
    if (oldConnected === undefined) delete target.isCloudConnected; else target.isCloudConnected = oldConnected;
    if (oldSignIn === undefined) delete target.signInWithSupabase; else target.signInWithSupabase = oldSignIn;
    if (oldSync === undefined) delete target.syncCloudState; else target.syncCloudState = oldSync;
    if (oldSignOut === undefined) delete target.signOutFromSupabase; else target.signOutFromSupabase = oldSignOut;
  }
};

const withLocalRecovery = async <T>(
  service: InstanceType<typeof AuthService>,
  fetchHandler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  run: () => Promise<T>,
  configuredUrl = ''
): Promise<T> => {
  const dataTarget = dataService as unknown as Record<string, unknown>;
  const oldConfigGetter = dataTarget.getConfig;
  const oldConnected = dataTarget.isCloudConnected;
  const oldConfigured = dataTarget.isCloudConfigured;
  const serviceTarget = service as unknown as Record<string, unknown>;
  const oldRecoveryMode = serviceTarget.isLocalAdminRecoveryMode;
  const oldFetch = globalThis.fetch;
  dataTarget.getConfig = () => ({ url: configuredUrl, anonKey: '' });
  dataTarget.isCloudConnected = () => false;
  dataTarget.isCloudConfigured = () => false;
  serviceTarget.isLocalAdminRecoveryMode = () => true;
  globalThis.fetch = fetchHandler;
  try {
    return await run();
  } finally {
    if (oldConfigGetter === undefined) delete dataTarget.getConfig; else dataTarget.getConfig = oldConfigGetter;
    if (oldConnected === undefined) delete dataTarget.isCloudConnected; else dataTarget.isCloudConnected = oldConnected;
    if (oldConfigured === undefined) delete dataTarget.isCloudConfigured; else dataTarget.isCloudConfigured = oldConfigured;
    if (oldRecoveryMode === undefined) delete serviceTarget.isLocalAdminRecoveryMode; else serviceTarget.isLocalAdminRecoveryMode = oldRecoveryMode;
    globalThis.fetch = oldFetch;
  }
};

const jsonResponse = (body: Record<string, unknown>, status = 200): Response => new Response(
  JSON.stringify(body),
  { status, headers: { 'Content-Type': 'application/json' } }
);

const cloudProfile = (overrides: Partial<import('../src/types/index.ts').UserProfile> = {}): import('../src/types/index.ts').UserProfile => ({
  id: 'supabase-auth-uuid',
  auth_uid: 'supabase-auth-uuid',
  email: 'admin@cheninfra.com',
  full_name: 'Uma Mahesh',
  role: 'admin',
  role_title: 'Company Administrator',
  company_id: 'supabase-company-uuid',
  status: 'active',
  ...overrides
});

const withFakeSupabaseClient = async <T>(
  authResult: { data: { user: { id: string; email?: string } | null }; error: { message: string; code?: string } | null },
  profileResult: { data: Record<string, unknown> | null; error: { message: string; code?: string } | null },
  run: () => Promise<T>
): Promise<T> => {
  const target = dataService as unknown as Record<string, unknown>;
  const oldClient = target.supabase;
  const oldConfig = target.config;
  const oldCurrentUser = target.currentUser;
  const oldSync = target.syncCloudState;
  const query = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => profileResult
  };
  target.supabase = {
    auth: {
      signInWithPassword: async () => authResult,
      signOut: async () => ({ error: null })
    },
    from: (table: string) => {
      assert.equal(table, 'profiles');
      return query;
    }
  };
  target.config = { url: 'https://configured-project.example.test', anonKey: 'public-test-key', isConnected: false };
  target.syncCloudState = async () => undefined;
  try {
    return await run();
  } finally {
    if (oldClient === undefined) delete target.supabase; else target.supabase = oldClient;
    if (oldConfig === undefined) delete target.config; else target.config = oldConfig;
    if (oldCurrentUser === undefined) delete target.currentUser; else target.currentUser = oldCurrentUser;
    if (oldSync === undefined) delete target.syncCloudState; else target.syncCloudState = oldSync;
  }
};

test('the verified legacy administrator is corrected in place while credentials and unrelated assignments are preserved', async () => {
  values.clear();
  const password = `admin-${globalThis.crypto.randomUUID()}`;
  const admin = await makeAccount({
    auth_uid: 'auth-usr-admin-01', user_id: 'CHEN-ADM-01', email: 'admin@cheninfra.com',
    full_name: 'Rajesh Sharma', role: 'admin', created_by: 'system_bootstrap', password
  });
  admin.assigned_projects = ['proj-skyline-01', 'proj-emerald-02', 'project-with-confirmed-assignment'];
  const staff = {
    ...admin,
    auth_uid: 'manual-staff-auth',
    user_id: 'MANUAL-STAFF-01',
    email: 'staff@example.test',
    full_name: 'Manual Staff',
    role: 'worker' as const,
    role_title: 'Site Worker / Specialist',
    created_by: 'admin-user',
    assigned_projects: ['proj-skyline-01']
  };
  values.set(ACCOUNTS_KEY, JSON.stringify([admin, staff]));
  const sessionToken = AuthCrypto.generateSessionToken();
  values.set(SESSION_KEY, JSON.stringify({
    token: sessionToken,
    auth_uid: admin.auth_uid,
    user_id: admin.user_id,
    email: admin.email,
    full_name: admin.full_name,
    role: admin.role,
    role_title: admin.role_title,
    company_id: admin.company_id,
    assigned_projects: admin.assigned_projects,
    login_at: '2026-10-24T09:00:00.000Z',
    expires_at: Date.now() + 60_000
  }));

  const originalVerifier = { password_hash: admin.password_hash, password_salt: admin.password_salt };
  const service = new AuthService();
  await service.ensureInitialized();

  const [migratedAdmin, unchangedStaff] = readAccounts();
  assert.equal(migratedAdmin.full_name, 'Uma Mahesh');
  assert.equal(migratedAdmin.role, 'admin');
  assert.equal(migratedAdmin.role_title, 'Company Administrator');
  assert.equal(migratedAdmin.auth_uid, 'auth-usr-admin-01');
  assert.equal(migratedAdmin.user_id, 'CHEN-ADM-01');
  assert.equal(migratedAdmin.email, 'admin@cheninfra.com');
  assert.deepEqual(
    { password_hash: migratedAdmin.password_hash, password_salt: migratedAdmin.password_salt },
    originalVerifier
  );
  assert.deepEqual(migratedAdmin.assigned_projects, ['project-with-confirmed-assignment']);
  assert.equal(unchangedStaff.full_name, 'Manual Staff');
  assert.deepEqual(unchangedStaff.assigned_projects, ['proj-skyline-01']);

  const updatedSession = JSON.parse(values.get(SESSION_KEY) || 'null');
  assert.equal(updatedSession.full_name, 'Uma Mahesh');
  assert.equal(updatedSession.token, sessionToken);
  assert.deepEqual(updatedSession.assigned_projects, ['project-with-confirmed-assignment']);

  await service.login(admin.email, password);
  assert.equal(service.getCurrentUser().full_name, 'Uma Mahesh');
  assert.equal(service.getCurrentUser().role, 'admin');
});

test('administrator records outside the exact bootstrap identity are not rewritten', async () => {
  values.clear();
  const admin = await makeAccount({
    auth_uid: 'owner-auth', user_id: 'OWNER-01', email: 'owner@example.test',
    full_name: 'Owner Selected Name', role: 'admin', created_by: 'owner', password: 'owner-password'
  });
  admin.assigned_projects = ['proj-skyline-01', 'proj-emerald-02'];
  values.set(ACCOUNTS_KEY, JSON.stringify([admin]));

  await new AuthService().ensureInitialized();

  assert.equal(readAccounts()[0].full_name, 'Owner Selected Name');
  assert.deepEqual(readAccounts()[0].assigned_projects, ['proj-skyline-01', 'proj-emerald-02']);
});

test('a missing account store remains empty instead of creating preset users', async () => {
  values.clear();
  const service = new AuthService();
  await service.ensureInitialized();

  assert.equal(values.has(ACCOUNTS_KEY), false);
  assert.deepEqual(readAccounts(), []);
});

test('malformed account storage is preserved and does not trigger a preset-account seed', async () => {
  values.clear();
  const damaged = '{not valid json';
  values.set(ACCOUNTS_KEY, damaged);
  const service = new AuthService();

  await assert.rejects(service.ensureInitialized(), /unreadable/i);
  assert.equal(values.get(ACCOUNTS_KEY), damaged);
});

test('only confirmed bootstrap staff are migrated; admin and manual users survive logout/login while deleted users stay deleted', async () => {
  values.clear();
  const adminPassword = `admin-${globalThis.crypto.randomUUID()}`;
  const admin = await makeAccount({
    auth_uid: 'auth-usr-admin-01', user_id: 'CHEN-ADM-01', email: 'admin@cheninfra.com',
    full_name: 'Rajesh Sharma', role: 'admin', created_by: 'system_bootstrap', password: adminPassword
  });
  const bootstrapStaff: Array<Pick<AuthAccount, 'auth_uid' | 'user_id' | 'email' | 'full_name' | 'role'>> = [
    { auth_uid: 'auth-usr-sup-02', user_id: 'CHEN-SUP-02', email: 'supervisor.ananya@cheninfra.com', full_name: 'Ananya Rao', role: 'site_supervisor' },
    { auth_uid: 'auth-usr-acc-03', user_id: 'CHEN-ACC-03', email: 'accountant.kavita@cheninfra.com', full_name: 'Kavita Sundaram', role: 'accountant' },
    { auth_uid: 'auth-usr-wrk-04', user_id: 'CHEN-WRK-04', email: 'worker.daniel@cheninfra.com', full_name: 'Daniel Murmu', role: 'worker' },
    { auth_uid: 'auth-usr-str-05', user_id: 'CHEN-STR-05', email: 'storekeeper.manoj@cheninfra.com', full_name: 'Manoj Kumar', role: 'storekeeper' }
  ].map(sample => ({
    ...admin,
    ...sample,
    role_title: sample.role,
    password_hash: 'test-fixture-hash',
    password_salt: 'test-fixture-salt',
    created_by: 'system_bootstrap'
  } as AuthAccount));
  values.set(ACCOUNTS_KEY, JSON.stringify([admin, ...bootstrapStaff]));

  const initialService = new AuthService();
  await initialService.ensureInitialized();
  assert.deepEqual(readAccounts().map(account => account.auth_uid), [admin.auth_uid]);
  await initialService.login(admin.email, adminPassword);

  const manualPassword = `staff-${globalThis.crypto.randomUUID()}`;
  const created = await initialService.createAccount({
    full_name: 'Manually Added Worker',
    email: `worker-${globalThis.crypto.randomUUID()}@example.test`,
    role: 'worker',
    initial_password: manualPassword
  });
  assert.deepEqual(readAccounts().map(account => account.auth_uid), [admin.auth_uid, created.auth_uid]);

  await initialService.logout();
  const afterFirstLogin = new AuthService();
  await afterFirstLogin.login(admin.email, adminPassword);
  assert.deepEqual((await afterFirstLogin.getAccounts()).map(account => account.auth_uid), [admin.auth_uid, created.auth_uid]);

  await afterFirstLogin.deleteAccount(created.auth_uid);
  assert.deepEqual(readAccounts().map(account => account.auth_uid), [admin.auth_uid]);
  await afterFirstLogin.logout();

  const afterDeletionLogin = new AuthService();
  await afterDeletionLogin.login(admin.email, adminPassword);
  assert.deepEqual((await afterDeletionLogin.getAccounts()).map(account => account.auth_uid), [admin.auth_uid]);
  assert.equal(afterDeletionLogin.getCurrentUser().auth_uid, admin.auth_uid);
});

test('legacy cloud snapshots cannot restore local authentication accounts or sessions', () => {
  values.clear();
  const localAccounts = JSON.stringify([{ auth_uid: 'legitimate-admin' }]);
  values.set(ACCOUNTS_KEY, localAccounts);
  values.set(SESSION_KEY, 'local-session');

  restoreCloudStateSnapshot({
    [ACCOUNTS_KEY]: JSON.stringify([{ auth_uid: 'deleted-bootstrap-user' }]),
    [SESSION_KEY]: 'stale-cloud-session',
    buildpulse_projects_v1: JSON.stringify([{ id: 'project-1' }]),
    unrelated_key: 'ignored'
  }, localStorageMock);

  assert.equal(values.get(ACCOUNTS_KEY), localAccounts);
  assert.equal(values.get(SESSION_KEY), 'local-session');
  assert.equal(values.get('buildpulse_projects_v1'), JSON.stringify([{ id: 'project-1' }]));
  assert.equal(values.has('unrelated_key'), false);
});

test('cloud administrator can sign in by registered email without a local password-account mirror', async () => {
  values.clear();
  await withMockedCloudAuth(async (email, password) => {
    assert.equal(email, 'admin@cheninfra.com');
    assert.equal(password, 'provided-secret');
    return cloudProfile();
  }, async () => {
    const service = new AuthService();
    const session = await service.login('  ADMIN@CHENINFRA.COM  ', 'provided-secret');
    assert.equal(session.auth_uid, 'supabase-auth-uuid');
    assert.equal(session.full_name, 'Uma Mahesh');
    assert.equal(session.role, 'admin');
    assert.equal(session.company_id, 'supabase-company-uuid');
    assert.equal(service.getCurrentUser().role, 'admin');
    assert.equal(readAccounts().length, 0);
  });
});

test('cloud regular-user login preserves the role and company returned by its own Supabase profile', async () => {
  values.clear();
  await withMockedCloudAuth(async () => cloudProfile({
    id: 'regular-auth-uuid', auth_uid: 'regular-auth-uuid',
    email: 'worker@example.test', user_id: 'WORKER-88', full_name: 'Registered Worker',
    role: 'worker', role_title: 'Site Worker / Specialist', company_id: 'other-company-uuid'
  }), async () => {
    const service = new AuthService();
    const session = await service.login('worker@example.test', 'correct-cloud-password');
    assert.equal(session.user_id, 'WORKER-88');
    assert.equal(session.role, 'worker');
    assert.equal(session.company_id, 'other-company-uuid');
    assert.equal(service.getCurrentUser().company_id, 'other-company-uuid');
  });
});

test('cloud User ID resolution uses a normalized local mapping and never treats its legacy auth_uid as Supabase UUID', async () => {
  values.clear();
  const local = await makeAccount({
    auth_uid: 'legacy-local-auth-id', user_id: 'STAFF-55', email: 'staff@example.test',
    full_name: 'Local Directory Name', role: 'admin', created_by: 'manual-admin', password: 'old-local-verifier'
  });
  local.user_id = '  staff-55  ';
  local.email = ' STAFF@EXAMPLE.TEST ';
  local.company_id = 'staff-company';
  values.set(ACCOUNTS_KEY, JSON.stringify([local]));
  await withMockedCloudAuth(async (email, password) => {
    assert.equal(email, 'staff@example.test');
    assert.equal(password, 'registered-cloud-password');
    return cloudProfile({
      id: 'actual-supabase-uuid', auth_uid: 'actual-supabase-uuid',
      email: 'staff@example.test', user_id: 'STAFF-55', role: 'site_supervisor',
      role_title: 'Site Supervisor', company_id: 'staff-company', assigned_projects: ['site-1']
    });
  }, async () => {
    const service = new AuthService();
    const session = await service.login(' staff-55 ', 'registered-cloud-password');
    assert.equal(session.auth_uid, 'actual-supabase-uuid');
    assert.notEqual(session.auth_uid, local.auth_uid);
    assert.equal(session.role, 'site_supervisor');
    assert.equal(session.company_id, 'staff-company');
    assert.deepEqual(session.assigned_projects, ['site-1']);
  });
});

test('cloud User ID without a safe local email mapping is rejected with a clear limitation', async () => {
  values.clear();
  await withMockedCloudAuth(async () => cloudProfile(), async () => {
    const service = new AuthService();
    await assert.rejects(service.login('CHEN-ADM-01', 'provided-secret'), /User ID is not linked.*registered email.*self-readable/i);
    assert.equal(service.getSession(), null);
  });
});

test('a missing Supabase profile is reported accurately and does not create a local account or session', async () => {
  values.clear();
  await withMockedCloudAuth(async () => {
    throw new Error('Supabase Auth accepted this account, but no matching profile exists.');
  }, async () => {
    const service = new AuthService();
    await assert.rejects(service.login('admin@cheninfra.com', 'provided-secret'), /no matching profile/i);
    assert.equal(service.getSession(), null);
    assert.equal(values.has(ACCOUNTS_KEY), false);
  });
});

test('valid local credentials are not used as a fallback when Supabase Auth rejects the configured cloud login', async () => {
  values.clear();
  const account = await makeAccount({
    auth_uid: 'local-admin-auth', user_id: 'CHEN-ADM-01', email: 'admin@cheninfra.com',
    full_name: 'Uma Mahesh', role: 'admin', created_by: 'system_bootstrap', password: 'local-admin-password'
  });
  values.set(ACCOUNTS_KEY, JSON.stringify([account]));
  assert.equal(await AuthCrypto.verifyPassword('local-admin-password', account.password_salt, account.password_hash), true);

  await withMockedCloudAuth(async (email, password) => {
    assert.equal(email, 'admin@cheninfra.com');
    assert.equal(password, 'local-admin-password');
    throw new Error('Invalid email or password. Supabase did not authenticate this account.');
  }, async () => {
    const service = new AuthService();
    await assert.rejects(service.login('CHEN-ADM-01', 'local-admin-password'), /Invalid email or password/i);
    assert.equal(service.getSession(), null);
    assert.deepEqual(readAccounts().map(item => item.user_id), ['CHEN-ADM-01']);
  });
});

test('cloud profiles cannot change company or role through a local mapping', async () => {
  values.clear();
  const local = await makeAccount({
    auth_uid: 'legacy-admin-id', user_id: 'MAPPED-01', email: 'mapped@example.test',
    full_name: 'Legacy Local Name', role: 'admin', created_by: 'manual-admin', password: 'local-only-password'
  });
  values.set(ACCOUNTS_KEY, JSON.stringify([local]));
  await withMockedCloudAuth(async () => cloudProfile({
    id: 'mapped-cloud-uuid', auth_uid: 'mapped-cloud-uuid', email: 'mapped@example.test',
    full_name: 'Cloud Profile Name', role: 'worker', role_title: 'Site Worker / Specialist',
    company_id: 'isolated-company'
  }), async () => {
    const service = new AuthService();
    const session = await service.login('mapped@example.test', 'cloud-password');
    assert.equal(session.role, 'worker');
    assert.equal(session.company_id, 'isolated-company');
    assert.deepEqual(session.assigned_projects, []);
  });
});

test('a User ID mapping cannot resolve credentials across company boundaries', async () => {
  values.clear();
  const local = await makeAccount({
    auth_uid: 'legacy-user-id', user_id: 'TENANT-USER-1', email: 'tenant-user@example.test',
    full_name: 'Tenant User', role: 'worker', created_by: 'manual-admin', password: 'local-password'
  });
  local.company_id = 'company-one';
  values.set(ACCOUNTS_KEY, JSON.stringify([local]));
  await withMockedCloudAuth(async () => cloudProfile({
    id: 'cloud-user-id', auth_uid: 'cloud-user-id', email: 'tenant-user@example.test',
    full_name: 'Tenant User', role: 'worker', company_id: 'company-two'
  }), async () => {
    const service = new AuthService();
    await assert.rejects(service.login('tenant-user-1', 'cloud-password'), /different company/i);
    assert.equal(service.getSession(), null);
  });
});

test('Supabase profile lookup binds by the actual Auth UUID and preserves the profile tenant and role', async () => {
  await withFakeSupabaseClient({
    data: { user: { id: 'actual-auth-uuid', email: 'Admin@ChenInfra.com' } }, error: null
  }, {
    data: {
      id: 'actual-auth-uuid', email: 'admin@cheninfra.com', full_name: 'Uma Mahesh',
      role: 'admin', role_title: 'Company Administrator', company_id: 'existing-company-uuid'
    }, error: null
  }, async () => {
    const profile = await dataService.signInWithSupabase(' ADMIN@CHENINFRA.COM ', 'provided-secret');
    assert.equal(profile.auth_uid, 'actual-auth-uuid');
    assert.notEqual(profile.auth_uid, 'auth-usr-admin-01');
    assert.equal(profile.email, 'admin@cheninfra.com');
    assert.equal(profile.role, 'admin');
    assert.equal(profile.company_id, 'existing-company-uuid');
  });
});

test('Supabase authentication without a matching profile fails closed with a recovery instruction', async () => {
  await withFakeSupabaseClient({
    data: { user: { id: 'orphan-auth-uuid', email: 'admin@cheninfra.com' } }, error: null
  }, { data: null, error: null }, async () => {
    await assert.rejects(dataService.signInWithSupabase('admin@cheninfra.com', 'provided-secret'), /no matching profile.*existing Auth UUID/i);
  });
});

test('invalid Supabase credentials explain that local passwords are not used in cloud auth mode', async () => {
  await withFakeSupabaseClient({
    data: { user: null }, error: { message: 'Invalid login credentials', code: '400' }
  }, { data: null, error: null }, async () => {
    await assert.rejects(
      dataService.signInWithSupabase('admin@cheninfra.com', 'provided-secret'),
      /Supabase Auth did not authenticate.*local BuildPulse password is not checked.*reset that same account/i
    );
  });
});

test('Supabase network failures are distinguished from invalid credentials', async () => {
  await withFakeSupabaseClient({
    data: { user: null }, error: { message: 'Failed to fetch', code: 'FETCH_ERROR' }
  }, { data: null, error: null }, async () => {
    await assert.rejects(dataService.signInWithSupabase('admin@cheninfra.com', 'provided-secret'), /Could not reach the configured Supabase authentication service/i);
  });
});

test('Supabase profile email or Auth UUID mismatch is rejected instead of applying another user role', async () => {
  await withFakeSupabaseClient({
    data: { user: { id: 'auth-user-a', email: 'user-a@example.test' } }, error: null
  }, {
    data: {
      id: 'auth-user-b', email: 'user-b@example.test', full_name: 'Different User',
      role: 'admin', role_title: 'Company Administrator', company_id: 'another-company'
    }, error: null
  }, async () => {
    await assert.rejects(dataService.signInWithSupabase('user-a@example.test', 'provided-secret'), /does not match the authenticated Auth identity/i);
  });
});

test('a missing local account store gives the owner an accurate recovery/configuration message', async () => {
  values.clear();
  const service = new AuthService();
  await assert.rejects(service.login('CHEN-ADM-01', 'provided-secret'), /No local account store.*Supabase is not configured/i);
  assert.equal(service.getSession(), null);
  assert.equal(values.has(ACCOUNTS_KEY), false);
});

test('a saved Supabase URL without its public key fails closed with a precise setup message', async () => {
  values.clear();
  const account = await makeAccount({
    auth_uid: 'local-admin-auth', user_id: 'CHEN-ADM-01', email: 'admin@cheninfra.com',
    full_name: 'Uma Mahesh', role: 'admin', created_by: 'system_bootstrap', password: 'local-admin-password'
  });
  values.set(ACCOUNTS_KEY, JSON.stringify([account]));

  const target = dataService as unknown as Record<string, unknown>;
  const oldGetConfig = target.getConfig;
  const oldIsCloudConfigured = target.isCloudConfigured;
  target.getConfig = () => ({
    url: 'https://ihgpueqocupondgolhjq.supabase.co', anonKey: '', isConnected: false
  });
  target.isCloudConfigured = () => false;
  try {
    const service = new AuthService();
    await assert.rejects(
      service.login('CHEN-ADM-01', 'local-admin-password'),
      /publishable API key \(or legacy anon key\) is missing.*no local authentication fallback/i
    );
    assert.equal(service.getSession(), null);
    assert.deepEqual(readAccounts().map(item => item.user_id), ['CHEN-ADM-01']);
  } finally {
    if (oldGetConfig === undefined) delete target.getConfig; else target.getConfig = oldGetConfig;
    if (oldIsCloudConfigured === undefined) delete target.isCloudConfigured; else target.isCloudConfigured = oldIsCloudConfigured;
  }
});

test('local recovery is unavailable in the ordinary app mode without calling the recovery server', async () => {
  values.clear();
  const service = new AuthService();
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return jsonResponse({ available: true });
  };
  try {
    const status = await service.getLocalAdminRecoveryStatus();
    assert.equal(status.available, false);
    assert.match(status.message || '', /dedicated local recovery command/i);
    assert.equal(fetchCalled, false);
    await assert.rejects(service.recoverLocalAdministrator({
      full_name: 'Uma Mahesh', user_id: 'CHEN-ADM-01', email: 'admin@cheninfra.com', password: 'not-a-real-password'
    }), /dedicated development recovery mode/i);
    assert.equal(values.has(ACCOUNTS_KEY), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('terminal-authorized local recovery creates the known admin identity with a PBKDF2 password and normal local login works', async () => {
  values.clear();
  const service = new AuthService();
  const submittedBodies: Record<string, unknown>[] = [];
  const fakeRecoveryServer = async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    submittedBodies.push(body);
    if (String(_input).includes('/status')) return jsonResponse({ available: true });
    if (String(_input).endsWith('/authorize')) return jsonResponse({ grant: 'test-only-grant' });
    if (String(_input).endsWith('/complete')) return jsonResponse({ completed: true });
    if (String(_input).endsWith('/cancel')) return jsonResponse({ cancelled: true });
    return jsonResponse({}, 404);
  };

  await withLocalRecovery(service, fakeRecoveryServer, async () => {
    const status = await service.getLocalAdminRecoveryStatus();
    assert.equal(status.available, true);
    assert.equal(status.operation, 'create');
    assert.deepEqual(status.identity, {
      full_name: 'Uma Mahesh', user_id: 'CHEN-ADM-01', email: 'admin@cheninfra.com'
    });

    const result = await service.recoverLocalAdministrator({
      full_name: 'Uma Mahesh', user_id: ' chen-adm-01 ', email: ' ADMIN@CHENINFRA.COM ',
      password: 'owner-selected-test-password'
    });
    assert.equal(result.action, 'created');
    assert.equal(result.account.role, 'admin');
    assert.equal(result.account.company_id, 'comp-apex-01');
    assert.equal(result.account.password_hash === 'owner-selected-test-password', false);
    assert.equal(await AuthCrypto.verifyPassword('owner-selected-test-password', result.account.password_salt, result.account.password_hash), true);
    assert.equal(submittedBodies.find(body => body.operation === 'create')?.user_id, 'CHEN-ADM-01');
    assert.equal(submittedBodies.some(body => 'password' in body || 'password_hash' in body), false);

    const session = await service.login(' CHEN-ADM-01 ', 'owner-selected-test-password');
    assert.equal(session.role, 'admin');
    assert.equal(session.company_id, 'comp-apex-01');
    assert.equal(readAccounts().length, 1);
  });
});

test('terminal-authorized recovery resets the matching local administrator in place and preserves account identity data', async () => {
  values.clear();
  const existing = await makeAccount({
    auth_uid: 'existing-local-admin-id', user_id: 'CHEN-ADM-01', email: 'admin@cheninfra.com',
    full_name: 'Rajesh Sharma', role: 'admin', created_by: 'owner', password: 'old-owner-password'
  });
  existing.status = 'inactive';
  existing.assigned_projects = ['project-existing'];
  existing.created_at = '2024-02-03T04:05:06.000Z';
  values.set(ACCOUNTS_KEY, JSON.stringify([existing]));
  const service = new AuthService();
  const submittedOperations: string[] = [];
  const fakeRecoveryServer = async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    if (typeof body.operation === 'string') submittedOperations.push(body.operation);
    if (String(_input).includes('/status')) return jsonResponse({ available: true });
    if (String(_input).endsWith('/authorize')) return jsonResponse({ grant: 'restore-test-grant' });
    if (String(_input).endsWith('/complete')) return jsonResponse({ completed: true });
    if (String(_input).endsWith('/cancel')) return jsonResponse({ cancelled: true });
    return jsonResponse({}, 404);
  };

  await withLocalRecovery(service, fakeRecoveryServer, async () => {
    const status = await service.getLocalAdminRecoveryStatus();
    assert.equal(status.operation, 'restore');
    const result = await service.recoverLocalAdministrator({
      full_name: 'Uma Mahesh', user_id: 'CHEN-ADM-01', email: 'admin@cheninfra.com',
      password: 'owner-selected-new-password'
    });
    assert.equal(result.action, 'restored');
    assert.equal(submittedOperations.includes('restore'), true);
    const accounts = readAccounts();
    assert.equal(accounts.length, 1);
    assert.equal(accounts[0].auth_uid, 'existing-local-admin-id');
    assert.equal(accounts[0].full_name, 'Uma Mahesh');
    assert.equal(accounts[0].role, 'admin');
    assert.equal(accounts[0].company_id, 'comp-apex-01');
    assert.deepEqual(accounts[0].assigned_projects, ['project-existing']);
    assert.equal(accounts[0].created_at, '2024-02-03T04:05:06.000Z');
    assert.equal(accounts[0].status, 'active');
    assert.equal(await AuthCrypto.verifyPassword('owner-selected-new-password', accounts[0].password_salt, accounts[0].password_hash), true);
  });
});

test('local recovery refuses cloud configuration, identity collisions, and terminal-denied requests without changing account data', async () => {
  values.clear();
  const service = new AuthService();
  let fetchCalled = false;
  await withLocalRecovery(service, async () => {
    fetchCalled = true;
    return jsonResponse({ available: true });
  }, async () => {
    const status = await service.getLocalAdminRecoveryStatus();
    assert.equal(status.available, false);
    assert.match(status.message || '', /cloud authentication or configuration/i);
  }, 'https://configured.example.test');
  assert.equal(fetchCalled, false);

  const collision = await makeAccount({
    auth_uid: 'unrelated-account', user_id: 'CHEN-ADM-01', email: 'different@example.test',
    full_name: 'Not Uma', role: 'worker', created_by: 'owner', password: 'some-test-password'
  });
  values.set(ACCOUNTS_KEY, JSON.stringify([collision]));
  const before = values.get(ACCOUNTS_KEY);
  const collisionService = new AuthService();
  await withLocalRecovery(collisionService, async () => jsonResponse({ available: true }), async () => {
    const status = await collisionService.getLocalAdminRecoveryStatus();
    assert.equal(status.available, false);
    assert.match(status.message || '', /conflicts with an existing local account/i);
    await assert.rejects(collisionService.recoverLocalAdministrator({
      full_name: 'Uma Mahesh', user_id: 'CHEN-ADM-01', email: 'admin@cheninfra.com',
      password: 'owner-selected-test-password'
    }), /conflicts with an existing local account/i);
  });
  assert.equal(values.get(ACCOUNTS_KEY), before);

  values.clear();
  const deniedService = new AuthService();
  await withLocalRecovery(deniedService, async (input, init) => {
    if (String(input).endsWith('/authorize')) return jsonResponse({ message: 'The local owner did not approve this recovery request.' }, 403);
    return jsonResponse({ available: true });
  }, async () => {
    await assert.rejects(deniedService.recoverLocalAdministrator({
      full_name: 'Uma Mahesh', user_id: 'CHEN-ADM-01', email: 'admin@cheninfra.com',
      password: 'owner-selected-test-password'
    }), /did not approve/i);
  });
  assert.equal(values.has(ACCOUNTS_KEY), false);
});
