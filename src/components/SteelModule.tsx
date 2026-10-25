import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Layers,
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
  AlertTriangle
} from 'lucide-react';
import {
  Project,
  SteelBrand,
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

interface SteelModuleProps {
  project: Project;
  currentUser: UserProfile;
  locations: MaterialLocation[];
  onNavigateBack: () => void;
  onNavigateHome: () => void;
  onUploadFile: (file: File) => Promise<{ url: string; name: string; size: number }>;
}

export const SteelModule: React.FC<SteelModuleProps> = ({
  project,
  currentUser,
  locations,
  onNavigateBack,
  onNavigateHome,
  onUploadFile
}) => {
  const [brands, setBrands] = useState<SteelBrand[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<GenericMaterialTransaction[]>([]);
  const [stockMetrics, setStockMetrics] = useState<CategoryStockMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<'stock_overview' | 'ledger_history'>('stock_overview');

  // Filters
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [unitView, setUnitView] = useState<'kg' | 'tonnes'>('kg');

  // Transaction Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txBrand, setTxBrand] = useState('');
  const [customBrandName, setCustomBrandName] = useState('');
  const [txDiameter, setTxDiameter] = useState('12 mm');
  const [customDiameter, setCustomDiameter] = useState('');
  const [txLocationId, setTxLocationId] = useState(locations[0]?.id || 'main-site');
  const [txDate, setTxDate] = useState(getLocalDateString());
  const [txType, setTxType] = useState<ExtendedTransactionType>('receipt');
  const [txQty, setTxQty] = useState('');
  const [txUnit, setTxUnit] = useState<'kg' | 'tonnes'>('kg');
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

  // Admin Add Custom Brand / Size
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [newBrandInput, setNewBrandInput] = useState('');
  const [isAddingSize, setIsAddingSize] = useState(false);
  const [newSizeInput, setNewSizeInput] = useState('');

  // Reversal State
  const [reversalTarget, setReversalTarget] = useState<GenericMaterialTransaction | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isReversing, setIsReversing] = useState(false);
  const [reversalError, setReversalError] = useState<string | null>(null);

  const isCompleted = project.status === 'completed';
  const isAdmin = currentUser.role === 'admin';
  const isViewer = currentUser.role === 'management_viewer';
  const canRecord = !isViewer && (!isCompleted || isAdmin);

  const loadModuleData = async () => {
    const [bList, sList, txList, metrics] = await Promise.all([
      dataService.getSteelBrands(),
      dataService.getSteelSizes(),
      dataService.getGenericTransactions(project.id, 'steel'),
      dataService.calculateCategoryStock(project.id, 'steel')
    ]);
    setBrands(bList);
    setSizes(sList);
    setTransactions(txList);
    setStockMetrics(metrics);
    if (!txBrand && bList.length > 0) setTxBrand(bList[0].name);
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
      setFormError('Quantity must be a positive number greater than 0.');
      return;
    }

    let finalBrand = txBrand;
    if (txBrand === 'Other' && customBrandName.trim()) {
      finalBrand = customBrandName.trim();
    }

    let finalDiameter = txDiameter;
    if (txDiameter === 'Other' && customDiameter.trim()) {
      finalDiameter = customDiameter.trim().includes('mm') ? customDiameter.trim() : `${customDiameter.trim()} mm`;
    }

    const qtyInKg = txUnit === 'tonnes' ? qty * 1000 : qty;
    const loc = locations.find(l => l.id === txLocationId);
    if (!hasTransactionAttachments(attachments) && !window.confirm('No supporting documents or images have been attached. Select Cancel to upload files, or OK to Skip & Continue.')) return;

    const transactionInput: Parameters<typeof dataService.recordGenericTransaction>[0] = {
      projectId: project.id,
      projectName: project.name,
      locationId: txLocationId,
      locationName: loc ? loc.name : 'Main Steel Yard',
      category: 'steel',
      itemName: finalBrand,
      brandName: finalBrand,
      diameterOrSize: finalDiameter,
      unit: 'kg',
      transactionDate: txDate,
      transactionType: txType,
      quantity: qtyInKg,
      supplierName,
      invoiceNumber,
      challanNumber,
      remarks: remarks ? `${remarks} (Entered as ${qty} ${txUnit})` : `Entered as ${qty} ${txUnit}`,
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
      setFormError(err.message || 'Failed to record transaction.');
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
      setFormError(err.message || 'Failed to record transaction.');
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
      setReversalError(null);
      await dataService.reverseGenericTransaction(reversalTarget.id, reversalReason.trim());
      setReversalTarget(null);
      setReversalReason('');
      await loadModuleData();
    } catch (err: any) {
      setReversalError(err.message || 'Reversal failed');
    } finally {
      setIsReversing(false);
    }
  };

  const handleExportCsv = () => {
    if (!stockMetrics) return;
    const csv = dataService.exportCategoryReportCsv(stockMetrics, transactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Steel_Stock_Report_${project.code}.csv`;
    a.click();
  };

  const formatQty = (kgValue: number) => {
    if (unitView === 'tonnes') {
      return (kgValue / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 });
    }
    return kgValue.toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  const filteredSummaries = useMemo(() => {
    if (!stockMetrics) return [];
    return stockMetrics.items.filter(item => {
      if (brandFilter !== 'all' && item.brand_name !== brandFilter) return false;
      if (sizeFilter !== 'all' && item.diameter_or_size !== sizeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          item.brand_name?.toLowerCase().includes(q) ||
          item.diameter_or_size?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [stockMetrics, brandFilter, sizeFilter, search]);

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
        <span className="font-semibold text-bp-text">Steel & TMT Rebars</span>
      </nav>

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-bp-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-bp-cyan" />
            <h1 className="text-2xl sm:text-[28px] font-bold text-bp-text tracking-tight">
              Steel & TMT Rebars
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-bp-muted mt-0.5">
            Site: <strong className="text-bp-text font-semibold">{project.name}</strong> ({project.code}) &bull; Unit: {unitView.toUpperCase()} (1 tonne = 1,000 kg)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Unit Toggle */}
          <div className="bg-bp-background border border-bp-border p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => setUnitView('kg')}
              className={`px-3 py-1 rounded-lg transition-all ${unitView === 'kg' ? 'bg-bp-cyan text-bp-text' : 'text-bp-muted hover:text-bp-text'}`}
            >
              Kilograms (kg)
            </button>
            <button
              onClick={() => setUnitView('tonnes')}
              className={`px-3 py-1 rounded-lg transition-all ${unitView === 'tonnes' ? 'bg-bp-cyan text-bp-text' : 'text-bp-muted hover:text-bp-text'}`}
            >
              Tonnes (t)
            </button>
          </div>

          <button
            onClick={handleExportCsv}
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
        <div className="bg-bp-navy text-white p-5 rounded-2xl border border-bp-navy-border shadow-xs">
          <p className="text-xs font-medium text-bp-border-strong">Available Steel</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[28px] font-bold text-bp-cyan font-mono tabular-nums">
              {formatQty(stockMetrics?.totalAvailableAggregate ?? 0)}
            </span>
            <span className="text-xs text-bp-border-strong">{unitView}</span>
          </div>
          <p className="text-[11px] text-bp-muted mt-2 font-mono">
            {filteredSummaries.length} tracked lines
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-bp-border shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-bp-muted">
            <span>Total Received</span>
            <TrendingUp className="w-4 h-4 text-bp-text" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[28px] font-bold text-bp-text font-mono tabular-nums">
              {formatQty(stockMetrics?.items.reduce((s, i) => s + i.total_received, 0) ?? 0)}
            </span>
            <span className="text-xs text-bp-muted">{unitView}</span>
          </div>
          <p className="text-[11px] text-bp-muted mt-2">Certified TMT receipts</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-bp-border shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-bp-muted">
            <span>Total Used / Bent</span>
            <TrendingDown className="w-4 h-4 text-bp-text" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[28px] font-bold text-bp-text font-mono tabular-nums">
              {formatQty(stockMetrics?.items.reduce((s, i) => s + i.total_used, 0) ?? 0)}
            </span>
            <span className="text-xs text-bp-muted">{unitView}</span>
          </div>
          <p className="text-[11px] text-bp-muted mt-2">Bar bending & cages</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-bp-border shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-bp-muted">
            <span>Scrap & Cut-Offs</span>
            <AlertOctagon className="w-4 h-4 text-bp-text" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[28px] font-bold text-bp-text font-mono tabular-nums">
              {formatQty(stockMetrics?.items.reduce((s, i) => s + i.total_damaged, 0) ?? 0)}
            </span>
            <span className="text-xs text-bp-muted">{unitView}</span>
          </div>
          <p className="text-[11px] text-bp-muted mt-2">End pieces & wastage</p>
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
            Stock by Brand & Diameter
          </button>
          <button
            onClick={() => setActiveTab('ledger_history')}
            className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'ledger_history' ? 'border-bp-cyan text-bp-text' : 'border-transparent text-bp-muted hover:text-bp-text'
            }`}
          >
            Transaction History ({transactions.length})
          </button>
        </div>

        {isAdmin && activeTab === 'stock_overview' && (
          <div className="flex items-center gap-3 pb-2 text-xs">
            <button
              onClick={() => setIsAddingBrand(!isAddingBrand)}
              className="text-bp-text hover:underline font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Brand
            </button>
            <button
              onClick={() => setIsAddingSize(!isAddingSize)}
              className="text-bp-text hover:underline font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Size
            </button>
          </div>
        )}
      </div>

      {/* Admin Quick Add Drawers */}
      {isAddingBrand && (
        <div className="bg-white p-4 rounded-2xl border border-bp-border flex items-center gap-3 shadow-xs animate-in fade-in">
          <input
            type="text"
            value={newBrandInput}
            onChange={(e) => setNewBrandInput(e.target.value)}
            placeholder="Enter custom steel brand (e.g. Jindal Panther, Rathi TMT)"
            className="flex-1 text-xs px-3.5 py-2 rounded-xl border border-bp-border bg-bp-background focus:bg-white focus:outline-none focus:border-bp-cyan"
          />
          <button
            onClick={async () => {
              if (!newBrandInput.trim()) return;
              await dataService.addSteelBrand(newBrandInput.trim());
              setNewBrandInput('');
              setIsAddingBrand(false);
              await loadModuleData();
            }}
            className="px-4 py-2 bg-bp-cyan hover:bg-bp-blue text-bp-text font-semibold text-xs rounded-xl shadow-xs"
          >
            Save Brand
          </button>
          <button onClick={() => setIsAddingBrand(false)} className="text-xs text-bp-muted">Cancel</button>
        </div>
      )}

      {isAddingSize && (
        <div className="bg-white p-4 rounded-2xl border border-bp-border flex items-center gap-3 shadow-xs animate-in fade-in">
          <input
            type="text"
            value={newSizeInput}
            onChange={(e) => setNewSizeInput(e.target.value)}
            placeholder="Enter diameter (e.g. 36 mm, 40 mm)"
            className="flex-1 text-xs px-3.5 py-2 rounded-xl border border-bp-border bg-bp-background focus:bg-white focus:outline-none focus:border-bp-cyan"
          />
          <button
            onClick={async () => {
              if (!newSizeInput.trim()) return;
              await dataService.addSteelSize(newSizeInput.trim());
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

      {/* VIEW 1: STOCK BY BRAND & DIAMETER */}
      {activeTab === 'stock_overview' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-2xl border border-bp-border flex flex-wrap gap-3 items-center justify-between shadow-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-bp-muted absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search steel brand or diameter..."
                className="w-full text-xs pl-10 pr-4 py-2 rounded-xl border border-bp-border bg-bp-background text-bp-text focus:bg-white focus:outline-none focus:border-bp-cyan"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="text-xs py-2 px-3 rounded-xl border border-bp-border bg-white text-bp-text focus:outline-none focus:border-bp-cyan"
              >
                <option value="all">All Brands</option>
                {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>

              <select
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                className="text-xs py-2 px-3 rounded-xl border border-bp-border bg-white text-bp-text focus:outline-none focus:border-bp-cyan"
              >
                <option value="all">All Diameters</option>
                {sizes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-bp-border overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-bp-background border-b border-bp-border text-[11px] font-semibold text-bp-muted uppercase tracking-wider">
                    <th className="py-3 px-4">Brand</th>
                    <th className="py-3 px-4">Diameter</th>
                    <th className="py-3 px-4 text-right">Received ({unitView})</th>
                    <th className="py-3 px-4 text-right">Used ({unitView})</th>
                    <th className="py-3 px-4 text-right">Scrap ({unitView})</th>
                    <th className="py-3 px-4 text-right bg-bp-cyan/10">Available ({unitView})</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-bp-muted">
                        No steel items found matching filters. Record a new receipt to initialize inventory.
                      </td>
                    </tr>
                  ) : (
                    filteredSummaries.map((item) => (
                      <tr key={item.key} className="hover:bg-bp-background transition-colors">
                        <td className="py-3 px-4 font-semibold text-bp-text">{item.brand_name || item.item_name}</td>
                        <td className="py-3 px-4 font-mono font-medium text-bp-text">
                          <span className="px-2 py-0.5 rounded-md bg-bp-background border border-bp-border">
                            {item.diameter_or_size || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-bp-text">
                          {formatQty(item.total_received)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-bp-text">
                          {formatQty(item.total_used)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-bp-text">
                          {formatQty(item.total_damaged)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-sm tabular-nums text-bp-text bg-bp-cyan/10">
                          {formatQty(item.available_stock)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {canRecord && (
                            <button
                              onClick={() => {
                                setTxBrand(item.brand_name || brands[0]?.name || '');
                                setTxDiameter(item.diameter_or_size || '12 mm');
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
          </div>
        </div>
      )}

      {/* VIEW 2: TRANSACTION LEDGER */}
      {activeTab === 'ledger_history' && (
        <div className="bg-white rounded-2xl border border-bp-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-bp-background border-b border-bp-border text-[11px] font-semibold text-bp-muted uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Brand</th>
                  <th className="py-3 px-4">Diameter</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right bg-bp-cyan/10">Running Stock</th>
                  <th className="py-3 px-4">Invoice / Challan</th>
                  <th className="py-3 px-4">Recorded By</th>
                  <th className="py-3 px-4 text-center">Document</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-bp-muted">
                      No transactions recorded yet for steel.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className={`hover:bg-bp-background transition-colors ${tx.is_reversal ? 'line-through opacity-60' : ''}`}>
                      <td className="py-3 px-4 font-mono">{tx.transaction_date}</td>
                      <td className="py-3 px-4 font-semibold text-bp-text">{tx.brand_name || tx.item_name}</td>
                      <td className="py-3 px-4 font-mono text-bp-text">{tx.diameter_or_size}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                          tx.transaction_type === 'receipt' ? 'bg-bp-cyan/20 text-bp-text border border-bp-cyan/40' :
                          'bg-bp-background text-bp-text border border-bp-border'
                        }`}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        {tx.quantity.toLocaleString()} kg
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-bp-text bg-bp-cyan/10">
                        {tx.running_balance !== undefined ? `${tx.running_balance.toLocaleString()} kg` : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-bp-muted">
                        {tx.invoice_number || tx.challan_number || '—'}
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
                                setReversalError(null);
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

      {/* RECORD TRANSACTION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-bp-navy/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-bp-border max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-bp-border pb-3">
              <h3 className="font-bold text-base text-bp-text flex items-center gap-2">
                <Layers className="w-5 h-5 text-bp-text" />
                Record Steel Transaction
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-bp-muted hover:text-bp-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            {successSaved ? (
              <div className="py-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-bp-text mx-auto" />
                <h4 className="font-bold text-lg text-bp-text">Steel Transaction Recorded</h4>
                <p className="text-xs text-bp-muted">
                  Recorded {successSaved.quantity} kg of {successSaved.brand_name} ({successSaved.diameter_or_size}).
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

                {/* Type */}
                <div>
                  <label className="block font-semibold text-bp-text uppercase mb-1">Transaction Type</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTxType('receipt')}
                      className={`py-2 rounded-xl font-semibold border transition-colors ${txType === 'receipt' ? 'bg-bp-cyan text-bp-text border-bp-cyan' : 'border-bp-border text-bp-muted'}`}
                    >
                      + Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('usage')}
                      className={`py-2 rounded-xl font-semibold border transition-colors ${txType === 'usage' ? 'bg-bp-cyan text-bp-text border-bp-cyan' : 'border-bp-border text-bp-muted'}`}
                    >
                      - Site Usage
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('damage')}
                      className={`py-2 rounded-xl font-semibold border transition-colors ${txType === 'damage' ? 'bg-bp-cyan text-bp-text border-bp-cyan' : 'border-bp-border text-bp-muted'}`}
                    >
                      - Scrap / Wastage
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-bp-text uppercase mb-1">Steel Brand</label>
                    <select
                      value={txBrand}
                      onChange={(e) => setTxBrand(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl border border-bp-border bg-white text-bp-text focus:outline-none focus:border-bp-cyan"
                    >
                      {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                    {txBrand === 'Other' && (
                      <input
                        type="text"
                        placeholder="Enter brand name"
                        value={customBrandName}
                        onChange={(e) => setCustomBrandName(e.target.value)}
                        className="mt-1.5 w-full py-2 px-3 rounded-xl border border-bp-border"
                        required
                      />
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-bp-text uppercase mb-1">Diameter (mm)</label>
                    <select
                      value={txDiameter}
                      onChange={(e) => setTxDiameter(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl border border-bp-border bg-white text-bp-text focus:outline-none focus:border-bp-cyan"
                    >
                      {sizes.map(s => <option key={s} value={s}>{s}</option>)}
                      <option value="Other">Other Size</option>
                    </select>
                    {txDiameter === 'Other' && (
                      <input
                        type="text"
                        placeholder="e.g. 36 mm"
                        value={customDiameter}
                        onChange={(e) => setCustomDiameter(e.target.value)}
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
                        min="0.001"
                        required
                        value={txQty}
                        onChange={(e) => setTxQty(e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full py-2 px-3 rounded-xl border border-bp-border font-mono"
                      />
                      <select
                        value={txUnit}
                        onChange={(e) => setTxUnit(e.target.value as any)}
                        className="py-2 px-3 rounded-xl border border-bp-border bg-white font-semibold"
                      >
                        <option value="kg">kg</option>
                        <option value="tonnes">Tonnes</option>
                      </select>
                    </div>
                  </div>

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
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-bp-text uppercase mb-1">Supplier / Stockist</label>
                    <input
                      type="text"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="e.g. Tata Steel Stockyard"
                      className="w-full py-2 px-3 rounded-xl border border-bp-border"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-bp-text uppercase mb-1">Invoice / Challan #</label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="e.g. INV-ST-991"
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
                    placeholder="e.g. Fe 550D TMT Grade batch for slab beams"
                    className="w-full py-2 px-3 rounded-xl border border-bp-border"
                  />
                </div>

                <AttachmentSections value={attachments} onChange={setAttachments} onUploadFile={onUploadFile} />

                <div className="pt-3 border-t border-bp-border flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-bp-muted hover:bg-bp-background font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-bp-cyan hover:bg-bp-blue text-bp-text font-semibold rounded-xl shadow-xs"
                  >
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
              Reverse Steel Transaction
            </h3>
            <p className="text-xs text-bp-muted">
              Reverse {reversalTarget.quantity} kg of {reversalTarget.brand_name} ({reversalTarget.diameter_or_size}). An offsetting entry will be written.
            </p>
            {reversalError && <p className="text-xs text-bp-text">{reversalError}</p>}
            <form onSubmit={handleReversalSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-bp-text uppercase mb-1">Audited Reason *</label>
                <textarea
                  required
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Wrong diameter selected during delivery logging."
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
