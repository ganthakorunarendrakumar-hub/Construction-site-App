import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Gem,
  PlusCircle,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  AlertOctagon,
  Download,
  Search,
  CheckCircle2,
  Lock,
  Plus,
  Paperclip,
  RotateCcw,
  X,
  AlertTriangle,
  Layers,
  Settings
} from 'lucide-react';
import {
  Project,
  MaterialLocation,
  UserProfile,
  GenericMaterialTransaction,
  CategoryStockMetrics,
  ExtendedTransactionType
} from '../types';
import { dataService, PossibleDuplicateStockEntryError } from '../services/dataService';
import { getLocalDateString } from '../utils/dateUtils';
import { AttachmentLinks, AttachmentSections, emptyTransactionAttachments, hasTransactionAttachments } from './AttachmentSections';
import { TransactionAttachments } from '../types';
import { DuplicateStockEntryDialog } from './DuplicateStockEntryDialog';
import type { DuplicateStockEntryDetails } from '../utils/stockDuplicate';
import { DuplicateStockEntryConfirmation } from '../utils/stockDuplicate';
import { StockSummaryArtwork } from './StockSummaryArtwork';

interface AggregateModuleProps {
  project: Project;
  currentUser: UserProfile;
  locations: MaterialLocation[];
  onNavigateBack: () => void;
  onNavigateHome: () => void;
  onUploadFile: (file: File) => Promise<{ url: string; name: string; size: number }>;
}

export const AggregateModule: React.FC<AggregateModuleProps> = ({
  project,
  currentUser,
  locations,
  onNavigateBack,
  onNavigateHome,
  onUploadFile
}) => {
  const [sizes, setSizes] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<GenericMaterialTransaction[]>([]);
  const [stockMetrics, setStockMetrics] = useState<CategoryStockMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<'stock_overview' | 'ledger_history'>('stock_overview');

  // Filters
  const [search, setSearch] = useState('');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<'all' | 'tonnes' | 'm3' | 'cft'>('all');

  // Transaction Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txSize, setTxSize] = useState('20 mm');
  const [customSize, setCustomSize] = useState('');
  const [txLocationId, setTxLocationId] = useState(locations[0]?.id || 'main-site');
  const [txDate, setTxDate] = useState(getLocalDateString());
  const [txType, setTxType] = useState<ExtendedTransactionType>('receipt');
  const [txQty, setTxQty] = useState('');
  const [txUnit, setTxUnit] = useState<'tonnes' | 'm3' | 'cft'>('tonnes');
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [challanNumber, setChallanNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [attachment, setAttachment] = useState<{ url: string; name: string; size: number } | null>(null);
  const [attachments, setAttachments] = useState<TransactionAttachments>(emptyTransactionAttachments());
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successSaved, setSuccessSaved] = useState<GenericMaterialTransaction | null>(null);
  const [duplicateEntry, setDuplicateEntry] = useState<DuplicateStockEntryDetails | null>(null);
  const [pendingDuplicateTransaction, setPendingDuplicateTransaction] = useState<Parameters<typeof dataService.recordGenericTransaction>[0] | null>(null);
  const duplicateConfirmation = useRef(new DuplicateStockEntryConfirmation<Parameters<typeof dataService.recordGenericTransaction>[0]>());
  const [isContinuingDuplicate, setIsContinuingDuplicate] = useState(false);

  // Density Config Calculator State
  const [showDensityCalculator, setShowDensityCalculator] = useState(false);
  const [configuredDensity, setConfiguredDensity] = useState('1.55');
  const [convertInputQty, setConvertInputQty] = useState('10');
  const [convertFromUnit, setConvertFromUnit] = useState<'tonnes' | 'm3' | 'cft'>('tonnes');
  const [convertToUnit, setConvertToUnit] = useState<'tonnes' | 'm3' | 'cft'>('m3');

  // Admin Add Custom Size
  const [isAddingSize, setIsAddingSize] = useState(false);
  const [newSizeInput, setNewSizeInput] = useState('');

  // Reversal State
  const [reversalTarget, setReversalTarget] = useState<GenericMaterialTransaction | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isReversing, setIsReversing] = useState(false);

  const isCompleted = project.status === 'completed';
  const isAdmin = currentUser.role === 'admin';
  const isViewer = currentUser.role === 'management_viewer';
  const canRecord = !isViewer && (!isCompleted || isAdmin);

  const loadModuleData = async () => {
    const [sizeList, txList, metrics] = await Promise.all([
      dataService.getAggregateSizes(),
      dataService.getGenericTransactions(project.id, 'aggregate'),
      dataService.calculateCategoryStock(project.id, 'aggregate')
    ]);
    setSizes(sizeList);
    setTransactions(txList);
    setStockMetrics(metrics);
  };

  useEffect(() => {
    loadModuleData();
  }, [project.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const uploaded = await onUploadFile(file);
      setAttachment(uploaded);
    } catch (err: any) {
      alert(err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const qty = parseFloat(txQty);
    if (isNaN(qty) || qty <= 0) {
      setFormError('Quantity must be greater than zero.');
      return;
    }

    let finalSize = txSize;
    if (txSize === 'Other' && customSize.trim()) {
      finalSize = customSize.trim().includes('mm') ? customSize.trim() : `${customSize.trim()} mm`;
    }

    const loc = locations.find(l => l.id === txLocationId);
    if (!hasTransactionAttachments(attachments) && !window.confirm('No supporting documents or images have been attached. Select Cancel to upload files, or OK to Skip & Continue.')) return;

    const transactionInput: Parameters<typeof dataService.recordGenericTransaction>[0] = {
      projectId: project.id,
      projectName: project.name,
      locationId: txLocationId,
      locationName: loc ? loc.name : 'Main Aggregate Yard',
      category: 'aggregate',
      itemName: finalSize,
      diameterOrSize: finalSize,
      unit: txUnit,
      transactionDate: txDate,
      transactionType: txType,
      quantity: qty,
      supplierName,
      invoiceNumber,
      challanNumber,
      remarks,
      attachmentUrl: attachment?.url,
      attachmentName: attachment?.name,
      attachmentSize: attachment?.size,
      attachments
    };

    try {
      setIsSubmitting(true);
      const saved = await dataService.recordGenericTransaction(transactionInput);

      setSuccessSaved(saved);
      await loadModuleData();
    } catch (err: any) {
      if (err instanceof PossibleDuplicateStockEntryError) {
        duplicateConfirmation.current.setPending(transactionInput);
        setPendingDuplicateTransaction(transactionInput);
        setDuplicateEntry(err.duplicate);
        return;
      }
      setFormError(err.message || 'Transaction recording failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueDuplicate = async () => {
    if (!pendingDuplicateTransaction) return;
    setIsContinuingDuplicate(true);
    setIsSubmitting(true);
    try {
      const saved = await duplicateConfirmation.current.continue(input => dataService.recordGenericTransaction(input));
      if (!saved) return;
      setDuplicateEntry(null);
      setPendingDuplicateTransaction(null);
      setSuccessSaved(saved);
      await loadModuleData();
    } catch (err: any) {
      setDuplicateEntry(null);
      setPendingDuplicateTransaction(null);
      setFormError(err.message || 'Transaction recording failed');
    } finally {
      setIsContinuingDuplicate(false);
      setIsSubmitting(false);
    }
  };

  const handleCancelDuplicate = () => {
    duplicateConfirmation.current.cancel();
    setDuplicateEntry(null);
    setPendingDuplicateTransaction(null);
  };

  const handleReversalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTarget || !reversalReason.trim()) return;
    try {
      setIsReversing(true);
      await dataService.reverseGenericTransaction(reversalTarget.id, reversalReason.trim());
      setReversalTarget(null);
      setReversalReason('');
      await loadModuleData();
    } catch (err: any) {
      alert(err.message || 'Reversal failed');
    } finally {
      setIsReversing(false);
    }
  };

  const filteredSummaries = useMemo(() => {
    if (!stockMetrics) return [];
    return stockMetrics.items.filter(item => {
      if (sizeFilter !== 'all' && item.item_name !== sizeFilter) return false;
      if (unitFilter !== 'all' && item.unit !== unitFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return item.item_name.toLowerCase().includes(q) || item.unit.toLowerCase().includes(q);
      }
      return true;
    });
  }, [stockMetrics, sizeFilter, unitFilter, search]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-bp-muted">
        <button onClick={onNavigateHome} className="hover:text-bp-text transition-colors">
          Company Home
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-bp-muted" />
        <button onClick={onNavigateBack} className="hover:text-bp-text transition-colors truncate max-w-xs">
          {project.name}
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-bp-muted" />
        <span className="font-semibold text-bp-text">Coarse Aggregate</span>
      </nav>

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-bp-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-bp-cyan" />
            <h1 className="text-2xl sm:text-[28px] font-bold text-bp-text tracking-tight">
              Coarse Aggregate
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-bp-muted mt-0.5">
            Site: <strong className="text-bp-text font-semibold">{project.name}</strong> &bull; Size Grades (10mm - 80mm) &bull; Tonnes, m³, and cft
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              if (!stockMetrics) return;
              const csv = dataService.exportCategoryReportCsv(stockMetrics, transactions);
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Aggregate_Stock_Report_${project.code}.csv`;
              a.click();
            }}
            className="px-3 py-1.5 bg-white border border-bp-border hover:bg-bp-background text-bp-text text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          {canRecord && (
            <button
              onClick={() => {
                setSuccessSaved(null);
                setFormError(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-bp-cyan hover:bg-bp-blue text-bp-text text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <PlusCircle className="w-4 h-4 text-bp-text" />
              Record Transaction
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="relative isolate bg-bp-navy text-white p-5 rounded-2xl border border-bp-navy-border shadow-xs">
          <StockSummaryArtwork material="aggregate" kind="available" dark />
          <p className="text-xs font-medium text-bp-border-strong">Total Tracked Lines</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[28px] font-bold text-bp-cyan font-mono tabular-nums">
              {filteredSummaries.length}
            </span>
            <span className="text-xs text-bp-border-strong">Grades</span>
          </div>
          <p className="text-[11px] text-bp-muted mt-2 font-mono">
            {stockMetrics?.totalAvailableAggregate.toLocaleString()} total units
          </p>
        </div>

        <div className="relative isolate bg-white p-5 rounded-2xl border border-bp-border shadow-xs">
          <StockSummaryArtwork material="aggregate" kind="received" />
          <div className="flex items-center justify-between text-xs font-medium text-bp-muted">
            <span>Total Delivered</span>
            <TrendingUp className="w-4 h-4 text-bp-text" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[28px] font-bold text-bp-text font-mono tabular-nums">
              {stockMetrics?.items.reduce((s, i) => s + i.total_received, 0).toLocaleString()}
            </span>
            <span className="text-xs text-bp-muted">Vol / Mass</span>
          </div>
          <p className="text-[11px] text-bp-muted mt-2">Quarry tipper loads</p>
        </div>

        <div className="relative isolate bg-white p-5 rounded-2xl border border-bp-border shadow-xs">
          <StockSummaryArtwork material="aggregate" kind="used" />
          <div className="flex items-center justify-between text-xs font-medium text-bp-muted">
            <span>Consumed</span>
            <TrendingDown className="w-4 h-4 text-bp-text" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[28px] font-bold text-bp-text font-mono tabular-nums">
              {stockMetrics?.items.reduce((s, i) => s + i.total_used, 0).toLocaleString()}
            </span>
            <span className="text-xs text-bp-muted">Vol / Mass</span>
          </div>
          <p className="text-[11px] text-bp-muted mt-2">RCC concrete batching</p>
        </div>

        <div className="relative isolate bg-white p-5 rounded-2xl border border-bp-border shadow-xs">
          <StockSummaryArtwork material="aggregate" kind="damaged" />
          <div className="flex items-center justify-between text-xs font-medium text-bp-muted">
            <span>Rejected / Waste</span>
            <AlertOctagon className="w-4 h-4 text-bp-text" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[28px] font-bold text-bp-text font-mono tabular-nums">
              {stockMetrics?.items.reduce((s, i) => s + i.total_damaged, 0).toLocaleString()}
            </span>
            <span className="text-xs text-bp-muted">Vol / Mass</span>
          </div>
          <p className="text-[11px] text-bp-muted mt-2">Flaky & oversized rock</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-bp-border">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('stock_overview')}
            className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'stock_overview' ? 'border-bp-cyan text-bp-text' : 'border-transparent text-bp-muted hover:text-bp-text'
            }`}
          >
            <Layers className="w-4 h-4" />
            Size-Wise Aggregate Stock
          </button>
          <button
            onClick={() => setActiveTab('ledger_history')}
            className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'ledger_history' ? 'border-bp-cyan text-bp-text' : 'border-transparent text-bp-muted hover:text-bp-text'
            }`}
          >
            Delivery & Batch Ledger ({transactions.length})
          </button>
        </div>

        {isAdmin && activeTab === 'stock_overview' && (
          <button
            onClick={() => setIsAddingSize(!isAddingSize)}
            className="text-bp-text hover:underline font-semibold text-xs flex items-center gap-1 pb-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Custom Size
          </button>
        )}
      </div>

      {isAddingSize && (
        <div className="bg-white p-4 rounded-2xl border border-bp-border flex items-center gap-3 shadow-xs animate-in fade-in">
          <input
            type="text"
            value={newSizeInput}
            onChange={(e) => setNewSizeInput(e.target.value)}
            placeholder="e.g. 6 mm GSB / 50 mm ballast"
            className="flex-1 text-xs px-3.5 py-2 rounded-xl border border-bp-border bg-bp-background focus:bg-white focus:outline-none focus:border-bp-cyan"
          />
          <button
            onClick={async () => {
              if (!newSizeInput.trim()) return;
              await dataService.addAggregateSize(newSizeInput.trim());
              setNewSizeInput('');
              setIsAddingSize(false);
              await loadModuleData();
            }}
            className="px-4 py-2 bg-bp-cyan hover:bg-bp-blue text-bp-text font-semibold text-xs rounded-xl shadow-xs"
          >
            Save Size
          </button>
          <button onClick={() => setIsAddingSize(false)} className="text-xs text-bp-muted">Cancel</button>
        </div>
      )}

      {/* VIEW 1: SIZE OVERVIEW */}
      {activeTab === 'stock_overview' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-2xl border border-bp-border flex flex-wrap gap-3 items-center justify-between shadow-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-bp-muted absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search aggregate size..."
                className="w-full text-xs pl-10 pr-4 py-2 rounded-xl border border-bp-border bg-bp-background text-bp-text focus:bg-white focus:outline-none focus:border-bp-cyan"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                className="text-xs py-2 px-3 rounded-xl border border-bp-border bg-white text-bp-text focus:outline-none focus:border-bp-cyan"
              >
                <option value="all">All Sizes</option>
                {sizes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value as any)}
                className="text-xs py-2 px-3 rounded-xl border border-bp-border bg-white text-bp-text focus:outline-none focus:border-bp-cyan"
              >
                <option value="all">All Units</option>
                <option value="tonnes">Tonnes</option>
                <option value="m3">m³</option>
                <option value="cft">cft</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-bp-border overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-bp-background border-b border-bp-border text-[11px] font-semibold text-bp-muted uppercase tracking-wider">
                    <th className="py-3 px-4">Aggregate Size</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4 text-right">Received</th>
                    <th className="py-3 px-4 text-right">Used in Concrete</th>
                    <th className="py-3 px-4 text-right">Rejected</th>
                    <th className="py-3 px-4 text-right bg-bp-cyan/10">Available Stock</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-bp-muted">
                        No aggregate batches recorded matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredSummaries.map((item) => (
                      <tr key={item.key} className="hover:bg-bp-background transition-colors">
                        <td className="py-3 px-4 font-semibold text-bp-text text-sm">{item.item_name}</td>
                        <td className="py-3 px-4 font-mono text-bp-muted">{item.unit}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-bp-text">
                          {item.total_received.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-bp-text">
                          {item.total_used.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-bp-text">
                          {item.total_damaged.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-sm tabular-nums text-bp-text bg-bp-cyan/10">
                          {item.available_stock.toLocaleString()} {item.unit}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {canRecord && (
                            <button
                              onClick={() => {
                                setTxSize(item.item_name);
                                setTxUnit(item.unit as any);
                                setIsModalOpen(true);
                              }}
                              className="px-3 py-1 text-xs font-semibold text-bp-text bg-bp-cyan hover:bg-bp-blue rounded-lg transition-colors shadow-xs"
                            >
                              + Move
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 bg-bp-background border-t border-bp-border text-[11px] text-bp-muted">
              * Mass (tonnes) and volume (m³, cft) are calculated strictly in their recorded measurement units to prevent arbitrary density distortions.
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: LEDGER */}
      {activeTab === 'ledger_history' && (
        <div className="bg-white rounded-2xl border border-bp-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-bp-background border-b border-bp-border text-[11px] font-semibold text-bp-muted uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Size Grade</th>
                  <th className="py-3 px-4">Movement</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right bg-bp-cyan/10">Running Balance</th>
                  <th className="py-3 px-4">Quarry / Challan</th>
                  <th className="py-3 px-4">Recorded By</th>
                  <th className="py-3 px-4 text-center">Document</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-bp-muted">
                      No aggregate transactions logged yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className={`hover:bg-bp-background transition-colors ${tx.is_reversal ? 'line-through opacity-60' : ''}`}>
                      <td className="py-3 px-4 font-mono">{tx.transaction_date}</td>
                      <td className="py-3 px-4 font-semibold text-bp-text">{tx.item_name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                          tx.transaction_type === 'receipt' ? 'bg-bp-cyan/20 text-bp-text border border-bp-cyan/40' :
                          'bg-bp-background text-bp-text border border-bp-border'
                        }`}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        {tx.quantity.toLocaleString()} {tx.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-bp-text bg-bp-cyan/10">
                        {tx.running_balance !== undefined ? `${tx.running_balance.toLocaleString()} ${tx.unit}` : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-bp-muted">
                        {tx.supplier_name || tx.challan_number || '—'}
                      </td>
                      <td className="py-3 px-4 text-bp-text">{tx.created_by_name}</td>
                      <td className="py-3 px-4 text-center">
                        <AttachmentLinks attachments={tx.attachments} legacyUrl={tx.attachment_url} legacyName={tx.attachment_name} />
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right">
                          {!tx.is_reversal && (
                            <button
                              onClick={() => {
                                setReversalTarget(tx);
                                setReversalReason('');
                              }}
                              className="text-[11px] text-bp-muted hover:text-bp-text hover:underline font-semibold"
                            >
                              Reverse
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TRANSACTION ENTRY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-bp-navy/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-bp-border max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-bp-border pb-3">
              <h3 className="font-bold text-base text-bp-text flex items-center gap-2">
                <Gem className="w-5 h-5 text-bp-text" />
                Record Aggregate Transaction
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-bp-muted hover:text-bp-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            {successSaved ? (
              <div className="py-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-bp-text mx-auto" />
                <h4 className="font-bold text-lg text-bp-text">Aggregate Transaction Logged</h4>
                <p className="text-xs text-bp-muted">
                  Recorded {successSaved.quantity} {successSaved.unit} of {successSaved.item_name}.
                </p>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSuccessSaved(null);
                  }}
                  className="px-5 py-2 bg-bp-cyan text-bp-text font-semibold text-xs rounded-xl shadow-xs"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecordSubmit} className="space-y-4 text-xs">
                {formError && (
                  <div className="p-2.5 bg-bp-background border border-bp-border text-bp-text rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-bp-text shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-bp-text uppercase mb-1">Transaction Movement</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setTxType('receipt')}
                      className={`py-2 rounded-xl font-semibold border transition-colors ${txType === 'receipt' ? 'bg-bp-cyan text-bp-text border-bp-cyan' : 'border-bp-border text-bp-muted'}`}
                    >
                      Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('usage')}
                      className={`py-2 rounded-xl font-semibold border transition-colors ${txType === 'usage' ? 'bg-bp-cyan text-bp-text border-bp-cyan' : 'border-bp-border text-bp-muted'}`}
                    >
                      Concrete
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('damage')}
                      className={`py-2 rounded-xl font-semibold border transition-colors ${txType === 'damage' ? 'bg-bp-cyan text-bp-text border-bp-cyan' : 'border-bp-border text-bp-muted'}`}
                    >
                      Rejected
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('return')}
                      className={`py-2 rounded-xl font-semibold border transition-colors ${txType === 'return' ? 'bg-bp-cyan text-bp-text border-bp-cyan' : 'border-bp-border text-bp-muted'}`}
                    >
                      Return
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-bp-text uppercase mb-1">Aggregate Size</label>
                    <select
                      value={txSize}
                      onChange={(e) => setTxSize(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl border border-bp-border bg-white text-bp-text focus:outline-none focus:border-bp-cyan"
                    >
                      {sizes.map(s => <option key={s} value={s}>{s}</option>)}
                      <option value="Other">Other Size</option>
                    </select>
                    {txSize === 'Other' && (
                      <input
                        type="text"
                        placeholder="e.g. 50 mm ballast"
                        value={customSize}
                        onChange={(e) => setCustomSize(e.target.value)}
                        className="mt-1.5 w-full py-2 px-3 rounded-xl border border-bp-border"
                        required
                      />
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-bp-text uppercase mb-1">Quantity & Unit</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        required
                        value={txQty}
                        onChange={(e) => setTxQty(e.target.value)}
                        placeholder="e.g. 20"
                        className="w-full py-2 px-3 rounded-xl border border-bp-border font-mono"
                      />
                      <select
                        value={txUnit}
                        onChange={(e) => setTxUnit(e.target.value as any)}
                        className="py-2 px-3 rounded-xl border border-bp-border bg-white font-semibold"
                      >
                        <option value="tonnes">Tonnes</option>
                        <option value="m3">m³</option>
                        <option value="cft">cft</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDensityCalculator(!showDensityCalculator)}
                      className="mt-1 text-[11px] font-semibold text-bp-text hover:underline flex items-center gap-1"
                    >
                      <Settings className="w-3 h-3" />
                      {showDensityCalculator ? 'Hide Density Converter' : 'Density Converter (Mass ⇄ Vol)'}
                    </button>
                  </div>

                  {showDensityCalculator && (
                    <div className="col-span-2 p-3 bg-bp-background border border-bp-border rounded-xl text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-bp-text flex items-center gap-1">
                          <Settings className="w-3.5 h-3.5 text-bp-text" />
                          Configurable Material Density Converter
                        </span>
                        <span className="text-[10px] text-bp-muted font-mono">
                          1 m³ = 35.3147 cft
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold uppercase text-bp-muted">Bulk Density (t/m³)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={configuredDensity}
                            onChange={(e) => setConfiguredDensity(e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-bp-border rounded-lg text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase text-bp-muted">Source Qty</label>
                          <input
                            type="number"
                            step="any"
                            value={convertInputQty}
                            onChange={(e) => setConvertInputQty(e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-bp-border rounded-lg text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase text-bp-muted">Convert</label>
                          <div className="flex gap-1">
                            <select
                              value={convertFromUnit}
                              onChange={(e) => setConvertFromUnit(e.target.value as any)}
                              className="w-1/2 px-1 py-1 bg-white border border-bp-border rounded-lg text-[11px]"
                            >
                              <option value="tonnes">Tonnes</option>
                              <option value="m3">m³</option>
                              <option value="cft">cft</option>
                            </select>
                            <select
                              value={convertToUnit}
                              onChange={(e) => setConvertToUnit(e.target.value as any)}
                              className="w-1/2 px-1 py-1 bg-white border border-bp-border rounded-lg text-[11px]"
                            >
                              <option value="m3">m³</option>
                              <option value="cft">cft</option>
                              <option value="tonnes">Tonnes</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {(() => {
                        const density = parseFloat(configuredDensity) || 1.55;
                        const inQty = parseFloat(convertInputQty) || 0;
                        let inM3 = 0;
                        if (convertFromUnit === 'm3') inM3 = inQty;
                        else if (convertFromUnit === 'cft') inM3 = inQty / 35.3147;
                        else if (convertFromUnit === 'tonnes') inM3 = inQty / density;

                        let result = 0;
                        if (convertToUnit === 'm3') result = inM3;
                        else if (convertToUnit === 'cft') result = inM3 * 35.3147;
                        else if (convertToUnit === 'tonnes') result = inM3 * density;

                        const formattedResult = result.toFixed(3);
                        return (
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs font-bold text-bp-text font-mono">
                              = {formattedResult} {convertToUnit}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setTxQty(formattedResult);
                                setTxUnit(convertToUnit);
                                setShowDensityCalculator(false);
                              }}
                              className="px-2.5 py-1 bg-bp-cyan hover:bg-bp-blue text-bp-text rounded-lg font-semibold text-[11px] transition-colors"
                            >
                              Apply
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-bp-text uppercase mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl border border-bp-border"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-bp-text uppercase mb-1">Quarry / Supplier</label>
                    <input
                      type="text"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="e.g. Hills Stone Crusher Hub"
                      className="w-full py-2 px-3 rounded-xl border border-bp-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-bp-text uppercase mb-1">Invoice / Delivery Slip #</label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="e.g. INV-AGG-88"
                      className="w-full py-2 px-3 rounded-xl border border-bp-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-bp-text uppercase mb-1">Tipper Challan #</label>
                    <input
                      type="text"
                      value={challanNumber}
                      onChange={(e) => setChallanNumber(e.target.value)}
                      placeholder="e.g. WB-4491"
                      className="w-full py-2 px-3 rounded-xl border border-bp-border font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-bp-text uppercase mb-1">Remarks</label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Blue granite 20mm for slab mix"
                    className="w-full py-2 px-3 rounded-xl border border-bp-border"
                  />
                </div>

                <AttachmentSections value={attachments} onChange={setAttachments} onUploadFile={onUploadFile} />

                <div className="pt-3 border-t border-bp-border flex justify-end gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl text-bp-muted hover:bg-bp-background">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-bp-cyan hover:bg-bp-blue text-bp-text font-semibold rounded-xl shadow-xs">
                    {isSubmitting ? 'Recording...' : 'Commit to Stock Ledger'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* REVERSAL MODAL */}
      {reversalTarget && (
        <div className="fixed inset-0 z-50 bg-bp-navy/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-bp-border">
            <h3 className="font-bold text-base text-bp-text flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-bp-text" />
              Reverse Aggregate Entry
            </h3>
            <p className="text-xs text-bp-muted">
              Reverse {reversalTarget.quantity} {reversalTarget.unit} of {reversalTarget.item_name}. An offsetting entry will be written.
            </p>
            <form onSubmit={handleReversalSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-bp-text uppercase mb-1">Audit Reason *</label>
                <textarea
                  required
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Weighbridge gross tare difference corrected."
                  className="w-full p-2.5 border border-bp-border rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setReversalTarget(null)} className="px-3 py-1.5 rounded-xl text-bp-muted">Cancel</button>
                <button type="submit" disabled={isReversing} className="px-4 py-1.5 bg-bp-cyan hover:bg-bp-blue text-bp-text font-semibold rounded-xl">
                  {isReversing ? 'Reversing...' : 'Commit Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {duplicateEntry && (
        <DuplicateStockEntryDialog
          duplicate={duplicateEntry}
          isContinuing={isContinuingDuplicate}
          onCancel={handleCancelDuplicate}
          onContinue={handleContinueDuplicate}
        />
      )}

    </div>
  );
};
