import test from 'node:test';
import assert from 'node:assert/strict';

const storedValues = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storedValues.get(key) ?? null,
  setItem: (key: string, value: string) => { storedValues.set(key, String(value)); },
  removeItem: (key: string) => { storedValues.delete(key); },
  clear: () => storedValues.clear(),
  key: (index: number) => Array.from(storedValues.keys())[index] ?? null,
  get length() { return storedValues.size; }
};
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorageMock });

const { dataService, resolveSupabaseClientSettings, shouldQueueCloudStateSync } = await import('../src/services/dataService.ts');

const withCloudSyncIdentity = async <T>(params: {
  authUser: { id: string } | null;
  profile: { id: string; company_id: string; status: string } | null;
  currentUser?: { id: string; auth_uid?: string; company_id: string };
  appState?: { data: { state: Record<string, unknown> } | null; error: { message: string } | null };
  run: (result: { upsertRows: Record<string, unknown>[]; tables: string[] }) => Promise<T>;
}): Promise<T> => {
  const target = dataService as unknown as Record<string, unknown>;
  const oldConfig = target.config;
  const oldClient = target.supabase;
  const oldCurrentUser = target.currentUser;
  const upsertRows: Record<string, unknown>[] = [];
  const tables: string[] = [];
  const profileQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: params.profile, error: null })
  };
  const appStateQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => params.appState || { data: null, error: null },
    upsert: async (row: Record<string, unknown>) => {
      upsertRows.push(row);
      return { error: null };
    }
  };

  target.config = { url: 'https://project.example.test', anonKey: 'public-test-key', isConnected: true };
  target.currentUser = params.currentUser || {
    id: 'auth-user-1', auth_uid: 'auth-user-1', company_id: 'company-1',
    full_name: 'Test User', email: 'user@example.test', role: 'admin'
  };
  target.supabase = {
    auth: { getUser: async () => ({ data: { user: params.authUser }, error: null }) },
    from: (table: string) => {
      tables.push(table);
      if (table === 'profiles') return profileQuery;
      if (table === 'app_state') return appStateQuery;
      throw new Error('Unexpected table access in cloud-state test.');
    }
  };

  try {
    return await params.run({ upsertRows, tables });
  } finally {
    target.config = oldConfig;
    target.supabase = oldClient;
    target.currentUser = oldCurrentUser;
  }
};

test('publishable environment keys are preferred while legacy anon and saved browser settings remain supported', () => {
  assert.deepEqual(resolveSupabaseClientSettings({
    VITE_SUPABASE_URL: ' https://project.example.test/ ',
    VITE_SUPABASE_PUBLISHABLE_KEY: ' sb_publishable_test ',
    VITE_SUPABASE_ANON_KEY: 'legacy-anon-test'
  }), { url: 'https://project.example.test/', anonKey: 'sb_publishable_test' });
  assert.deepEqual(resolveSupabaseClientSettings({
    VITE_SUPABASE_URL: 'https://project.example.test',
    VITE_SUPABASE_ANON_KEY: 'legacy-anon-test'
  }), { url: 'https://project.example.test', anonKey: 'legacy-anon-test' });
  assert.deepEqual(resolveSupabaseClientSettings({}, {
    url: 'https://saved.example.test', anonKey: 'saved-public-key'
  }), { url: 'https://saved.example.test', anonKey: 'saved-public-key' });
});

test('connection health only succeeds when both Auth health and the companies query succeed', async () => {
  const target = dataService as unknown as Record<string, unknown>;
  const oldConfig = target.config;
  const oldClient = target.supabase;
  const oldFetch = globalThis.fetch;
  const oldStorageSyncInstalled = target.storageSyncInstalled;
  const oldQueueCloudStateSync = target.queueCloudStateSync;
  const oldSetItem = localStorageMock.setItem;
  const query = {
    select() { return this; },
    limit: async () => ({ data: [], error: null })
  };
  let queriedTable = '';
  let authHealthPath = '';
  let apiKeyHeader = '';
  let queuedCloudWrites = 0;

  target.config = {
    url: 'https://project.example.test',
    anonKey: 'sb_publishable_test',
    isConnected: false
  };
  target.supabase = { from: (table: string) => { queriedTable = table; return query; } };
  target.storageSyncInstalled = false;
  target.queueCloudStateSync = () => { queuedCloudWrites += 1; };
  globalThis.fetch = async (input, init) => {
    authHealthPath = String(input);
    apiKeyHeader = new Headers(init?.headers).get('apikey') || '';
    return new Response(JSON.stringify({ name: 'GoTrue' }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  };

  try {
    const result = await dataService.checkLiveConnection();
    assert.equal(result.success, true);
    assert.match(result.message, /Auth and the companies database query are reachable/i);
    assert.match(authHealthPath, /\/auth\/v1\/health$/);
    assert.equal(apiKeyHeader, 'sb_publishable_test');
    assert.equal(queriedTable, 'companies');
    assert.equal(dataService.isCloudConnected(), true);
    assert.equal(queuedCloudWrites, 0, 'saving local connection settings must not upload app state');
  } finally {
    globalThis.fetch = oldFetch;
    target.config = oldConfig;
    target.supabase = oldClient;
    target.storageSyncInstalled = oldStorageSyncInstalled;
    target.queueCloudStateSync = oldQueueCloudStateSync;
    localStorageMock.setItem = oldSetItem;
  }
});

test('connection health reports Auth rejection without claiming database connectivity', async () => {
  const target = dataService as unknown as Record<string, unknown>;
  const oldConfig = target.config;
  const oldClient = target.supabase;
  const oldFetch = globalThis.fetch;
  let databaseQueried = false;
  target.config = { url: 'https://project.example.test', anonKey: 'public-test-key', isConnected: true };
  target.supabase = { from: () => { databaseQueried = true; return { select() { return this; }, limit: async () => ({ data: [], error: null }) }; } };
  globalThis.fetch = async () => new Response(JSON.stringify({ message: 'invalid api key' }), { status: 401 });

  try {
    const result = await dataService.checkLiveConnection();
    assert.equal(result.success, false);
    assert.match(result.message, /Auth health check failed \(HTTP 401\)/i);
    assert.equal(databaseQueried, false);
    assert.equal(dataService.isCloudConnected(), false);
    assert.equal(result.message.includes('public-test-key'), false);
  } finally {
    globalThis.fetch = oldFetch;
    target.config = oldConfig;
    target.supabase = oldClient;
  }
});

test('connection health reports database permission/schema errors instead of marking cloud connected', async () => {
  const target = dataService as unknown as Record<string, unknown>;
  const oldConfig = target.config;
  const oldClient = target.supabase;
  const oldFetch = globalThis.fetch;
  target.config = { url: 'https://project.example.test', anonKey: 'public-test-key', isConnected: false };
  target.supabase = {
    from: () => ({ select() { return this; }, limit: async () => ({ data: null, error: { code: '42501', message: 'permission denied' } }) })
  };
  globalThis.fetch = async () => new Response(JSON.stringify({ name: 'GoTrue' }), { status: 200 });

  try {
    const result = await dataService.checkLiveConnection();
    assert.equal(result.success, false);
    assert.match(result.message, /Auth is reachable, but the companies database query failed \(42501\)/i);
    assert.equal(dataService.isCloudConnected(), false);
    assert.equal(result.message.includes('public-test-key'), false);
    assert.equal(result.message.includes('permission denied'), false);
  } finally {
    globalThis.fetch = oldFetch;
    target.config = oldConfig;
    target.supabase = oldClient;
  }
});

test('connection settings stay local while business state remains eligible for cloud sync', () => {
  assert.equal(shouldQueueCloudStateSync('buildpulse_supabase_config_v1'), false);
  assert.equal(shouldQueueCloudStateSync('buildpulse_auth_session_v1'), false);
  assert.equal(shouldQueueCloudStateSync('buildpulse_projects_v1'), true);
});

test('cloud state writes fail closed when the SDK has no authenticated Supabase user', async () => {
  await withCloudSyncIdentity({
    authUser: null,
    profile: null,
    run: async ({ upsertRows, tables }) => {
      await assert.rejects(dataService.persistCloudState(), /valid Supabase Auth session is required/i);
      assert.equal(upsertRows.length, 0);
      assert.deepEqual(tables, []);
    }
  });
});

test('cloud state writes fail closed when the authenticated UID does not match the active BuildPulse user', async () => {
  await withCloudSyncIdentity({
    authUser: { id: 'real-auth-user' },
    profile: { id: 'real-auth-user', company_id: 'company-1', status: 'active' },
    currentUser: { id: 'stale-local-user', auth_uid: 'stale-local-user', company_id: 'company-1' },
    run: async ({ upsertRows, tables }) => {
      await assert.rejects(dataService.persistCloudState(), /does not match the signed-in Supabase Auth user/i);
      assert.equal(upsertRows.length, 0);
      assert.deepEqual(tables, []);
    }
  });
});

test('cloud state writes fail closed when profile company differs from the company being synchronized', async () => {
  await withCloudSyncIdentity({
    authUser: { id: 'auth-user-1' },
    profile: { id: 'auth-user-1', company_id: 'company-1', status: 'active' },
    currentUser: { id: 'auth-user-1', auth_uid: 'auth-user-1', company_id: 'company-2' },
    run: async ({ upsertRows, tables }) => {
      await assert.rejects(dataService.persistCloudState(), /company_id does not match.*profile company_id/i);
      assert.equal(upsertRows.length, 0);
      assert.deepEqual(tables, ['profiles']);
    }
  });
});

test('app_state upsert uses only the active authenticated profile company ID', async () => {
  await withCloudSyncIdentity({
    authUser: { id: 'auth-user-1' },
    profile: { id: 'auth-user-1', company_id: 'company-1', status: 'active' },
    currentUser: { id: 'auth-user-1', auth_uid: 'auth-user-1', company_id: 'company-1' },
    run: async ({ upsertRows, tables }) => {
      await dataService.persistCloudState();
      assert.equal(upsertRows.length, 1);
      assert.equal(upsertRows[0].company_id, 'company-1');
      assert.deepEqual(tables, ['profiles', 'app_state']);
    }
  });
});
