import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  DuplicateStockEntryConfirmation,
  isPotentialDuplicateStockEntry,
  loadDuplicateCheckCandidates,
  PreviousStockEntryDuplicateData,
  StockEntryDuplicateIdentity,
  StockEntryDuplicateCheckError
} from '../src/utils/stockDuplicate.ts';
import { DuplicateStockEntryDialog } from '../src/components/DuplicateStockEntryDialog.tsx';

type TestEntry = { id: string; quantity: number };
const checkTime = Date.parse('2026-10-25T12:00:00.000Z');
const currentStock: StockEntryDuplicateIdentity = {
  projectId: 'project-a',
  category: 'cement',
  itemId: 'brand-1',
  itemName: 'Dalmia Cement',
  quantity: 500,
  unit: 'bags',
  transactionType: 'receipt',
  createdBy: 'staff-1'
};
const sharedStockRecord = (overrides: Partial<PreviousStockEntryDuplicateData> = {}): PreviousStockEntryDuplicateData => ({
  projectId: 'project-a',
  category: 'cement',
  itemId: 'brand-1',
  itemName: 'Dalmia Cement',
  quantity: 500,
  unit: 'bags',
  transactionType: 'receipt',
  createdBy: 'staff-1',
  createdAt: new Date(checkTime - 60 * 60 * 1000).toISOString(),
  createdByName: 'Test Staff',
  ...overrides
});

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

test('a matching record loaded from local storage is detected for the same staff member', async () => {
  const local = [{ id: 'local-stock-1', ...sharedStockRecord() }];
  const candidates = await loadDuplicateCheckCandidates(local, false, async () => []);
  assert.equal(candidates.length, 1);
  assert.equal(isPotentialDuplicateStockEntry(currentStock, candidates[0], checkTime), true);
});

test('a matching record loaded from the shared cloud source is detected', async () => {
  const shared = [{ id: 'cloud-stock-1', ...sharedStockRecord({ createdBy: 'staff-2' }) }];
  const candidates = await loadDuplicateCheckCandidates([], true, async () => shared);
  assert.equal(candidates.length, 1);
  assert.equal(isPotentialDuplicateStockEntry(currentStock, candidates[0], checkTime), true);
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

test('the warning dialog visibly shows matched entry details and requires an explicit action', () => {
  const html = renderToStaticMarkup(createElement(DuplicateStockEntryDialog, {
    duplicate: {
      itemName: 'Dalmia Cement',
      quantity: 500,
      unit: 'bags',
      projectName: 'Site A',
      createdAt: new Date(checkTime - 60 * 60 * 1000).toISOString(),
      createdByName: 'Test Staff'
    },
    onCancel: () => undefined,
    onContinue: () => undefined
  }));

  assert.match(html, /role="alertdialog"/);
  assert.match(html, /data-bp-explicit-dismiss-only="true"/);
  assert.match(html, /Possible Duplicate Stock Entry/);
  assert.match(html, /Dalmia Cement/);
  assert.match(html, /500 bags/);
  assert.match(html, /Site A/);
  assert.match(html, /Test Staff/);
  assert.match(html, /Cancel Entry/);
  assert.match(html, /Continue Anyway/);
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
    const duplicateCheck = source.indexOf('await dataService.checkGenericTransactionDuplicate(transactionInput)');
    const imageConfirmation = source.indexOf('window.confirm(', duplicateCheck);
    const stockSave = source.indexOf('await dataService.recordGenericTransaction(transactionInput)', imageConfirmation);
    assert.ok(duplicateCheck >= 0 && imageConfirmation > duplicateCheck && stockSave > imageConfirmation,
      `${module} must check for duplicates before the attachment prompt and save`);
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
  const cementDuplicateCheck = cementForm.indexOf('await dataService.checkCementTransactionDuplicate(transactionInput)');
  const cementImageConfirmation = cementForm.indexOf('window.confirm(', cementDuplicateCheck);
  const cementSave = cementForm.indexOf('await onSaveTransaction(transactionInput)', cementImageConfirmation);
  assert.ok(cementDuplicateCheck >= 0 && cementImageConfirmation > cementDuplicateCheck && cementSave > cementImageConfirmation,
    'Cement must check for duplicates before the attachment prompt and save');
  assert.match(cementForm, /await onSaveTransaction\(transactionInput\)/);
  assert.match(cementForm, /err instanceof PossibleDuplicateStockEntryError/);
  assert.match(cementForm, /<DuplicateStockEntryDialog/);
  assert.match(cementForm, /duplicateConfirmation\.current\.continue\(/);
  assert.match(cementForm, /duplicateConfirmation\.current\.cancel\(\)/);
  assert.match(app, /dataService\.recordCementTransaction\(txData\)/);

  const dataService = readSource('../src/services/dataService.ts');
  assert.match(dataService, /\.eq\('transaction_type', txInput\.transactionType\)/,
    'Cement cloud reads must scope candidates to the same transaction type');
  assert.match(dataService, /transactionType: record\.transaction_type/,
    'both local and cloud records must map their transaction type into the shared matcher');
  const genericRecord = dataService.indexOf('public async recordGenericTransaction');
  const genericCheck = dataService.indexOf('const duplicate = await this.findRecentGenericDuplicate', genericRecord);
  const genericPersist = dataService.indexOf('localStorage.setItem(STORAGE_KEYS.GENERIC_TRANSACTIONS', genericCheck);
  const cementCheck = dataService.indexOf('const duplicate = await this.checkCementTransactionDuplicate');
  const cementPersist = dataService.indexOf('localStorage.setItem(STORAGE_KEYS.TRANSACTIONS', cementCheck);
  assert.ok(genericCheck >= 0 && genericPersist > genericCheck, 'generic duplicate check must precede local persistence');
  assert.ok(cementCheck >= 0 && cementPersist > cementCheck, 'cement duplicate check must precede local persistence');

  const dismissalManager = readSource('../src/components/ModalDismissalManager.tsx');
  assert.match(dismissalManager, /overlay\.hasAttribute\('data-bp-explicit-dismiss-only'\)/,
    'outside click and Escape must not dismiss the duplicate warning');
});

test('cloud duplicate-check failures provide a visible no-save message', () => {
  assert.match(new StockEntryDuplicateCheckError().message, /No stock was saved/i);
});
