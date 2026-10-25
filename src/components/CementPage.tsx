import React, { useState } from 'react';
import {
  Package,
  PlusCircle,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  AlertOctagon,
  Layers,
  History,
  Lock,
  Plus,
  Search,
  CheckCircle2
} from 'lucide-react';
import {
  Project,
  CementBrand,
  MaterialLocation,
  MaterialTransaction,
  ProjectStockMetrics,
  UserProfile,
  TransactionType
} from '../types';
import { CementTransactionModal } from './CementTransactionModal';
import { CementLedgerTable } from './CementLedgerTable';
import { StockSummaryArtwork } from './StockSummaryArtwork';

interface CementPageProps {
  project: Project;
  currentUser: UserProfile;
  brands: CementBrand[];
  locations: MaterialLocation[];
  transactions: MaterialTransaction[];
  stockMetrics: ProjectStockMetrics | null;
  onNavigateBack: () => void;
  onNavigateHome: () => void;
  onSaveTransaction: (txData: {
    projectId: string;
    locationId: string;
    locationName: string;
    brandId: string;
    brandName: string;
    transactionDate: string;
    transactionType: TransactionType;
    quantityBags: number;
    supplierName?: string;
    invoiceNumber?: string;
    challanNumber?: string;
    remarks?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentSize?: number;
  }) => Promise<MaterialTransaction>;
  onUploadFile: (file: File) => Promise<{ url: string; name: string; size: number }>;
  onReverseTransaction: (txId: string, reason: string) => Promise<void>;
  onAddBrand: (brandName: string) => Promise<CementBrand>;
}

export const CementPage: React.FC<CementPageProps> = ({
  project,
  currentUser,
  brands,
  locations,
  transactions,
  stockMetrics,
  onNavigateBack,
  onNavigateHome,
  onSaveTransaction,
  onUploadFile,
  onReverseTransaction,
  onAddBrand
}) => {
  const [activeTab, setActiveTab] = useState<'brands_view' | 'ledger_history'>('brands_view');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBrandForModal, setSelectedBrandForModal] = useState<string | undefined>(undefined);
  const [brandSearch, setBrandSearch] = useState('');

  // Admin add brand state
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [addBrandError, setAddBrandError] = useState<string | null>(null);

  const isCompleted = project.status === 'completed';
  const isAdmin = currentUser.role === 'admin';
  const isViewer = currentUser.role === 'management_viewer';

  const canRecord = !isViewer && (!isCompleted || isAdmin);

  const handleOpenModal = (brandId?: string) => {
    setSelectedBrandForModal(brandId);
    setIsModalOpen(true);
  };

  const handleAddBrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;

    try {
      setAddBrandError(null);
      await onAddBrand(newBrandName.trim());
      setNewBrandName('');
      setIsAddingBrand(false);
    } catch (err: any) {
      setAddBrandError(err.message || 'Failed to add brand');
    }
  };

  const filteredBrandSummaries = (stockMetrics?.brandSummaries || []).filter(b =>
    b.brand_name.toLowerCase().includes(brandSearch.toLowerCase().trim())
  );

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
        <span className="font-semibold text-bp-text">Cement Inventory</span>
      </nav>

      {/* Top Header Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-bp-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-bp-cyan" />
            <h1 className="text-2xl sm:text-[28px] font-bold text-bp-text tracking-tight">
              Cement Inventory
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-bp-muted mt-0.5">
            Site: <strong className="text-bp-text font-semibold">{project.name}</strong> ({project.code}) &bull; {project.location}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {canRecord && (
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 bg-bp-cyan hover:bg-bp-blue text-bp-text text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-bp-text" />
              Record Transaction
            </button>
          )}

          {isCompleted && (
            <span className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-bp-background text-bp-text border border-bp-border flex items-center gap-1">
              <Lock className="w-3 h-3 text-bp-text" />
              Completed Project (Read-Only)
            </span>
          )}
        </div>
      </div>

      {/* SUMMARY KPI STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        {/* Available Stock */}
        <div className="relative isolate bg-bp-navy text-white p-5 rounded-2xl border border-bp-navy-border shadow-xs">
          <StockSummaryArtwork material="cement" kind="available" dark />
          <p className="text-xs font-medium text-bp-border-strong">Available Stock</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[28px] font-bold text-bp-cyan font-mono tabular-nums">
              {stockMetrics?.totalAvailableBags.toLocaleString() ?? 0}
            </span>
            <span className="text-xs text-bp-border-strong font-normal">Bags</span>
          </div>
          <p className="text-[11px] text-bp-muted mt-2 font-mono">
            {stockMetrics?.activeBrandsCount ?? 0} active brands
          </p>
        </div>

        {/* Total Received */}
        <div className="relative isolate bg-white p-5 rounded-2xl border border-bp-border shadow-xs">
          <StockSummaryArtwork material="cement" kind="received" />
          <div className="flex items-center justify-between text-xs font-medium text-bp-muted">
            <span>Total Received</span>
            <TrendingUp className="w-4 h-4 text-bp-text" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[28px] font-bold text-bp-text font-mono tabular-nums">
              {stockMetrics?.totalReceivedBags.toLocaleString() ?? 0}
            </span>
            <span className="text-xs text-bp-muted">Bags</span>
          </div>
          <p className="text-[11px] text-bp-muted mt-2">Opening stock + deliveries</p>
        </div>

        {/* Total Used */}
        <div className="relative isolate bg-white p-5 rounded-2xl border border-bp-border shadow-xs">
          <StockSummaryArtwork material="cement" kind="used" />
          <div className="flex items-center justify-between text-xs font-medium text-bp-muted">
            <span>Total Used</span>
            <TrendingDown className="w-4 h-4 text-bp-text" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[28px] font-bold text-bp-text font-mono tabular-nums">
              {stockMetrics?.totalUsedBags.toLocaleString() ?? 0}
            </span>
            <span className="text-xs text-bp-muted">Bags</span>
          </div>
          <p className="text-[11px] text-bp-muted mt-2">Concrete & masonry</p>
        </div>

        {/* Total Damaged */}
        <div className="relative isolate bg-white p-5 rounded-2xl border border-bp-border shadow-xs">
          <StockSummaryArtwork material="cement" kind="damaged" />
          <div className="flex items-center justify-between text-xs font-medium text-bp-muted">
            <span>Total Damaged</span>
            <AlertOctagon className="w-4 h-4 text-bp-text" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[28px] font-bold text-bp-text font-mono tabular-nums">
              {stockMetrics?.totalDamagedBags.toLocaleString() ?? 0}
            </span>
            <span className="text-xs text-bp-muted">Bags</span>
          </div>
          <p className="text-[11px] text-bp-muted mt-2">Lumped or torn bags</p>
        </div>

      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-bp-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('brands_view')}
            className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'brands_view'
                ? 'border-bp-cyan text-bp-text'
                : 'border-transparent text-bp-muted hover:text-bp-text'
            }`}
          >
            <Layers className="w-4 h-4" />
            Brands Stock Overview
          </button>
          <button
            onClick={() => setActiveTab('ledger_history')}
            className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'ledger_history'
                ? 'border-bp-cyan text-bp-text'
                : 'border-transparent text-bp-muted hover:text-bp-text'
            }`}
          >
            <History className="w-4 h-4" />
            Transaction Ledger ({transactions.length})
          </button>
        </div>

        {activeTab === 'brands_view' && isAdmin && (
          <button
            onClick={() => setIsAddingBrand(!isAddingBrand)}
            className="text-xs font-semibold text-bp-text hover:text-bp-muted pb-3 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Custom Brand
          </button>
        )}
      </div>

      {/* Admin Add Brand Drawer/Form */}
      {isAddingBrand && (
        <form onSubmit={handleAddBrandSubmit} className="bg-white border border-bp-border p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-xs animate-in fade-in">
          <div className="flex-1 w-full">
            <label className="block text-[11px] font-semibold text-bp-text uppercase mb-1">
              Add New Cement Brand
            </label>
            <input
              type="text"
              required
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              placeholder="e.g. Shree Cement / Bangur Cement"
              className="w-full text-xs px-3.5 py-2 rounded-xl border border-bp-border bg-bp-background focus:bg-white focus:outline-none focus:border-bp-cyan focus:ring-1 focus:ring-bp-cyan"
            />
            {addBrandError && <p className="text-[11px] text-bp-muted mt-1">{addBrandError}</p>}
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto mt-2 sm:mt-5">
            <button
              type="submit"
              className="px-4 py-2 bg-bp-cyan hover:bg-bp-blue text-bp-text font-semibold text-xs rounded-xl transition-colors shadow-xs"
            >
              Add Brand
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingBrand(false);
                setNewBrandName('');
                setAddBrandError(null);
              }}
              className="px-3 py-2 text-xs text-bp-muted hover:bg-bp-background rounded-xl"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* CONTENT TAB 1: BRANDS OVERVIEW */}
      {activeTab === 'brands_view' ? (
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-bp-border shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-bp-muted absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                placeholder="Filter by brand name (e.g. UltraTech, Dalmia, Ramco)..."
                className="w-full text-xs pl-10 pr-4 py-2 rounded-xl border border-bp-border bg-bp-background focus:bg-white focus:outline-none focus:border-bp-cyan focus:ring-1 focus:ring-bp-cyan"
              />
            </div>
            <div className="text-xs text-bp-muted">
              Showing {filteredBrandSummaries.length} tracked cement brands
            </div>
          </div>

          {/* Numbered Brand List */}
          <div className="bg-white rounded-2xl border border-bp-border overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bp-background border-b border-bp-border text-[11px] font-semibold text-bp-muted uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Cement Brand</th>
                    <th className="py-3 px-4 text-right">Received</th>
                    <th className="py-3 px-4 text-right">Used</th>
                    <th className="py-3 px-4 text-right">Damaged</th>
                    <th className="py-3 px-4 text-right bg-bp-cyan/10">Available Stock</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs">
                  {filteredBrandSummaries.map((summary, idx) => {
                    const isAvailable = summary.available_stock > 0;
                    return (
                      <tr key={summary.brand_id} className="hover:bg-bp-background transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-bp-muted font-mono">
                          {(idx + 1).toString().padStart(2, '0')}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-bp-text text-sm">
                            {summary.brand_name}
                          </div>
                          {summary.opening_stock > 0 && (
                            <div className="text-[10px] text-bp-muted font-mono">
                              Opening: {summary.opening_stock} bags
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-bp-text">
                          {summary.total_received > 0 ? `${summary.total_received} bags` : '0'}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-bp-text">
                          {summary.total_used > 0 ? `${summary.total_used} bags` : '0'}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-bp-text">
                          {summary.total_damaged > 0 ? `${summary.total_damaged} bags` : '0'}
                        </td>

                        <td className={`py-3 px-4 text-right font-mono font-bold text-sm tabular-nums bg-bp-cyan/10 ${
                          isAvailable ? 'text-bp-text' : 'text-bp-muted'
                        }`}>
                          {summary.available_stock.toLocaleString()} bags
                        </td>

                        <td className="py-3 px-4 text-center">
                          {canRecord ? (
                            <button
                              onClick={() => handleOpenModal(summary.brand_id)}
                              className="px-3 py-1 text-xs font-semibold text-bp-text bg-bp-cyan hover:bg-bp-blue rounded-lg transition-colors shadow-xs"
                            >
                              + Move
                            </button>
                          ) : (
                            <span className="text-bp-muted text-[11px]">Locked</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 bg-bp-background border-t border-bp-border text-xs text-bp-muted flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-bp-muted">
                Available = Opening + Receipts - Returns - Usage - Damaged
              </span>
              <span className="text-[11px] font-medium text-bp-text">
                Negative stock balance strictly prevented.
              </span>
            </div>
          </div>

        </div>
      ) : (
        /* CONTENT TAB 2: DETAILED MATERIAL TRANSACTION LEDGER */
        <CementLedgerTable
          transactions={transactions}
          brands={brands}
          currentUser={currentUser}
          onReverseTransaction={onReverseTransaction}
        />
      )}

      {/* CEMENT TRANSACTION MODAL */}
      <CementTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        project={project}
        brands={brands}
        locations={locations}
        currentUser={currentUser}
        stockMetrics={stockMetrics}
        preselectedBrandId={selectedBrandForModal}
        onSaveTransaction={onSaveTransaction}
        onUploadFile={onUploadFile}
      />

    </div>
  );
};
