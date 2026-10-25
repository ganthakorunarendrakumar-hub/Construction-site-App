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
const { restoreCloudStateSnapshot } = await import('../src/services/dataService.ts');
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
