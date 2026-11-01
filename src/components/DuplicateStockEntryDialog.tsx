import React from 'react';
import { AlertTriangle, CalendarClock, MapPin, Package } from 'lucide-react';
import { DuplicateStockEntryDetails } from '../utils/stockDuplicate';

interface DuplicateStockEntryDialogProps {
  duplicate: DuplicateStockEntryDetails;
  isContinuing?: boolean;
  onCancel: () => void;
  onContinue: () => void;
}

export const DuplicateStockEntryDialog: React.FC<DuplicateStockEntryDialogProps> = ({
  duplicate,
  isContinuing = false,
  onCancel,
  onContinue
}) => {
  const createdAt = new Date(duplicate.createdAt);
  const formattedCreatedAt = Number.isNaN(createdAt.getTime())
    ? 'Date unavailable'
    : createdAt.toLocaleString();

  return (
    <div data-bp-explicit-dismiss-only="true" className="fixed inset-0 z-[90] flex items-center justify-center bg-bp-navy-deep/70 p-4" role="alertdialog" aria-modal="true" aria-labelledby="duplicate-stock-title" aria-describedby="duplicate-stock-description">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-bp-border bg-white shadow-2xl">
        <div className="flex items-start gap-3 border-b border-bp-border bg-amber-50/70 px-5 py-4 sm:px-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="duplicate-stock-title" className="text-base font-bold text-bp-text">Possible Duplicate Stock Entry</h2>
            <p id="duplicate-stock-description" className="mt-1 text-sm leading-5 text-bp-muted">
              A matching stock entry is already recorded at this site within the last 24 hours.
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-3 px-5 py-5 text-sm sm:grid-cols-2 sm:px-6">
          <div className="min-w-0">
            <dt className="text-xs font-medium text-bp-muted">Material</dt>
            <dd className="mt-1 flex items-start gap-2 font-semibold text-bp-text">
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-bp-blue" />
              <span className="break-words">{duplicate.itemName}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-bp-muted">Quantity</dt>
            <dd className="mt-1 font-semibold tabular-nums text-bp-text">
              {duplicate.quantity.toLocaleString()} {duplicate.unit}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-medium text-bp-muted">Project / Site</dt>
            <dd className="mt-1 flex items-start gap-2 font-semibold text-bp-text">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-bp-blue" />
              <span className="break-words">{duplicate.projectName}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-bp-muted">Previous entry</dt>
            <dd className="mt-1 flex items-start gap-2 font-medium text-bp-text">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-bp-blue" />
              <span>{formattedCreatedAt}</span>
            </dd>
          </div>
          {duplicate.createdByName && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-bp-muted">Recorded by</dt>
              <dd className="mt-1 font-medium text-bp-text">{duplicate.createdByName}</dd>
            </div>
          )}
        </dl>

        <div className="flex flex-col-reverse gap-2 border-t border-bp-border bg-bp-background px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button type="button" onClick={onCancel} disabled={isContinuing} className="min-h-11 rounded-xl border border-bp-border bg-white px-4 text-sm font-semibold text-bp-text hover:bg-bp-background disabled:opacity-50">
            Cancel Entry
          </button>
          <button type="button" onClick={onContinue} disabled={isContinuing} className="min-h-11 rounded-xl bg-bp-navy px-4 text-sm font-semibold text-white hover:bg-bp-navy-light disabled:opacity-50">
            {isContinuing ? 'Saving...' : 'Continue Anyway'}
          </button>
        </div>
      </div>
    </div>
  );
};
