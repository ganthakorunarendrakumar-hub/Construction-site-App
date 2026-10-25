import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import type { UserProfile } from '../src/types/index.ts';

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

const { dataService } = await import('../src/services/dataService.ts');
const { COMPANY_BRANDING_MIGRATION_SQL } = await import('../src/services/supabaseSchemaSql.ts');
const COMPANY_KEY = 'buildpulse_company_v1';

const makeUser = (role: UserProfile['role'], companyId = 'company-test-1'): UserProfile => ({
  id: `user-${role}`,
  auth_uid: `user-${role}`,
  user_id: `${role}-id`,
  email: `${role}@example.test`,
  full_name: 'Company Member',
  role,
  role_title: role === 'admin' ? 'Company Administrator' : 'Site Supervisor',
  company_id: companyId,
  status: 'active'
});

test('an unconfigured company stays blank and is not automatically stored', async () => {
  values.clear();
  dataService.setCurrentUser(makeUser('admin'));

  const company = await dataService.getCompany();

  assert.equal(company.name, '');
  assert.equal(company.watermark_enabled, false);
  assert.equal(company.watermark_opacity, 6);
  assert.equal(company.watermark_size, 280);
  assert.equal(values.has(COMPANY_KEY), false);
});

test('the legacy example company name is treated as unconfigured without overwriting stored data', async () => {
  values.clear();
  dataService.setCurrentUser(makeUser('admin'));
  const legacyValue = JSON.stringify({
    id: 'company-test-1',
    name: 'Apex Horizon Builders & Infrastructure',
    code: 'EXAMPLE',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z'
  });
  values.set(COMPANY_KEY, legacyValue);

  const company = await dataService.getCompany();

  assert.equal(company.name, '');
  assert.equal(values.get(COMPANY_KEY), legacyValue);
});

test('company name and watermark settings persist on the existing company record', async () => {
  values.clear();
  dataService.setCurrentUser(makeUser('admin'));

  const named = await dataService.updateCompanyName('  Northfield Construction  ');
  assert.equal(named.name, 'Northfield Construction');

  const branded = await dataService.updateCompanySettings({
    logo_url: 'data:image/png;base64,AA==',
    watermark_enabled: true,
    watermark_opacity: 22,
    watermark_size: 500
  });
  const persisted = JSON.parse(values.get(COMPANY_KEY) || 'null') as Record<string, unknown>;

  assert.equal(branded.name, 'Northfield Construction');
  assert.equal(branded.logo_url, 'data:image/png;base64,AA==');
  assert.equal(branded.watermark_enabled, true);
  assert.equal(branded.watermark_opacity, 20);
  assert.equal(branded.watermark_size, 360);
  assert.deepEqual(persisted['company-test-1'], branded);
});

test('an enabled watermark requires a saved company logo', async () => {
  values.clear();
  dataService.setCurrentUser(makeUser('admin'));

  await assert.rejects(dataService.updateCompanySettings({ watermark_enabled: true }), /logo/i);
  assert.equal(values.has(COMPANY_KEY), false);
});

test('only company administrators can change company settings', async () => {
  values.clear();
  dataService.setCurrentUser(makeUser('site_supervisor'));

  await assert.rejects(dataService.updateCompanyName('Unauthorized Company'), /Administrators/i);
  await assert.rejects(dataService.updateCompanySettings({ watermark_enabled: false }), /Administrators/i);
  assert.equal(values.has(COMPANY_KEY), false);
});

test('logo uploads reject unsupported formats, oversized files, and non-admin users', async () => {
  values.clear();
  dataService.setCurrentUser(makeUser('admin'));
  await assert.rejects(
    dataService.uploadCompanyLogo({ type: 'image/svg+xml', size: 10 } as File),
    /PNG, JPG, or WebP/i
  );
  await assert.rejects(
    dataService.uploadCompanyLogo({ type: 'image/png', size: 512 * 1024 + 1 } as File),
    /512 KB/i
  );

  dataService.setCurrentUser(makeUser('site_supervisor'));
  await assert.rejects(
    dataService.uploadCompanyLogo({ type: 'image/png', size: 10 } as File),
    /Administrators/i
  );
  assert.equal(values.has(COMPANY_KEY), false);
});

test('local company branding is not shown to a different company account', async () => {
  values.clear();
  values.set(COMPANY_KEY, JSON.stringify({
    id: 'company-a',
    name: 'Company A',
    code: 'A',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z'
  }));
  dataService.setCurrentUser(makeUser('admin', 'company-b'));

  const company = await dataService.getCompany();

  assert.equal(company.id, 'company-b');
  assert.equal(company.name, '');
  assert.equal(values.get(COMPANY_KEY), JSON.stringify({
    id: 'company-a',
    name: 'Company A',
    code: 'A',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z'
  }));
});

test('saving one company does not overwrite another company branding record in the same browser', async () => {
  values.clear();
  const firstCompany = {
    id: 'company-a',
    name: 'Company A',
    code: 'A',
    logo_url: 'data:image/png;base64,COMPANYA',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z'
  };
  values.set(COMPANY_KEY, JSON.stringify(firstCompany));
  dataService.setCurrentUser(makeUser('admin', 'company-b'));

  await dataService.updateCompanyName('Company B');

  const saved = JSON.parse(values.get(COMPANY_KEY) || 'null') as Record<string, typeof firstCompany>;
  assert.equal(saved['company-a'].name, 'Company A');
  assert.equal(saved['company-a'].logo_url, 'data:image/png;base64,COMPANYA');
  assert.equal(saved['company-b'].name, 'Company B');
});

test('the existing-cloud migration keeps logos private and company scoped', () => {
  assert.match(COMPANY_BRANDING_MIGRATION_SQL, /ADD COLUMN IF NOT EXISTS watermark_enabled/);
  assert.match(COMPANY_BRANDING_MIGRATION_SQL, /VALUES \('company-branding', 'company-branding', false\)/);
  assert.match(COMPANY_BRANDING_MIGRATION_SQL, /Company admins can upload their company branding/);
  assert.match(COMPANY_BRANDING_MIGRATION_SQL, /Company members can read their company branding/);
  assert.match(COMPANY_BRANDING_MIGRATION_SQL, /company_id::text/);
});
