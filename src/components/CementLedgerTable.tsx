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
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFC400]/20 text-[#111111] border border-[#FFC400]/40">
            + Receipt
          </span>
        );
      case 'usage':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F7F7F7] text-[#111111] border border-[#E8E8E8]">
            - Usage
          </span>
        );
      case 'damage':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F7F7F7] text-[#666666] border border-[#E8E8E8]">
            - Damaged
          </span>
        );
      case 'opening_stock':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFC400]/10 text-[#111111] border border-[#FFC400]/30">
            Opening
          </span>
        );
      case 'return':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F7F7F7] text-[#666666] border border-[#E8E8E8]">
            Return
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Table Filters Strip */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#666666] absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by brand, invoice #, challan, supplier, or supervisor..."
              className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400]"
            />
          </div>

          {/* Brand & Type Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-[#E8E8E8] bg-white text-[#111111] focus:outline-none focus:border-[#FFC400]"
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
              className="text-xs py-2 px-3 rounded-xl border border-[#E8E8E8] bg-white text-[#111111] focus:outline-none focus:border-[#FFC400]"
            >
              <option value="all">All Movements</option>
              <option value="receipt">Receipts (IN)</option>
              <option value="usage">Site Usage (OUT)</option>
              <option value="damage">Damaged Bags</option>
              <option value="opening_stock">Opening Stock</option>
              <option value="return">Supplier Returns</option>
            </select>

            {/* Date Pickers */}
            <div className="flex items-center gap-1.5 text-xs text-[#666666]">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-xl border border-[#E8E8E8] bg-white text-[#111111]"
                title="Start date"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-xl border border-[#E8E8E8] bg-white text-[#111111]"
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
                  className="text-xs text-[#111111] hover:underline px-1 font-semibold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F7F7F7] border-b border-[#E8E8E8] text-[11px] font-semibold text-[#666666] uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Received</th>
                <th className="py-3 px-4 text-right">Used</th>
                <th className="py-3 px-4 text-right">Damaged</th>
                <th className="py-3 px-4 text-right bg-[#FFC400]/10">Running Stock</th>
                <th className="py-3 px-4">Storage Location</th>
                <th className="py-3 px-4">Invoice / Challan</th>
                <th className="py-3 px-4">Recorded By</th>
                <th className="py-3 px-4 text-center">Document</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8E8] text-xs">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-[#666666]">
                    <p className="font-semibold text-[#111111]">No material transactions found.</p>
                    <p className="text-[11px] text-[#888888] mt-1">Use "Record Transaction" to add receipts or site usage.</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className={`hover:bg-[#F7F7F7] transition-colors ${
                      tx.is_reversal ? 'bg-[#F7F7F7] opacity-60 line-through' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono whitespace-nowrap text-[#111111]">
                      <div>{tx.transaction_date}</div>
                      <div className="text-[10px] text-[#888888]">
                        {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-semibold text-[#111111] whitespace-nowrap">
                      {tx.brand_name}
                      {tx.is_reversal && (
                        <span className="block text-[10px] text-[#111111] font-bold not-line-through">
                          [REVERSED]
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {getTypeBadge(tx.transaction_type)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-[#111111]">
                      {tx.received_qty > 0 ? `+${tx.received_qty}` : '—'}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-[#111111]">
                      {tx.used_qty > 0 ? `-${tx.used_qty}` : '—'}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-[#111111]">
                      {tx.damaged_qty > 0 ? `-${tx.damaged_qty}` : '—'}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-[#111111] bg-[#FFC400]/10">
                      {tx.running_balance !== undefined ? `${tx.running_balance} bags` : '—'}
                    </td>

                    <td className="py-3 px-4 text-[#666666] whitespace-nowrap">
                      {tx.location_name}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {tx.invoice_number ? (
                        <span className="font-mono text-[11px] font-semibold text-[#111111]">
                          {tx.invoice_number}
                        </span>
                      ) : tx.challan_number ? (
                        <span className="font-mono text-[11px] text-[#666666]">
                          {tx.challan_number}
                        </span>
                      ) : (
                        <span className="text-[#888888]">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-[#111111]">{tx.created_by_name}</div>
                      <div className="text-[10px] text-[#888888] capitalize">{tx.created_by_role.replace('_', ' ')}</div>
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <AttachmentLinks attachments={tx.attachments} legacyUrl={tx.attachment_url} legacyName={tx.attachment_name} />
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedTx(tx)}
                        className="text-xs font-semibold text-[#111111] hover:underline mr-2"
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
                          className="text-[11px] font-medium text-[#666666] hover:text-[#111111] hover:underline"
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
        <div className="bg-[#F7F7F7] px-5 py-3 border-t border-[#E8E8E8] flex flex-col sm:flex-row items-center justify-between text-xs text-[#666666] gap-2">
          <span>Showing {filteredTransactions.length} of {transactions.length} records</span>
          <span className="font-mono text-[11px] text-[#666666]">
            Immutable Stock Ledger Active
          </span>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-[#111111]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#E8E8E8] animate-in fade-in zoom-in-95">
            <div className="bg-[#111111] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Transaction Details</h3>
                <p className="text-xs text-[#AAAAAA] font-mono">ID: {selectedTx.id}</p>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-[#AAAAAA] hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[#E8E8E8]">
                <div>
                  <span className="text-[#666666] uppercase text-[10px] font-bold">Brand</span>
                  <p className="font-bold text-sm text-[#111111]">{selectedTx.brand_name}</p>
                </div>
                <div>
                  <span className="text-[#666666] uppercase text-[10px] font-bold">Type</span>
                  <div className="mt-0.5">{getTypeBadge(selectedTx.transaction_type)}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pb-3 border-b border-[#E8E8E8]">
                <div>
                  <span className="text-[#666666] uppercase text-[10px] font-bold">Quantity</span>
                  <p className="font-bold text-base text-[#111111] font-mono">{selectedTx.quantity_bags} Bags</p>
                </div>
                <div>
                  <span className="text-[#666666] uppercase text-[10px] font-bold">Date</span>
                  <p className="font-semibold text-[#111111] font-mono">{selectedTx.transaction_date}</p>
                </div>
                <div>
                  <span className="text-[#666666] uppercase text-[10px] font-bold">Stock After</span>
                  <p className="font-bold text-[#111111] font-mono">{selectedTx.running_balance ?? '—'} Bags</p>
                </div>
              </div>

              <div className="space-y-1.5 pb-3 border-b border-[#E8E8E8]">
                <div>
                  <span className="text-[#666666] uppercase text-[10px] font-bold">Location:</span>
                  <span className="ml-2 font-medium text-[#111111]">{selectedTx.location_name}</span>
                </div>
                <div>
                  <span className="text-[#666666] uppercase text-[10px] font-bold">Supplier:</span>
                  <span className="ml-2 font-medium text-[#111111]">{selectedTx.supplier_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[#666666] uppercase text-[10px] font-bold">Invoice #:</span>
                  <span className="ml-2 font-mono font-medium text-[#111111]">{selectedTx.invoice_number || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[#666666] uppercase text-[10px] font-bold">Challan #:</span>
                  <span className="ml-2 font-mono font-medium text-[#111111]">{selectedTx.challan_number || 'N/A'}</span>
                </div>
              </div>

              {selectedTx.remarks && (
                <div className="bg-[#F7F7F7] p-3 rounded-xl border border-[#E8E8E8]">
                  <span className="text-[#666666] font-bold uppercase text-[10px] block mb-1">Remarks:</span>
                  <p className="text-[#111111] italic">{selectedTx.remarks}</p>
                </div>
              )}

              {(selectedTx.attachment_url || selectedTx.attachments) && (
                <div className="p-3 bg-[#F7F7F7] border border-[#E8E8E8] rounded-xl flex items-center justify-between">
                  <AttachmentLinks attachments={selectedTx.attachments} legacyUrl={selectedTx.attachment_url} legacyName={selectedTx.attachment_name} />
                </div>
              )}

              <div className="bg-[#F7F7F7] p-3 rounded-xl text-[11px] text-[#666666] space-y-1 border border-[#E8E8E8]">
                <div className="font-semibold text-[#111111]">Audit Trail</div>
                <div>Created by: {selectedTx.created_by_name} ({selectedTx.created_by_role})</div>
                <div className="font-mono">Timestamp: {new Date(selectedTx.created_at).toLocaleString()}</div>
              </div>
            </div>

            <div className="bg-[#F7F7F7] px-6 py-3 border-t border-[#E8E8E8] flex justify-end">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 bg-[#111111] text-white font-semibold text-xs rounded-xl hover:bg-black transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Reversal Confirmation Dialog */}
      {reversalTarget && (
        <div className="fixed inset-0 z-50 bg-[#111111]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-[#E8E8E8] animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-[#111111]">
              <RotateCcw className="w-5 h-5 text-[#111111]" />
              <h3 className="text-base font-bold text-[#111111]">Audited Ledger Reversal</h3>
            </div>
            
            <p className="text-xs text-[#666666] leading-relaxed">
              Approved transactions cannot be deleted. An offsetting reversal entry will be recorded to adjust the running inventory balance.
            </p>

            <div className="p-3 bg-[#F7F7F7] border border-[#E8E8E8] rounded-xl text-xs">
              <span className="font-semibold text-[#111111]">Target: </span>
              {reversalTarget.quantity_bags} bags of {reversalTarget.brand_name} on {reversalTarget.transaction_date}.
            </div>

            {reversalError && (
              <div className="p-2.5 bg-[#F7F7F7] border border-[#E8E8E8] rounded-xl text-[#111111] text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#111111] shrink-0" />
                <span>{reversalError}</span>
              </div>
            )}

            <form onSubmit={handleReversalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1">
                  Correction Reason (Mandatory) <span className="text-[#FFC400]">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Data entry error: 100 bags recorded instead of 10 bags."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E8E8E8] focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReversalTarget(null)}
                  className="px-4 py-2 text-xs font-medium text-[#666666] hover:bg-[#F7F7F7] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReversing}
                  className="px-4 py-2 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] text-xs font-semibold rounded-xl shadow-xs transition-colors"
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
