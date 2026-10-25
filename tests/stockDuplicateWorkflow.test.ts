import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DuplicateStockEntryConfirmation,
  loadDuplicateCheckCandidates,
  StockEntryDuplicateCheckError
} from '../src/utils/stockDuplicate.ts';

type TestEntry = { id: string; quantity: number };

test('local mode reads local candidates without invoking a cloud reader', async () => {
  const local = [{ id: 'local-1', quantity: 5 }];
  let cloudReads = 0;

  const candidates = await loadDuplicateCheckCandidates(local, false, async () => {
    cloudReads += 1;
    return [];
  });

  assert.deepEqual(candidates, local);
  assert.equal(cloudReads, 0);
});

test('cloud candidates are merged with local pending writes, preferring the local record by ID', async () => {
  const local: TestEntry[] = [
    { id: 'same-id', quantity: 8 },
    { id: 'local-only', quantity: 3 }
  ];
  const shared: TestEntry[] = [
    { id: 'same-id', quantity: 7 },
    { id: 'cloud-only', quantity: 4 }
  ];

  const candidates = await loadDuplicateCheckCandidates(local, true, async () => shared);
  assert.deepEqual(candidates, [local[0], shared[1], local[1]]);
});

test('a cloud duplicate-check failure rejects instead of falling back to local candidates', async () => {
  let saveCalls = 0;

  await assert.rejects(async () => {
    const candidates = await loadDuplicateCheckCandidates(
      [{ id: 'local-match', quantity: 500 }],
      true,
      async () => { throw new Error('cloud query unavailable'); }
    );
    saveCalls += 1;
    return candidates;
  }, StockEntryDuplicateCheckError);

  assert.equal(saveCalls, 0);
});

test('Cancel Entry clears the pending transaction without saving', async () => {
  const confirmation = new DuplicateStockEntryConfirmation<{ id: string; allowPossibleDuplicate?: boolean }>();
  let saves = 0;
  confirmation.setPending({ id: 'pending-entry' });
  confirmation.cancel();

  const result = await confirmation.continue(async () => {
    saves += 1;
    return 'saved';
  });

  assert.equal(result, undefined);
  assert.equal(saves, 0);
});

test('Continue Anyway applies explicit confirmation and saves exactly once', async () => {
  const confirmation = new DuplicateStockEntryConfirmation<{ id: string; allowPossibleDuplicate?: boolean }>();
  confirmation.setPending({ id: 'pending-entry' });

  let saves = 0;
  let releaseSave: ((value: string) => void) | undefined;
  const save = async (entry: { id: string; allowPossibleDuplicate?: boolean }) => {
    saves += 1;
    assert.equal(entry.allowPossibleDuplicate, true);
    return new Promise<string>(resolve => { releaseSave = resolve; });
  };

  const first = confirmation.continue(save);
  const second = confirmation.continue(save);
  assert.strictEqual(second, first);
  await Promise.resolve();
  assert.equal(saves, 1);
  releaseSave?.('saved');
  assert.equal(await first, 'saved');
  assert.equal(await confirmation.continue(save), undefined);
  assert.equal(saves, 1);
});

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('all stock-entry modules route submit through shared duplicate handling before ledger persistence', () => {
  const genericModules = [
    'AggregateModule.tsx',
    'BricksModule.tsx',
    'GenericEquipmentModule.tsx',
    'SandModule.tsx',
    'SteelModule.tsx'
  ];

  for (const module of genericModules) {
    const source = readSource(`../src/components/${module}`);
    assert.match(source, /await dataService\.recordGenericTransaction\(transactionInput\)/, `${module} must submit to the shared service`);
    assert.match(source, /err instanceof PossibleDuplicateStockEntryError/, `${module} must render possible duplicates`);
    assert.match(source, /setDuplicateEntry\(err\.duplicate\)/, `${module} must pass matched details to the dialog`);
    assert.match(source, /setFormError\(err\.message/, `${module} must show check failures visibly`);
    assert.match(source, /<DuplicateStockEntryDialog/, `${module} must render the warning dialog`);
    assert.match(source, /duplicateConfirmation\.current\.continue\(/, `${module} must save through the one-shot confirmation guard`);
    assert.match(source, /duplicateConfirmation\.current\.cancel\(\)/, `${module} must discard a canceled pending transaction`);
  }

  const cementForm = readSource('../src/components/CementTransactionModal.tsx');
  const app = readSource('../src/App.tsx');
  assert.match(cementForm, /await onSaveTransaction\(transactionInput\)/);
  assert.match(cementForm, /err instanceof PossibleDuplicateStockEntryError/);
  assert.match(cementForm, /<DuplicateStockEntryDialog/);
  assert.match(cementForm, /duplicateConfirmation\.current\.continue\(/);
  assert.match(cementForm, /duplicateConfirmation\.current\.cancel\(\)/);
  assert.match(app, /dataService\.recordCementTransaction\(txData\)/);

  const dataService = readSource('../src/services/dataService.ts');
  const genericCheck = dataService.indexOf('const duplicateRecord = all');
  const genericPersist = dataService.indexOf('localStorage.setItem(STORAGE_KEYS.GENERIC_TRANSACTIONS', genericCheck);
  const cementCheck = dataService.indexOf('const duplicate = await this.findRecentCementDuplicate');
  const cementPersist = dataService.indexOf('localStorage.setItem(STORAGE_KEYS.TRANSACTIONS', cementCheck);
  assert.ok(genericCheck >= 0 && genericPersist > genericCheck, 'generic duplicate check must precede local persistence');
  assert.ok(cementCheck >= 0 && cementPersist > cementCheck, 'cement duplicate check must precede local persistence');
});

test('cloud duplicate-check failures provide a visible no-save message', () => {
  assert.match(new StockEntryDuplicateCheckError().message, /No stock was saved/i);
});
