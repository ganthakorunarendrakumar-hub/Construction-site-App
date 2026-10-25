import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isPotentialDuplicateStockEntry,
  PreviousStockEntryDuplicateData,
  StockEntryDuplicateIdentity
} from '../src/utils/stockDuplicate.ts';

const now = Date.parse('2026-10-24T12:00:00.000Z');

const currentEntry = (overrides: Partial<StockEntryDuplicateIdentity> = {}): StockEntryDuplicateIdentity => ({
  projectId: 'site-1',
  category: 'cement',
  itemId: 'brand-1',
  itemName: 'UltraTech Cement',
  quantity: 50,
  unit: 'bags',
  createdBy: 'user-2',
  ...overrides
});

const previousEntry = (overrides: Partial<PreviousStockEntryDuplicateData> = {}): PreviousStockEntryDuplicateData => ({
  projectId: 'site-1',
  category: 'cement',
  itemId: 'brand-1',
  itemName: 'UltraTech Cement',
  quantity: 50,
  unit: 'Bags',
  createdBy: 'user-1',
  createdAt: new Date(now - 60 * 60 * 1000).toISOString(),
  createdByName: 'Previous User',
  ...overrides
});

test('A: different user, same site, item, quantity and unit within 24 hours warns', () => {
  assert.equal(isPotentialDuplicateStockEntry(currentEntry(), previousEntry(), now), true);
});

test('B: a matching entry from the same user is not warned', () => {
  assert.equal(isPotentialDuplicateStockEntry(currentEntry(), previousEntry({ createdBy: 'user-2' }), now), false);
});

test('a missing creator identity cannot be treated as a different user', () => {
  assert.equal(isPotentialDuplicateStockEntry(currentEntry(), previousEntry({ createdBy: undefined }), now), false);
  assert.equal(isPotentialDuplicateStockEntry(currentEntry({ createdBy: undefined }), previousEntry(), now), false);
});

test('C: a different quantity is not a duplicate', () => {
  assert.equal(isPotentialDuplicateStockEntry(currentEntry(), previousEntry({ quantity: 49 }), now), false);
});

test('a different unit is not a duplicate', () => {
  assert.equal(isPotentialDuplicateStockEntry(currentEntry(), previousEntry({ unit: 'tonnes' }), now), false);
});

test('D: a different project/site is not a duplicate', () => {
  assert.equal(isPotentialDuplicateStockEntry(currentEntry(), previousEntry({ projectId: 'site-2' }), now), false);
});

test('a different material is not a duplicate', () => {
  assert.equal(isPotentialDuplicateStockEntry(currentEntry(), previousEntry({ itemId: 'brand-2', itemName: 'Different Cement' }), now), false);
  assert.equal(isPotentialDuplicateStockEntry(currentEntry(), previousEntry({ category: 'steel' }), now), false);
});

test('E: entries older than 24 hours are not duplicates', () => {
  const olderThanWindow = new Date(now - 24 * 60 * 60 * 1000 - 1).toISOString();
  assert.equal(isPotentialDuplicateStockEntry(currentEntry(), previousEntry({ createdAt: olderThanWindow }), now), false);
});

test('the exact 24-hour boundary is included and future or invalid timestamps are ignored', () => {
  const boundary = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const future = new Date(now + 1).toISOString();
  assert.equal(isPotentialDuplicateStockEntry(currentEntry(), previousEntry({ createdAt: boundary }), now), true);
  assert.equal(isPotentialDuplicateStockEntry(currentEntry(), previousEntry({ createdAt: future }), now), false);
  assert.equal(isPotentialDuplicateStockEntry(currentEntry(), previousEntry({ createdAt: 'invalid' }), now), false);
});

test('missing timestamps are ignored and local timezone offsets are parsed by instant', () => {
  assert.equal(isPotentialDuplicateStockEntry(currentEntry(), previousEntry({ createdAt: undefined }), now), false);
  assert.equal(isPotentialDuplicateStockEntry(currentEntry(), previousEntry({ createdAt: '2026-10-24T07:30:00-04:30' }), now), true);
});

test('stable item identifiers take precedence over matching display names', () => {
  assert.equal(isPotentialDuplicateStockEntry(currentEntry(), previousEntry({ itemId: 'brand-2' }), now), false);
});

test('when stable item identifiers are missing, category and material names are used', () => {
  assert.equal(isPotentialDuplicateStockEntry(
    currentEntry({ itemId: undefined }),
    previousEntry({ itemId: undefined }),
    now
  ), true);
  assert.equal(isPotentialDuplicateStockEntry(
    currentEntry({ itemId: undefined }),
    previousEntry({ itemId: undefined, itemName: 'Different Cement' }),
    now
  ), false);
});

test('brand and size qualifiers must also match when stable item IDs match', () => {
  assert.equal(isPotentialDuplicateStockEntry(
    currentEntry({ category: 'steel', itemId: 'steel-item', itemName: 'TMT', brandName: 'Brand A', diameterOrSize: '12mm' }),
    previousEntry({ category: 'steel', itemId: 'steel-item', itemName: 'TMT', brandName: 'Brand A', diameterOrSize: '16mm' }),
    now
  ), false);
});
