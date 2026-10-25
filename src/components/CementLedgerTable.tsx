import React, { useState, useMemo } from 'react';
import {
  Search,
  Calendar,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  X
} from 'lucide-react';
import {
  MaterialTransaction,
  CementBrand,
  TransactionType,
  UserProfile
} from '../types';
import { AttachmentLinks } from './AttachmentSections';

interface CementLedgerTableProps {
  transactions: MaterialTransaction[];
  brands: CementBrand[];
  currentUser: UserProfile;
  onReverseTransaction: (txId: string, reason: string) => Promise<void>;
}

export const CementLedgerTable: React.FC<CementLedgerTableProps> = ({
  transactions,
  brands,
  currentUser,
  onReverseTransaction
}) => {
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Transaction Detail Modal
  const [selectedTx, setSelectedTx] = useState<MaterialTransaction | null>(null);

  // Admin Reversal Modal
  const [reversalTarget, setReversalTarget] = useState<MaterialTransaction | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isReversing, setIsReversing] = useState(false);
  const [reversalError, setReversalError] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'admin';

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    if (brandFilter !== 'all') {
      result = result.filter(t => t.brand_id === brandFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter(t => t.transaction_type === typeFilter);
    }

    if (startDate) {
      result = result.filter(t => t.transaction_date >= startDate);
    }

    if (endDate) {
      result = result.filter(t => t.transaction_date <= endDate);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        t =>
          t.brand_name.toLowerCase().includes(q) ||
          t.location_name.toLowerCase().includes(q) ||
          t.supplier_name?.toLowerCase().includes(q) ||
          t.invoice_number?.toLowerCase().includes(q) ||
          t.challan_number?.toLowerCase().includes(q) ||
          t.created_by_name.toLowerCase().includes(q) ||
          t.remarks?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [transactions, brandFilter, typeFilter, startDate, endDate, search]);

  const handleReversalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTarget) return;

    if (!reversalReason.trim()) {
      setReversalError('Mandatory: Provide an audited correction reason for reversing this stock movement.');
      return;
    }

    try {
      setIsReversing(true);
      setReversalError(null);
      await onReverseTransaction(reversalTarget.id, reversalReason.trim());
      setReversalTarget(null);
      setReversalReason('');
      setSelectedTx(null);
    } catch (err: any) {
      setReversalError(err.message || 'Failed to reverse transaction');
    } finally {
      setIsReversing(false);
    }
  };

  const getTypeBadge = (type: TransactionType) => {
    switch (type) {
      case 'receipt':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-bp-cyan/20 text-bp-text border border-bp-cyan/40">
            + Receipt
          </span>
        );
      case 'usage':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-bp-background text-bp-text border border-bp-border">
            - Usage
          </span>
        );
      case 'damage':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-bp-background text-bp-muted border border-bp-border">
            - Damaged
          </span>
        );
      case 'opening_stock':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-bp-cyan/10 text-bp-text border border-bp-cyan/30">
            Opening
          </span>
        );
      case 'return':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-bp-background text-bp-muted border border-bp-border">
            Return
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Table Filters Strip */}
      <div className="bg-white rounded-2xl border border-bp-border p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-bp-muted absolute left-3.5 top-3" />
            <input
              type="text"
              aria-label="Search cement ledger"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-bp-border bg-bp-background text-bp-text focus:bg-white focus:outline-none focus:border-bp-cyan focus:ring-1 focus:ring-bp-cyan"
            />
          </div>

          {/* Brand & Type Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-bp-border bg-white text-bp-text focus:outline-none focus:border-bp-cyan"
            >
              <option value="all">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.brand_name}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-bp-border bg-white text-bp-text focus:outline-none focus:border-bp-cyan"
            >
              <option value="all">All Movements</option>
              <option value="receipt">Receipts (IN)</option>
              <option value="usage">Site Usage (OUT)</option>
              <option value="damage">Damaged Bags</option>
              <option value="opening_stock">Opening Stock</option>
              <option value="return">Supplier Returns</option>
            </select>

            {/* Date Pickers */}
            <div className="flex items-center gap-1.5 text-xs text-bp-muted">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-xl border border-bp-border bg-white text-bp-text"
                title="Start date"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-xl border border-bp-border bg-white text-bp-text"
                title="End date"
              />
              {(startDate || endDate || brandFilter !== 'all' || typeFilter !== 'all' || search) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setBrandFilter('all');
                    setTypeFilter('all');
                    setSearch('');
                  }}
                  className="text-xs text-bp-text hover:underline px-1 font-semibold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-bp-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bp-background border-b border-bp-border text-[11px] font-semibold text-bp-muted uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Received</th>
                <th className="py-3 px-4 text-right">Used</th>
                <th className="py-3 px-4 text-right">Damaged</th>
                <th className="py-3 px-4 text-right bg-bp-cyan/10">Running Stock</th>
                <th className="py-3 px-4">Storage Location</th>
                <th className="py-3 px-4">Invoice / Challan</th>
                <th className="py-3 px-4">Recorded By</th>
                <th className="py-3 px-4 text-center">Document</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-bp-muted">
                    <p className="font-semibold text-bp-text">No material transactions found.</p>
                    <p className="text-[11px] text-bp-muted mt-1">Use "Record Transaction" to add receipts or site usage.</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className={`hover:bg-bp-background transition-colors ${
                      tx.is_reversal ? 'bg-bp-background opacity-60 line-through' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono whitespace-nowrap text-bp-text">
                      <div>{tx.transaction_date}</div>
                      <div className="text-[10px] text-bp-muted">
                        {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-semibold text-bp-text whitespace-nowrap">
                      {tx.brand_name}
                      {tx.is_reversal && (
                        <span className="block text-[10px] text-bp-text font-bold not-line-through">
                          [REVERSED]
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {getTypeBadge(tx.transaction_type)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-bp-text">
                      {tx.received_qty > 0 ? `+${tx.received_qty}` : '—'}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-bp-text">
                      {tx.used_qty > 0 ? `-${tx.used_qty}` : '—'}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-bp-text">
                      {tx.damaged_qty > 0 ? `-${tx.damaged_qty}` : '—'}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-bp-text bg-bp-cyan/10">
                      {tx.running_balance !== undefined ? `${tx.running_balance} bags` : '—'}
                    </td>

                    <td className="py-3 px-4 text-bp-muted whitespace-nowrap">
                      {tx.location_name}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {tx.invoice_number ? (
                        <span className="font-mono text-[11px] font-semibold text-bp-text">
                          {tx.invoice_number}
                        </span>
                      ) : tx.challan_number ? (
                        <span className="font-mono text-[11px] text-bp-muted">
                          {tx.challan_number}
                        </span>
                      ) : (
                        <span className="text-bp-muted">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-bp-text">{tx.created_by_name}</div>
                      <div className="text-[10px] text-bp-muted capitalize">{tx.created_by_role.replace('_', ' ')}</div>
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <AttachmentLinks attachments={tx.attachments} legacyUrl={tx.attachment_url} legacyName={tx.attachment_name} />
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedTx(tx)}
                        className="text-xs font-semibold text-bp-text hover:underline mr-2"
                      >
                        Inspect
                      </button>

                      {isAdmin && !tx.is_reversal && (
                        <button
                          onClick={() => {
                            setReversalTarget(tx);
                            setReversalReason('');
                            setReversalError(null);
                          }}
                          className="text-[11px] font-medium text-bp-muted hover:text-bp-text hover:underline"
                          title="Admin audited correction: Reverse transaction"
                        >
                          Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Ledger Summary Footer */}
        <div className="bg-bp-background px-5 py-3 border-t border-bp-border flex flex-col sm:flex-row items-center justify-between text-xs text-bp-muted gap-2">
          <span>Showing {filteredTransactions.length} of {transactions.length} records</span>
          <span className="font-mono text-[11px] text-bp-muted">
            Immutable Stock Ledger Active
          </span>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-bp-navy/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-bp-border animate-in fade-in zoom-in-95">
            <div className="bg-bp-navy text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Transaction Details</h3>
                <p className="text-xs text-bp-border-strong font-mono">ID: {selectedTx.id}</p>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-bp-border-strong hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-bp-border">
                <div>
                  <span className="text-bp-muted uppercase text-[10px] font-bold">Brand</span>
                  <p className="font-bold text-sm text-bp-text">{selectedTx.brand_name}</p>
                </div>
                <div>
                  <span className="text-bp-muted uppercase text-[10px] font-bold">Type</span>
                  <div className="mt-0.5">{getTypeBadge(selectedTx.transaction_type)}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pb-3 border-b border-bp-border">
                <div>
                  <span className="text-bp-muted uppercase text-[10px] font-bold">Quantity</span>
                  <p className="font-bold text-base text-bp-text font-mono">{selectedTx.quantity_bags} Bags</p>
                </div>
                <div>
                  <span className="text-bp-muted uppercase text-[10px] font-bold">Date</span>
                  <p className="font-semibold text-bp-text font-mono">{selectedTx.transaction_date}</p>
                </div>
                <div>
                  <span className="text-bp-muted uppercase text-[10px] font-bold">Stock After</span>
                  <p className="font-bold text-bp-text font-mono">{selectedTx.running_balance ?? '—'} Bags</p>
                </div>
              </div>

              <div className="space-y-1.5 pb-3 border-b border-bp-border">
                <div>
                  <span className="text-bp-muted uppercase text-[10px] font-bold">Location:</span>
                  <span className="ml-2 font-medium text-bp-text">{selectedTx.location_name}</span>
                </div>
                <div>
                  <span className="text-bp-muted uppercase text-[10px] font-bold">Supplier:</span>
                  <span className="ml-2 font-medium text-bp-text">{selectedTx.supplier_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-bp-muted uppercase text-[10px] font-bold">Invoice #:</span>
                  <span className="ml-2 font-mono font-medium text-bp-text">{selectedTx.invoice_number || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-bp-muted uppercase text-[10px] font-bold">Challan #:</span>
                  <span className="ml-2 font-mono font-medium text-bp-text">{selectedTx.challan_number || 'N/A'}</span>
                </div>
              </div>

              {selectedTx.remarks && (
                <div className="bg-bp-background p-3 rounded-xl border border-bp-border">
                  <span className="text-bp-muted font-bold uppercase text-[10px] block mb-1">Remarks:</span>
                  <p className="text-bp-text italic">{selectedTx.remarks}</p>
                </div>
              )}

              {(selectedTx.attachment_url || selectedTx.attachments) && (
                <div className="p-3 bg-bp-background border border-bp-border rounded-xl flex items-center justify-between">
                  <AttachmentLinks attachments={selectedTx.attachments} legacyUrl={selectedTx.attachment_url} legacyName={selectedTx.attachment_name} />
                </div>
              )}

              <div className="bg-bp-background p-3 rounded-xl text-[11px] text-bp-muted space-y-1 border border-bp-border">
                <div className="font-semibold text-bp-text">Audit Trail</div>
                <div>Created by: {selectedTx.created_by_name} ({selectedTx.created_by_role})</div>
                <div className="font-mono">Timestamp: {new Date(selectedTx.created_at).toLocaleString()}</div>
              </div>
            </div>

            <div className="bg-bp-background px-6 py-3 border-t border-bp-border flex justify-end">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 bg-bp-navy text-white font-semibold text-xs rounded-xl hover:bg-bp-navy-deep transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Reversal Confirmation Dialog */}
      {reversalTarget && (
        <div className="fixed inset-0 z-50 bg-bp-navy/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-bp-border animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-bp-text">
              <RotateCcw className="w-5 h-5 text-bp-text" />
              <h3 className="text-base font-bold text-bp-text">Audited Ledger Reversal</h3>
            </div>
            
            <p className="text-xs text-bp-muted leading-relaxed">
              Approved transactions cannot be deleted. An offsetting reversal entry will be recorded to adjust the running inventory balance.
            </p>

            <div className="p-3 bg-bp-background border border-bp-border rounded-xl text-xs">
              <span className="font-semibold text-bp-text">Target: </span>
              {reversalTarget.quantity_bags} bags of {reversalTarget.brand_name} on {reversalTarget.transaction_date}.
            </div>

            {reversalError && (
              <div className="p-2.5 bg-bp-background border border-bp-border rounded-xl text-bp-text text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-bp-text shrink-0" />
                <span>{reversalError}</span>
              </div>
            )}

            <form onSubmit={handleReversalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-bp-text uppercase tracking-wider mb-1">
                  Correction Reason (Mandatory) <span className="text-bp-cyan">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-bp-border focus:outline-none focus:border-bp-cyan focus:ring-1 focus:ring-bp-cyan"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReversalTarget(null)}
                  className="px-4 py-2 text-xs font-medium text-bp-muted hover:bg-bp-background rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReversing}
                  className="px-4 py-2 bg-bp-cyan hover:bg-bp-blue text-bp-text text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  {isReversing ? 'Reversing...' : 'Commit Reversal Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
