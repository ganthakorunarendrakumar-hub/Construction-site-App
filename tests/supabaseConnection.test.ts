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
