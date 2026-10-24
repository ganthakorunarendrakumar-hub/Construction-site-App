import React, { useState, useEffect, useMemo } from 'react';
import {
  Mountain,
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
  Layers
} from 'lucide-react';
import {
  Project,
  MaterialLocation,
  UserProfile,
  GenericMaterialTransaction,
  CategoryStockMetrics,
  ExtendedTransactionType
} from '../types';
import { dataService } from '../services/dataService';
import { getLocalDateString } from '../utils/dateUtils';
import { AttachmentLinks, AttachmentSections, emptyTransactionAttachments, hasTransactionAttachments } from './AttachmentSections';
import { TransactionAttachments } from '../types';

interface SandModuleProps {
  project: Project;
  currentUser: UserProfile;
  locations: MaterialLocation[];
  onNavigateBack: () => void;
  onNavigateHome: () => void;
  onUploadFile: (file: File) => Promise<{ url: string; name: string; size: number }>;
}

export const SandModule: React.FC<SandModuleProps> = ({
  project,
  currentUser,
  locations,
  onNavigateBack,
  onNavigateHome,
  onUploadFile
}) => {
  const [sandTypes, setSandTypes] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<GenericMaterialTransaction[]>([]);
  const [stockMetrics, setStockMetrics] = useState<CategoryStockMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<'stock_overview' | 'ledger_history'>('stock_overview');

  // Filters & display unit
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [displayUnit, setDisplayUnit] = useState<'cft' | 'm3' | 'brass' | 'tonnes'>('cft');

  // Transaction Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txSandType, setTxSandType] = useState('River Sand');
  const [customTypeInput, setCustomTypeInput] = useState('');
  const [txLocationId, setTxLocationId] = useState(locations[0]?.id || 'main-site');
  const [txDate, setTxDate] = useState(getLocalDateString());
  const [txType, setTxType] = useState<ExtendedTransactionType>('receipt');
  const [txQty, setTxQty] = useState('');
  const [inputUnit, setInputUnit] = useState<'cft' | 'm3' | 'brass' | 'tonnes'>('cft');
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

  // Admin Add Type
  const [isAddingType, setIsAddingType] = useState(false);
  const [newTypeInput, setNewTypeInput] = useState('');

  // Reversal
  const [reversalTarget, setReversalTarget] = useState<GenericMaterialTransaction | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isReversing, setIsReversing] = useState(false);

  const isCompleted = project.status === 'completed';
  const isAdmin = currentUser.role === 'admin';
  const isViewer = currentUser.role === 'management_viewer';
  const canRecord = !isViewer && (!isCompleted || isAdmin);

  const loadModuleData = async () => {
    const [types, txList, metrics] = await Promise.all([
      dataService.getSandTypes(),
      dataService.getGenericTransactions(project.id, 'sand'),
      dataService.calculateCategoryStock(project.id, 'sand')
    ]);
    setSandTypes(types);
    setTransactions(txList);
    setStockMetrics(metrics);
  };

  useEffect(() => {
    loadModuleData();
  }, [project.id]);

  const toCanonicalCft = (qty: number, unit: 'cft' | 'm3' | 'brass' | 'tonnes'): number => {
    if (unit === 'brass') return qty * 100;
    if (unit === 'm3') return qty * 35.3147;
    if (unit === 'tonnes') return qty * 22.0;
    return qty;
  };

  const formatFromCft = (cftValue: number) => {
    if (displayUnit === 'brass') {
      return (cftValue / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (displayUnit === 'm3') {
      return (cftValue / 35.3147).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (displayUnit === 'tonnes') {
      return (cftValue / 22.0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return Math.round(cftValue).toLocaleString();
  };

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

    let finalType = txSandType;
    if (txSandType === 'Other' && customTypeInput.trim()) {
      finalType = customTypeInput.trim();
    }

    const qtyCft = toCanonicalCft(qty, inputUnit);
    const loc = locations.find(l => l.id === txLocationId);
    if (!hasTransactionAttachments(attachments) && !window.confirm('No supporting documents or images have been attached. Select Cancel to upload files, or OK to Skip & Continue.')) return;

    try {
      setIsSubmitting(true);
      const saved = await dataService.recordGenericTransaction({
        projectId: project.id,
        locationId: txLocationId,
        locationName: loc ? loc.name : 'Main Sand Stockpile',
        category: 'sand',
        itemName: finalType,
        unit: 'cft',
        transactionDate: txDate,
        transactionType: txType,
        quantity: qtyCft,
        supplierName,
        invoiceNumber,
        challanNumber,
        remarks: remarks ? `${remarks} (Logged as ${qty} ${inputUnit})` : `Logged as ${qty} ${inputUnit}`,
        attachmentUrl: attachment?.url,
        attachmentName: attachment?.name,
        attachmentSize: attachment?.size,
        attachments
      });

      setSuccessSaved(saved);
      await loadModuleData();
    } catch (err: any) {
      setFormError(err.message || 'Transaction recording failed');
    } finally {
      setIsSubmitting(false);
    }
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
      if (typeFilter !== 'all' && item.item_name !== typeFilter) return false;
      if (search.trim()) {
        return item.item_name.toLowerCase().includes(search.toLowerCase().trim());
      }
      return true;
    });
  }, [stockMetrics, typeFilter, search]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-[#666666]">
        <button onClick={onNavigateHome} className="hover:text-[#111111] transition-colors">
          Company Home
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-[#888888]" />
        <button onClick={onNavigateBack} className="hover:text-[#111111] transition-colors truncate max-w-xs">
          {project.name}
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-[#888888]" />
        <span className="font-semibold text-[#111111]">Sand & M-Sand</span>
      </nav>

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E8E8] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFC400]" />
            <h1 className="text-2xl sm:text-[28px] font-bold text-[#111111] tracking-tight">
              Sand & M-Sand Inventory
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#666666] mt-0.5">
            Site: <strong className="text-[#111111] font-semibold">{project.name}</strong> &bull; Conversion Enabled (1 brass = 100 cft &bull; 1 m³ = 35.31 cft)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Unit Switcher */}
          <div className="bg-[#F7F7F7] border border-[#E8E8E8] p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => setDisplayUnit('cft')}
              className={`px-3 py-1 rounded-lg transition-all ${displayUnit === 'cft' ? 'bg-[#FFC400] text-[#111111]' : 'text-[#666666] hover:text-[#111111]'}`}
            >
              cft
            </button>
            <button
              onClick={() => setDisplayUnit('m3')}
              className={`px-3 py-1 rounded-lg transition-all ${displayUnit === 'm3' ? 'bg-[#FFC400] text-[#111111]' : 'text-[#666666] hover:text-[#111111]'}`}
            >
              m³
            </button>
            <button
              onClick={() => setDisplayUnit('brass')}
              className={`px-3 py-1 rounded-lg transition-all ${displayUnit === 'brass' ? 'bg-[#FFC400] text-[#111111]' : 'text-[#666666] hover:text-[#111111]'}`}
            >
              Brass
            </button>
            <button
              onClick={() => setDisplayUnit('tonnes')}
              className={`px-3 py-1 rounded-lg transition-all ${displayUnit === 'tonnes' ? 'bg-[#FFC400] text-[#111111]' : 'text-[#666666] hover:text-[#111111]'}`}
            >
              Tonnes
            </button>
          </div>

          <button
            onClick={() => {
              if (!stockMetrics) return;
              const csv = dataService.exportCategoryReportCsv(stockMetrics, transactions);
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Sand_Stock_Report_${project.code}.csv`;
              a.click();
            }}
            className="px-3 py-1.5 bg-white border border-[#E8E8E8] hover:bg-[#F7F7F7] text-[#111111] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
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
              className="px-4 py-2 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <PlusCircle className="w-4 h-4 text-[#111111]" />
              Record Transaction
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#111111] text-white p-5 rounded-2xl border border-[#222222] shadow-xs">
          <p className="text-xs font-medium text-[#AAAAAA]">Available Sand</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[28px] font-bold text-[#FFC400] font-mono tabular-nums">
              {formatFromCft(stockMetrics?.totalAvailableAggregate ?? 0)}
            </span>
            <span className="text-xs text-[#AAAAAA]">{displayUnit}</span>
          </div>
          <p className="text-[11px] text-[#888888] mt-2 font-mono">
            {filteredSummaries.length} tracked classifications
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E8E8] shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-[#666666]">
            <span>Total Delivered</span>
            <TrendingUp className="w-4 h-4 text-[#111111]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[28px] font-bold text-[#111111] font-mono tabular-nums">
              {formatFromCft(stockMetrics?.items.reduce((s, i) => s + i.total_received, 0) ?? 0)}
            </span>
            <span className="text-xs text-[#666666]">{displayUnit}</span>
          </div>
          <p className="text-[11px] text-[#666666] mt-2">Delivered to site</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E8E8] shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-[#666666]">
            <span>Consumed / Mixed</span>
            <TrendingDown className="w-4 h-4 text-[#111111]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[28px] font-bold text-[#111111] font-mono tabular-nums">
              {formatFromCft(stockMetrics?.items.reduce((s, i) => s + i.total_used, 0) ?? 0)}
            </span>
            <span className="text-xs text-[#666666]">{displayUnit}</span>
          </div>
          <p className="text-[11px] text-[#666666] mt-2">Concrete & plaster batching</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E8E8] shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-[#666666]">
            <span>Wasted / Rejected</span>
            <AlertOctagon className="w-4 h-4 text-[#111111]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[28px] font-bold text-[#111111] font-mono tabular-nums">
              {formatFromCft(stockMetrics?.items.reduce((s, i) => s + i.total_damaged, 0) ?? 0)}
            </span>
            <span className="text-xs text-[#666666]">{displayUnit}</span>
          </div>
          <p className="text-[11px] text-[#666666] mt-2">Contaminated or washed off</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-[#E8E8E8]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('stock_overview')}
            className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'stock_overview' ? 'border-[#FFC400] text-[#111111]' : 'border-transparent text-[#666666] hover:text-[#111111]'
            }`}
          >
            <Layers className="w-4 h-4" />
            Stock by Sand Classification
          </button>
          <button
            onClick={() => setActiveTab('ledger_history')}
            className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'ledger_history' ? 'border-[#FFC400] text-[#111111]' : 'border-transparent text-[#666666] hover:text-[#111111]'
            }`}
          >
            Transaction History ({transactions.length})
          </button>
        </div>

        {isAdmin && activeTab === 'stock_overview' && (
          <button
            onClick={() => setIsAddingType(!isAddingType)}
            className="text-xs font-semibold text-[#111111] hover:text-[#666666] pb-3 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Custom Sand Type
          </button>
        )}
      </div>

      {/* Admin Add Sand Type Form */}
      {isAddingType && (
        <div className="bg-white p-4 rounded-2xl border border-[#E8E8E8] flex items-center gap-3 shadow-xs animate-in fade-in">
          <input
            type="text"
            value={newTypeInput}
            onChange={(e) => setNewTypeInput(e.target.value)}
            placeholder="Enter custom sand classification (e.g. Fine White Silica Sand)"
            className="flex-1 text-xs px-3.5 py-2 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] focus:bg-white focus:outline-none focus:border-[#FFC400]"
          />
          <button
            onClick={async () => {
              if (!newTypeInput.trim()) return;
              await dataService.addSandType(newTypeInput.trim());
              setNewTypeInput('');
              setIsAddingType(false);
              await loadModuleData();
            }}
            className="px-4 py-2 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] font-semibold text-xs rounded-xl shadow-xs"
          >
            Save Sand Type
          </button>
          <button onClick={() => setIsAddingType(false)} className="text-xs text-[#666666]">Cancel</button>
        </div>
      )}

      {/* VIEW 1: STOCK BY SAND CLASSIFICATION */}
      {activeTab === 'stock_overview' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-2xl border border-[#E8E8E8] flex flex-wrap gap-3 items-center justify-between shadow-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-[#666666] absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sand type..."
                className="w-full text-xs pl-10 pr-4 py-2 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs py-2 px-3 rounded-xl border border-[#E8E8E8] bg-white text-[#111111] focus:outline-none focus:border-[#FFC400]"
              >
                <option value="all">All Classifications</option>
                {sandTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F7F7F7] border-b border-[#E8E8E8] text-[11px] font-semibold text-[#666666] uppercase tracking-wider">
                    <th className="py-3 px-4">Sand Classification</th>
                    <th className="py-3 px-4 text-right">Delivered ({displayUnit})</th>
                    <th className="py-3 px-4 text-right">Consumed ({displayUnit})</th>
                    <th className="py-3 px-4 text-right">Wasted ({displayUnit})</th>
                    <th className="py-3 px-4 text-right bg-[#FFC400]/10">Available ({displayUnit})</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E8E8]">
                  {filteredSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#666666]">
                        No sand stock found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredSummaries.map((item) => (
                      <tr key={item.key} className="hover:bg-[#F7F7F7] transition-colors">
                        <td className="py-3 px-4 font-semibold text-[#111111] text-sm">{item.item_name}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-[#111111]">
                          {formatFromCft(item.total_received)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-[#111111]">
                          {formatFromCft(item.total_used)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-[#111111]">
                          {formatFromCft(item.total_damaged)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-sm tabular-nums text-[#111111] bg-[#FFC400]/10">
                          {formatFromCft(item.available_stock)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {canRecord && (
                            <button
                              onClick={() => {
                                setTxSandType(item.item_name);
                                setIsModalOpen(true);
                              }}
                              className="px-3 py-1 text-xs font-semibold text-[#111111] bg-[#FFC400] hover:bg-[#F0B800] rounded-lg transition-colors shadow-xs"
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
        <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F7F7F7] border-b border-[#E8E8E8] text-[11px] font-semibold text-[#666666] uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Movement</th>
                  <th className="py-3 px-4 text-right">Quantity (cft)</th>
                  <th className="py-3 px-4 text-right bg-[#FFC400]/10">Running Stock</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Invoice / Challan</th>
                  <th className="py-3 px-4">Recorded By</th>
                  <th className="py-3 px-4 text-center">Document</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E8E8]">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-[#666666]">
                      No transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className={`hover:bg-[#F7F7F7] transition-colors ${tx.is_reversal ? 'line-through opacity-60' : ''}`}>
                      <td className="py-3 px-4 font-mono">{tx.transaction_date}</td>
                      <td className="py-3 px-4 font-semibold text-[#111111]">{tx.item_name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                          tx.transaction_type === 'receipt' ? 'bg-[#FFC400]/20 text-[#111111] border border-[#FFC400]/40' :
                          'bg-[#F7F7F7] text-[#111111] border border-[#E8E8E8]'
                        }`}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        {Math.round(tx.quantity).toLocaleString()} cft
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#111111] bg-[#FFC400]/10">
                        {tx.running_balance !== undefined ? `${Math.round(tx.running_balance).toLocaleString()} cft` : '—'}
                      </td>
                      <td className="py-3 px-4 text-[#666666]">{tx.supplier_name || '—'}</td>
                      <td className="py-3 px-4 font-mono text-[#666666]">{tx.invoice_number || tx.challan_number || '—'}</td>
                      <td className="py-3 px-4 text-[#111111]">{tx.created_by_name}</td>
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
                              className="text-[11px] text-[#666666] hover:text-[#111111] hover:underline font-semibold"
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
        <div className="fixed inset-0 z-50 bg-[#111111]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E8E8E8] max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E8E8E8] pb-3">
              <h3 className="font-bold text-base text-[#111111] flex items-center gap-2">
                <Mountain className="w-5 h-5 text-[#111111]" />
                Record Sand Movement
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#666666] hover:text-[#111111]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {successSaved ? (
              <div className="py-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-[#111111] mx-auto" />
                <h4 className="font-bold text-lg text-[#111111]">Sand Transaction Logged</h4>
                <p className="text-xs text-[#666666]">
                  Recorded {Math.round(successSaved.quantity)} cft of {successSaved.item_name}.
                </p>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSuccessSaved(null);
                  }}
                  className="px-5 py-2 bg-[#FFC400] text-[#111111] font-semibold text-xs rounded-xl shadow-xs"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecordSubmit} className="space-y-4 text-xs">
                {formError && (
                  <div className="p-2.5 bg-[#F7F7F7] border border-[#E8E8E8] text-[#111111] rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#111111] shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-[#111111] uppercase mb-1">Transaction Type</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTxType('receipt')}
                      className={`py-2 rounded-xl font-semibold border transition-colors ${txType === 'receipt' ? 'bg-[#FFC400] text-[#111111] border-[#FFC400]' : 'border-[#E8E8E8] text-[#666666]'}`}
                    >
                      + Material Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('usage')}
                      className={`py-2 rounded-xl font-semibold border transition-colors ${txType === 'usage' ? 'bg-[#FFC400] text-[#111111] border-[#FFC400]' : 'border-[#E8E8E8] text-[#666666]'}`}
                    >
                      - Batching Usage
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('damage')}
                      className={`py-2 rounded-xl font-semibold border transition-colors ${txType === 'damage' ? 'bg-[#FFC400] text-[#111111] border-[#FFC400]' : 'border-[#E8E8E8] text-[#666666]'}`}
                    >
                      - Wasted / Rejected
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#111111] uppercase mb-1">Sand Type</label>
                    <select
                      value={txSandType}
                      onChange={(e) => setTxSandType(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl border border-[#E8E8E8] bg-white text-[#111111] focus:outline-none focus:border-[#FFC400]"
                    >
                      {sandTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      <option value="Other">Other Classification</option>
                    </select>
                    {txSandType === 'Other' && (
                      <input
                        type="text"
                        placeholder="Enter type name"
                        value={customTypeInput}
                        onChange={(e) => setCustomTypeInput(e.target.value)}
                        className="mt-1.5 w-full py-2 px-3 rounded-xl border border-[#E8E8E8]"
                        required
                      />
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-[#111111] uppercase mb-1">Quantity & Input Unit</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        required
                        value={txQty}
                        onChange={(e) => setTxQty(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-full py-2 px-3 rounded-xl border border-[#E8E8E8] font-mono"
                      />
                      <select
                        value={inputUnit}
                        onChange={(e) => setInputUnit(e.target.value as any)}
                        className="py-2 px-3 rounded-xl border border-[#E8E8E8] bg-white font-semibold"
                      >
                        <option value="cft">cft</option>
                        <option value="m3">m³</option>
                        <option value="brass">Brass</option>
                        <option value="tonnes">Tonnes</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#111111] uppercase mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl border border-[#E8E8E8]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#111111] uppercase mb-1">Supplier / Quarry</label>
                    <input
                      type="text"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="e.g. Krishna River Quarry Sands"
                      className="w-full py-2 px-3 rounded-xl border border-[#E8E8E8]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#111111] uppercase mb-1">Invoice / Delivery Challan #</label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="e.g. DC-SAND-4412"
                      className="w-full py-2 px-3 rounded-xl border border-[#E8E8E8] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#111111] uppercase mb-1">Vehicle / Tipper #</label>
                    <input
                      type="text"
                      value={challanNumber}
                      onChange={(e) => setChallanNumber(e.target.value)}
                      placeholder="e.g. KA-04-AB-1234"
                      className="w-full py-2 px-3 rounded-xl border border-[#E8E8E8]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#111111] uppercase mb-1">Remarks</label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Washed plastering sand batch delivered for Tower A"
                    className="w-full py-2 px-3 rounded-xl border border-[#E8E8E8]"
                  />
                </div>

                <AttachmentSections value={attachments} onChange={setAttachments} onUploadFile={onUploadFile} />

                <div className="pt-3 border-t border-[#E8E8E8] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-[#666666] hover:bg-[#F7F7F7] font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] font-semibold rounded-xl shadow-xs"
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
        <div className="fixed inset-0 z-50 bg-[#111111]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-[#E8E8E8]">
            <h3 className="font-bold text-base text-[#111111] flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-[#111111]" />
              Reverse Sand Movement
            </h3>
            <p className="text-xs text-[#666666]">
              Reverse {Math.round(reversalTarget.quantity)} cft of {reversalTarget.item_name}. An offsetting entry will be written.
            </p>
            <form onSubmit={handleReversalSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#111111] uppercase mb-1">Audited Reason *</label>
                <textarea
                  required
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Tipper load returned due to silt contamination."
                  className="w-full p-2.5 border border-[#E8E8E8] rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setReversalTarget(null)} className="px-3 py-1.5 rounded-xl text-[#666666]">Cancel</button>
                <button type="submit" disabled={isReversing} className="px-4 py-1.5 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] font-semibold rounded-xl">
                  {isReversing ? 'Reversing...' : 'Commit Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
