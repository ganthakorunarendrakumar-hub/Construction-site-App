export interface StockEntryDuplicateIdentity {
  projectId: string;
  category: string;
  itemId?: string;
  itemName: string;
  brandName?: string;
  diameterOrSize?: string;
  quantity: number;
  unit: string;
  createdBy?: string;
}

export interface PreviousStockEntryDuplicateData extends StockEntryDuplicateIdentity {
  createdAt?: string;
  createdByName?: string;
  isReversal?: boolean;
}

export interface DuplicateStockEntryDetails {
  itemName: string;
  quantity: number;
  unit: string;
  projectName: string;
  createdAt: string;
  createdByName?: string;
}

const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

export class StockEntryDuplicateCheckError extends Error {
  constructor() {
    super('The duplicate stock check could not be completed. No stock was saved. Refresh your session or check the cloud connection, then try again.');
    this.name = 'StockEntryDuplicateCheckError';
  }
}

/**
 * Load the newest shared view and merge local writes that may still be in the
 * existing cloud-sync debounce window. A configured cloud read failure must
 * not silently degrade to a browser-only duplicate check.
 */
export const loadDuplicateCheckCandidates = async <T extends { id: string }>(
  localRecords: T[],
  cloudCheckRequired: boolean,
  readSharedRecords: () => Promise<T[]>
): Promise<T[]> => {
  if (!cloudCheckRequired) return localRecords;

  try {
    const sharedRecords = await readSharedRecords();
    if (!Array.isArray(sharedRecords)) throw new Error('Invalid shared stock response');

    const byId = new Map<string, T>();
    for (const record of sharedRecords) {
      if (record?.id) byId.set(record.id, record);
    }
    for (const record of localRecords) {
      if (record?.id) byId.set(record.id, record);
    }
    return [...byId.values()];
  } catch {
    throw new StockEntryDuplicateCheckError();
  }
};

export class DuplicateStockEntryConfirmation<T extends { allowPossibleDuplicate?: boolean }> {
  private pendingEntry: T | null = null;
  private continuePromise: Promise<unknown> | null = null;

  public setPending(entry: T): void {
    this.pendingEntry = entry;
  }

  public cancel(): void {
    if (!this.continuePromise) this.pendingEntry = null;
  }

  public continue<TResult>(save: (entry: T) => Promise<TResult>): Promise<TResult | undefined> {
    if (this.continuePromise) return this.continuePromise as Promise<TResult>;
    if (!this.pendingEntry) return Promise.resolve(undefined);

    const confirmedEntry = { ...this.pendingEntry, allowPossibleDuplicate: true } as T;
    const operation = Promise.resolve().then(() => save(confirmedEntry));
    const completion = operation.finally(() => {
      if (this.continuePromise === completion) {
        this.continuePromise = null;
        this.pendingEntry = null;
      }
    });
    this.continuePromise = completion;
    return completion;
  }
}

const normalize = (value?: string) => value?.trim().toLocaleLowerCase() || '';

export const isPotentialDuplicateStockEntry = (
  current: StockEntryDuplicateIdentity,
  previous: PreviousStockEntryDuplicateData,
  now = Date.now()
): boolean => {
  if (!current.createdBy || !previous.createdBy || current.createdBy === previous.createdBy) return false;
  if (!current.projectId || current.projectId !== previous.projectId) return false;
  if (current.category !== previous.category) return false;
  if (normalize(current.unit) !== normalize(previous.unit)) return false;

  const currentQuantity = Number(current.quantity);
  const previousQuantity = Number(previous.quantity);
  if (!Number.isFinite(currentQuantity) || !Number.isFinite(previousQuantity) || currentQuantity !== previousQuantity) return false;

  const createdAt = Date.parse(previous.createdAt ?? '');
  const age = now - createdAt;
  if (!Number.isFinite(createdAt) || age < 0 || age > DUPLICATE_WINDOW_MS) return false;
  if (previous.isReversal) return false;

  const hasBothItemIds = Boolean(current.itemId && previous.itemId);
  const sameItem = hasBothItemIds
    ? current.itemId === previous.itemId
    : normalize(current.itemName) === normalize(previous.itemName);
  const sameBrand = hasBothItemIds
    ? !current.brandName || !previous.brandName || normalize(current.brandName) === normalize(previous.brandName)
    : normalize(current.brandName) === normalize(previous.brandName);
  const sameSize = hasBothItemIds
    ? !current.diameterOrSize || !previous.diameterOrSize || normalize(current.diameterOrSize) === normalize(previous.diameterOrSize)
    : normalize(current.diameterOrSize) === normalize(previous.diameterOrSize);

  return sameItem && sameBrand && sameSize;
};
