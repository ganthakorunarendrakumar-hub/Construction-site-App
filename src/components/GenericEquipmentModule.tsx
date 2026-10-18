import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  ShieldAlert,
  Ruler,
  Hammer,
  Crosshair,
  Grid,
  Zap,
  Cpu,
  Droplet,
  Package,
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
  ArrowRight,
  Flame,
  Paintbrush,
  Edit,
  PackageCheck,
  DoorOpen,
  Umbrella,
  Compass,
  Truck,
  Boxes,
  Sparkles,
  Calendar,
  Filter,
  Check,
  Building,
  Info,
  ClipboardList
} from 'lucide-react';
import {
  Project,
  MaterialLocation,
  UserProfile,
  GenericMaterialTransaction,
  CategoryStockMetrics,
  ExtendedTransactionType,
  MaterialItem,
  MaterialCategoryDef
} from '../types';
import { dataService } from '../services/dataService';

interface GenericEquipmentModuleProps {
  categoryId: string;
  project: Project;
  currentUser: UserProfile;
  locations: MaterialLocation[];
  onNavigateBack: () => void;
  onNavigateHome: () => void;
  onUploadFile: (file: File) => Promise<{ url: string; name: string; size: number }>;
}

export const GenericEquipmentModule: React.FC<GenericEquipmentModuleProps> = ({
  categoryId,
  project,
  currentUser,
  locations,
  onNavigateBack,
  onNavigateHome,
  onUploadFile
}) => {
  const [categoryDef, setCategoryDef] = useState<MaterialCategoryDef | null>(null);
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [transactions, setTransactions] = useState<GenericMaterialTransaction[]>([]);
  const [stockMetrics, setStockMetrics] = useState<CategoryStockMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'ledger'>('inventory');

  // Filters for Inventory Tab
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');

  // Filters for Ledger Tab
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>('all');
  const [ledgerStartDate, setLedgerStartDate] = useState('');
  const [ledgerEndDate, setLedgerEndDate] = useState('');

  // Transaction Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItemName, setSelectedItemName] = useState('');
  const [txLocationId, setTxLocationId] = useState(locations[0]?.id || 'main-site');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txType, setTxType] = useState<ExtendedTransactionType>('receipt');
  const [txQty, setTxQty] = useState('10');
  const [txUnit, setTxUnit] = useState('Nos');
  const [txCondition, setTxCondition] = useState<'good' | 'fair' | 'damaged' | 'maintenance'>('good');
  const [issuedToCrew, setIssuedToCrew] = useState('');
  const [partyName, setPartyName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [challanNumber, setChallanNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [attachment, setAttachment] = useState<{ url: string; name: string; size: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successSaved, setSuccessSaved] = useState<GenericMaterialTransaction | null>(null);

  // Admin Add Item Modal State
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('Nos');
  const [newItemMinStock, setNewItemMinStock] = useState('5');
  const [newItemSpec, setNewItemSpec] = useState('');
  const [newItemBrand, setNewItemBrand] = useState('');
  const [isAddingItemSaving, setIsAddingItemSaving] = useState(false);

  // Edit Material Details Modal State
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MaterialItem | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemUnit, setEditItemUnit] = useState('Nos');
  const [editItemMinStock, setEditItemMinStock] = useState('5');
  const [editItemSpec, setEditItemSpec] = useState('');
  const [editItemBrand, setEditItemBrand] = useState('');
  const [editItemReusable, setEditItemReusable] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Reversal
  const [reversalTarget, setReversalTarget] = useState<GenericMaterialTransaction | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isReversing, setIsReversing] = useState(false);

  const isCompleted = project.status === 'completed';
  const isAdmin = currentUser.role === 'admin';
  const isPM = currentUser.role === 'project_manager';
  const isViewer = currentUser.role === 'management_viewer';
  const canRecord = !isViewer && (!isCompleted || isAdmin);
  const canEditItem = isAdmin || isPM;

  const loadData = async () => {
    try {
      const [allCats, catItems, txList, metrics] = await Promise.all([
        dataService.getCategories(),
        dataService.getCategoryItems(categoryId),
        dataService.getGenericTransactions(project.id, categoryId),
        dataService.calculateCategoryStock(project.id, categoryId)
      ]);

      const curCat = allCats.find((c: MaterialCategoryDef) => c.id === categoryId);
      setCategoryDef(curCat || {
        id: categoryId,
        name: categoryId.replace(/_/g, ' ').toUpperCase(),
        description: '',
        iconName: 'Package',
        is_core: false,
        default_unit: 'Nos',
        is_reusable: false,
        allowed_units: ['Nos', 'Sets', 'Rolls', 'kg', 'Meters']
      });

      setItems(catItems);
      setTransactions(txList);
      setStockMetrics(metrics);

      if (catItems.length > 0 && !selectedItemName) {
        setSelectedItemName(catItems[0].name);
        setTxUnit(catItems[0].default_unit);
      }
    } catch (err) {
      console.error('Failed to load category module data', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryId, project.id]);

  const isReusable = categoryDef?.is_reusable || false;

  const subcategories = useMemo(() => {
    const subs = new Set<string>();
    items.forEach(i => {
      if (i.subcategory) subs.add(i.subcategory);
    });
    stockMetrics?.items.forEach(i => {
      if (i.subcategory) subs.add(i.subcategory);
    });
    return Array.from(subs);
  }, [items, stockMetrics]);

  const filteredItems = useMemo(() => {
    if (!stockMetrics) return [];
    let list = [...stockMetrics.items];

    if (selectedSubcategory !== 'all') {
      list = list.filter(i => (i.subcategory || 'General') === selectedSubcategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(i =>
        i.item_name.toLowerCase().includes(q) ||
        (i.subcategory && i.subcategory.toLowerCase().includes(q)) ||
        (i.brand_name && i.brand_name.toLowerCase().includes(q))
      );
    }

    if (lowStockOnly) {
      list = list.filter(i => i.is_low_stock);
    }

    return list;
  }, [stockMetrics, selectedSubcategory, search, lowStockOnly]);

  const filteredTransactions = useMemo(() => {
    let list = [...transactions];

    if (ledgerTypeFilter !== 'all') {
      list = list.filter(t => t.transaction_type === ledgerTypeFilter);
    }

    if (ledgerStartDate) {
      list = list.filter(t => t.transaction_date >= ledgerStartDate);
    }

    if (ledgerEndDate) {
      list = list.filter(t => t.transaction_date <= ledgerEndDate);
    }

    if (ledgerSearch.trim()) {
      const q = ledgerSearch.toLowerCase().trim();
      list = list.filter(t =>
        t.item_name.toLowerCase().includes(q) ||
        (t.supplier_name && t.supplier_name.toLowerCase().includes(q)) ||
        (t.issued_to && t.issued_to.toLowerCase().includes(q)) ||
        (t.invoice_number && t.invoice_number.toLowerCase().includes(q)) ||
        (t.challan_number && t.challan_number.toLowerCase().includes(q)) ||
        t.created_by_name.toLowerCase().includes(q) ||
        (t.remarks && t.remarks.toLowerCase().includes(q))
      );
    }

    return list;
  }, [transactions, ledgerTypeFilter, ledgerStartDate, ledgerEndDate, ledgerSearch]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const res = await onUploadFile(file);
      setAttachment(res);
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

    if (!selectedItemName) {
      setFormError('Please select a material item.');
      return;
    }

    const currentItemStock = stockMetrics?.items.find(i => i.item_name === selectedItemName);
    const available = currentItemStock ? currentItemStock.available_stock : 0;

    if (txType === 'usage' || txType === 'issue' || txType === 'damage') {
      if (qty > available) {
        setFormError(`Insufficient stock: Only ${available} ${txUnit} of ${selectedItemName} currently available.`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const loc = locations.find(l => l.id === txLocationId);
      const selectedItemDef = items.find(i => i.name === selectedItemName);
      const isItemReusable = selectedItemDef?.is_reusable ?? isReusable;

      const saved = await dataService.recordGenericTransaction({
        projectId: project.id,
        locationId: txLocationId,
        locationName: loc ? loc.name : 'Main Site',
        category: categoryId as any,
        subcategory: currentItemStock?.subcategory || selectedItemDef?.subcategory,
        itemName: selectedItemName,
        transactionType: txType,
        quantity: qty,
        unit: txUnit,
        transactionDate: txDate,
        issued_to: isItemReusable ? (issuedToCrew.trim() || undefined) : undefined,
        equipment_condition: isItemReusable ? txCondition : undefined,
        supplierName: partyName.trim() || undefined,
        invoiceNumber: invoiceNumber.trim() || undefined,
        challanNumber: challanNumber.trim() || undefined,
        remarks: remarks.trim() || undefined,
        attachmentUrl: attachment?.url,
        attachmentName: attachment?.name,
        attachmentSize: attachment?.size
      });

      setSuccessSaved(saved);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      setIsAddingItemSaving(true);
      await dataService.addCategoryItem({
        categoryId,
        name: newItemName.trim(),
        defaultUnit: newItemUnit,
        minStock: parseInt(newItemMinStock, 10) || 5,
        specification: newItemSpec.trim() || undefined,
        brand: newItemBrand.trim() || undefined
      });

      setNewItemName('');
      setNewItemSpec('');
      setNewItemBrand('');
      setIsAddItemOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to add item');
    } finally {
      setIsAddingItemSaving(false);
    }
  };

  const handleOpenEditItem = (itemSummary: { item_id?: string; item_name: string; unit: string; min_stock_alert?: number; brand_name?: string; is_reusable?: boolean }) => {
    const existing = items.find(i => i.id === itemSummary.item_id || i.name === itemSummary.item_name);
    const itemToEdit: MaterialItem = existing || {
      id: itemSummary.item_id || `temp-${Math.random().toString(36).substring(2, 7)}`,
      category_id: categoryId,
      name: itemSummary.item_name,
      code: '',
      default_unit: itemSummary.unit,
      supported_units: [itemSummary.unit],
      min_stock_alert: itemSummary.min_stock_alert || 5,
      is_reusable: itemSummary.is_reusable || false,
      brand: itemSummary.brand_name
    };
    setEditingItem(itemToEdit);
    setEditItemName(itemToEdit.name);
    setEditItemUnit(itemToEdit.default_unit);
    setEditItemMinStock(itemToEdit.min_stock_alert?.toString() || '5');
    setEditItemSpec(itemToEdit.specification || '');
    setEditItemBrand(itemToEdit.brand || (itemToEdit as any).brand_name || '');
    setEditItemReusable(itemToEdit.is_reusable || false);
    setEditError(null);
    setIsEditItemOpen(true);
  };

  const handleEditItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setEditError(null);

    if (!editItemName.trim()) {
      setEditError('Material name is required.');
      return;
    }

    try {
      setIsEditSaving(true);
      await dataService.updateCategoryItem({
        id: editingItem.id,
        categoryId,
        name: editItemName.trim(),
        defaultUnit: editItemUnit,
        minStock: parseInt(editItemMinStock, 10) || 5,
        specification: editItemSpec.trim() || undefined,
        brand: editItemBrand.trim() || undefined,
        isReusable: editItemReusable
      });

      setIsEditItemOpen(false);
      setEditingItem(null);
      await loadData();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update material item');
    } finally {
      setIsEditSaving(false);
    }
  };

  const handleReversalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTarget || !reversalReason.trim()) return;

    try {
      setIsReversing(true);
      await dataService.reverseGenericTransaction(
        reversalTarget.id,
        reversalReason.trim()
      );
      setReversalTarget(null);
      setReversalReason('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to reverse transaction');
    } finally {
      setIsReversing(false);
    }
  };

  const getCategoryIcon = (iconName?: string) => {
    switch (iconName) {
      case 'ShieldAlert': return <ShieldAlert className="w-5 h-5 text-[#111111]" />;
      case 'Wrench': return <Wrench className="w-5 h-5 text-[#111111]" />;
      case 'Ruler': return <Ruler className="w-5 h-5 text-[#111111]" />;
      case 'Hammer': return <Hammer className="w-5 h-5 text-[#111111]" />;
      case 'Crosshair': return <Crosshair className="w-5 h-5 text-[#111111]" />;
      case 'Grid': return <Grid className="w-5 h-5 text-[#111111]" />;
      case 'Zap': return <Zap className="w-5 h-5 text-[#111111]" />;
      case 'Cpu': return <Cpu className="w-5 h-5 text-[#111111]" />;
      case 'Droplet': return <Droplet className="w-5 h-5 text-[#111111]" />;
      case 'Flame': return <Flame className="w-5 h-5 text-[#111111]" />;
      case 'Paintbrush': return <Paintbrush className="w-5 h-5 text-[#111111]" />;
      case 'PackageCheck': return <PackageCheck className="w-5 h-5 text-[#111111]" />;
      case 'Boxes': return <Boxes className="w-5 h-5 text-[#111111]" />;
      case 'DoorOpen': return <DoorOpen className="w-5 h-5 text-[#111111]" />;
      case 'Umbrella': return <Umbrella className="w-5 h-5 text-[#111111]" />;
      case 'Sparkles': return <Sparkles className="w-5 h-5 text-[#111111]" />;
      case 'Compass': return <Compass className="w-5 h-5 text-[#111111]" />;
      case 'Truck': return <Truck className="w-5 h-5 text-[#111111]" />;
      case 'ClipboardList': return <ClipboardList className="w-5 h-5 text-[#111111]" />;
      default: return <Package className="w-5 h-5 text-[#111111]" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-[#666666]">
        <button onClick={onNavigateHome} className="hover:text-[#111111] transition-colors">
          Company Home
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-[#888888]" />
        <button onClick={onNavigateBack} className="hover:text-[#111111] transition-colors truncate max-w-xs">
          {project.name}
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-[#888888]" />
        <span className="font-semibold text-[#111111]">{categoryDef?.name || categoryId}</span>
      </nav>

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E8E8] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#FFC400] flex items-center justify-center shrink-0 shadow-xs">
            {getCategoryIcon(categoryDef?.iconName)}
          </div>
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-[#111111] tracking-tight">
              {categoryDef?.name}
            </h1>
            <p className="text-xs text-[#666666] mt-0.5">
              Site: <strong className="text-[#111111] font-semibold">{project.name}</strong> &bull; {isReusable ? 'Reusable Equipment & Tool Logistics' : 'Consumables & Material Inventory'}
            </p>
          </div>
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
              a.download = `${categoryId}_Stock_Report_${project.code}.csv`;
              a.click();
            }}
            className="px-3.5 py-2 bg-white border border-[#E8E8E8] hover:bg-[#F7F7F7] text-[#111111] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          {(isAdmin || isPM) && (
            <button
              onClick={() => setIsAddItemOpen(true)}
              className="px-3.5 py-2 bg-white hover:bg-[#F7F7F7] text-[#111111] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-[#E8E8E8] shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Material Item
            </button>
          )}

          {canRecord && (
            <button
              onClick={() => {
                setSuccessSaved(null);
                setFormError(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <PlusCircle className="w-4 h-4 text-[#111111]" />
              Record Stock Movement
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#111111] text-white p-5 rounded-2xl border border-[#222222] shadow-xs">
          <p className="text-xs font-medium text-[#AAAAAA]">
            {isReusable ? 'Available in Yard' : 'Live Available Stock'}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[28px] font-bold text-[#FFC400] font-mono tabular-nums">
              {stockMetrics?.totalAvailableAggregate.toLocaleString() ?? 0}
            </span>
            <span className="text-xs text-[#AAAAAA]">{categoryDef?.default_unit || 'Units'}</span>
          </div>
          <p className="text-[11px] text-[#888888] mt-2 font-mono">
            {stockMetrics?.totalItemsCount ?? 0} catalogued materials
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E8E8] shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-[#666666]">
            <span>Total Delivered</span>
            <TrendingUp className="w-4 h-4 text-[#111111]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[28px] font-bold text-[#111111] font-mono tabular-nums">
              {stockMetrics?.items.reduce((s, i) => s + i.total_received, 0).toLocaleString() ?? 0}
            </span>
            <span className="text-xs text-[#666666]">{categoryDef?.default_unit || 'Units'}</span>
          </div>
          <p className="text-[11px] text-[#666666] mt-2">Delivered to site</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E8E8] shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-[#666666]">
            <span>{isReusable ? 'Currently Issued on Site' : 'Total Consumed / Used'}</span>
            <TrendingDown className="w-4 h-4 text-[#111111]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[28px] font-bold text-[#111111] font-mono tabular-nums">
              {isReusable
                ? (stockMetrics?.items.reduce((s, i) => s + (i.in_use_stock || 0), 0).toLocaleString() ?? 0)
                : (stockMetrics?.items.reduce((s, i) => s + i.total_used, 0).toLocaleString() ?? 0)}
            </span>
            <span className="text-xs text-[#666666]">{categoryDef?.default_unit || 'Units'}</span>
          </div>
          <p className="text-[11px] text-[#666666] mt-2">{isReusable ? 'Checked out to work zones' : 'Used on site'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E8E8] shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-[#666666]">
            <span>{isReusable ? 'Under Repair' : 'Damaged / Scrap'}</span>
            <AlertOctagon className="w-4 h-4 text-[#111111]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[28px] font-bold text-[#111111] font-mono tabular-nums">
              {stockMetrics?.items.reduce((s, i) => s + i.total_damaged, 0).toLocaleString() ?? 0}
            </span>
            <span className="text-xs text-[#666666]">{categoryDef?.default_unit || 'Units'}</span>
          </div>
          <p className="text-[11px] text-[#666666] mt-2">Deducted from available stock</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-[#E8E8E8]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'inventory' ? 'border-[#FFC400] text-[#111111]' : 'border-transparent text-[#666666] hover:text-[#111111]'
            }`}
          >
            <Layers className="w-4 h-4" />
            Item Stock & Availability ({filteredItems.length})
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'ledger' ? 'border-[#FFC400] text-[#111111]' : 'border-transparent text-[#666666] hover:text-[#111111]'
            }`}
          >
            Transaction History ({transactions.length})
          </button>
        </div>

        <div className="flex items-center gap-2 pb-2">
          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
              lowStockOnly
                ? 'bg-[#111111] text-white border-[#111111]'
                : 'bg-white text-[#666666] border-[#E8E8E8] hover:text-[#111111]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock Alerts {stockMetrics && stockMetrics.lowStockItemsCount > 0 ? `(${stockMetrics.lowStockItemsCount})` : ''}
          </button>
        </div>
      </div>

      {/* VIEW 1: INVENTORY ITEMS TABLE */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Subcategories Filter Chips */}
          {subcategories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedSubcategory('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedSubcategory === 'all'
                    ? 'bg-[#111111] text-[#FFC400] shadow-xs'
                    : 'bg-white text-[#666666] border border-[#E8E8E8] hover:text-[#111111]'
                }`}
              >
                All Materials ({stockMetrics?.items.length ?? items.length})
              </button>
              {subcategories.map(sub => {
                const count = stockMetrics?.items.filter(i => (i.subcategory || 'General') === sub).length || items.filter(i => (i.subcategory || 'General') === sub).length;
                return (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubcategory(sub)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedSubcategory === sub
                        ? 'bg-[#FFC400] text-[#111111] shadow-xs font-bold'
                        : 'bg-white text-[#666666] border border-[#E8E8E8] hover:text-[#111111]'
                    }`}
                  >
                    {sub} ({count})
                  </button>
                );
              })}
            </div>
          )}

          <div className="bg-white p-4 rounded-2xl border border-[#E8E8E8] flex gap-3 items-center shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#666666] absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${categoryDef?.name.toLowerCase()} materials and equipment...`}
                className="w-full text-xs pl-10 pr-4 py-2 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400]"
              />
            </div>
            <span className="text-xs text-[#666666] shrink-0 font-medium">
              Showing {filteredItems.length} items
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F7F7F7] border-b border-[#E8E8E8] text-[11px] font-semibold text-[#666666] uppercase tracking-wider">
                    <th className="py-3 px-4">Material / Item</th>
                    <th className="py-3 px-4">Subcategory</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4 text-right">Delivered (In)</th>
                    <th className="py-3 px-4 text-right">In Use / Consumed</th>
                    <th className="py-3 px-4 text-right">Damaged / Maint.</th>
                    <th className="py-3 px-4 text-right bg-[#FFC400]/10 font-bold text-[#111111]">
                      Available Stock
                    </th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E8E8]">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[#666666]">
                        No materials found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.key} className="hover:bg-[#F7F7F7] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#111111]">{item.item_name}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded border font-medium ${
                              item.is_reusable
                                ? 'bg-[#F7F7F7] text-[#111111] border-[#E8E8E8]'
                                : 'bg-white text-[#666666] border-[#E8E8E8]'
                            }`}>
                              {item.is_reusable ? 'Reusable Tool' : 'Consumable'}
                            </span>
                          </div>
                          {item.brand_name && (
                            <span className="text-[11px] text-[#666666] font-normal block">Brand: {item.brand_name}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#F7F7F7] text-[#666666] border border-[#E8E8E8] font-medium whitespace-nowrap">
                            {item.subcategory || 'General'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[#666666]">{item.unit}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-[#111111]">
                          {item.total_received.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-[#111111]">
                          {item.is_reusable ? (item.in_use_stock || 0).toLocaleString() : item.total_used.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-[#666666]">
                          {item.total_damaged.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-sm tabular-nums text-[#111111] bg-[#FFC400]/10">
                          {item.available_stock.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.is_low_stock ? (
                            <span className="px-2 py-0.5 rounded-md bg-[#111111] text-[#FFC400] font-semibold text-[10px]">
                              Low Stock (&le;{item.min_stock_alert})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-[#F7F7F7] text-[#111111] border border-[#E8E8E8] font-medium text-[10px]">
                              Adequate
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {canRecord && (
                              <button
                                onClick={() => {
                                  setSelectedItemName(item.item_name);
                                  setTxUnit(item.unit);
                                  setTxType(item.is_reusable ? 'issue' : 'usage');
                                  setIsModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-[#111111] bg-[#FFC400] hover:bg-[#F0B800] rounded-lg transition-colors shadow-xs"
                                title="Record movement for this item"
                              >
                                + Movement
                              </button>
                            )}
                            {canEditItem && (
                              <button
                                onClick={() => handleOpenEditItem(item)}
                                className="p-1 text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7] rounded-lg transition-colors"
                                title="Edit Material Details"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
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

      {/* VIEW 2: LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          {/* Ledger Filters Strip */}
          <div className="bg-white p-4 rounded-2xl border border-[#E8E8E8] flex flex-wrap gap-3 items-center justify-between text-xs shadow-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-[#666666] absolute left-3.5 top-3" />
              <input
                type="text"
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                placeholder="Search ledger by item, supplier, invoice, challan..."
                className="w-full text-xs pl-10 pr-4 py-2 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={ledgerTypeFilter}
                onChange={(e) => setLedgerTypeFilter(e.target.value)}
                className="text-xs py-2 px-3 rounded-xl border border-[#E8E8E8] bg-white text-[#111111] focus:outline-none focus:border-[#FFC400]"
              >
                <option value="all">All Movement Types</option>
                <option value="receipt">Receipt (Delivery In)</option>
                <option value="usage">{isReusable ? 'Issue (Check-out)' : 'Usage (Consumed)'}</option>
                <option value="return">Return</option>
                <option value="damage">Damage / Scrap</option>
              </select>

              <div className="flex items-center gap-1.5 text-[#666666]">
                <span>From:</span>
                <input
                  type="date"
                  value={ledgerStartDate}
                  onChange={(e) => setLedgerStartDate(e.target.value)}
                  className="text-xs py-1.5 px-2 rounded-xl border border-[#E8E8E8] bg-white text-[#111111]"
                />
                <span>To:</span>
                <input
                  type="date"
                  value={ledgerEndDate}
                  onChange={(e) => setLedgerEndDate(e.target.value)}
                  className="text-xs py-1.5 px-2 rounded-xl border border-[#E8E8E8] bg-white text-[#111111]"
                />
              </div>

              {(ledgerSearch || ledgerTypeFilter !== 'all' || ledgerStartDate || ledgerEndDate) && (
                <button
                  onClick={() => {
                    setLedgerSearch('');
                    setLedgerTypeFilter('all');
                    setLedgerStartDate('');
                    setLedgerEndDate('');
                  }}
                  className="text-[11px] text-[#111111] font-semibold hover:underline"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F7F7F7] border-b border-[#E8E8E8] text-[11px] font-semibold text-[#666666] uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Item</th>
                    <th className="py-3 px-4">Movement</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4 text-right bg-[#FFC400]/10 font-bold text-[#111111]">Running Stock</th>
                    <th className="py-3 px-4">{isReusable ? 'Issued To / Supplier' : 'Supplier / Challan'}</th>
                    <th className="py-3 px-4">Recorded By</th>
                    <th className="py-3 px-4 text-center">Attachment</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E8E8]">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[#666666]">
                        No transactions recorded matching the active filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.id} className={`hover:bg-[#F7F7F7] transition-colors ${tx.is_reversal ? 'line-through opacity-60' : ''}`}>
                        <td className="py-3 px-4 font-mono text-[#666666]">{tx.transaction_date}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-[#111111] block">{tx.item_name}</span>
                          {tx.remarks && <span className="text-[11px] text-[#666666] italic block">{tx.remarks}</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                            tx.transaction_type === 'receipt'
                              ? 'bg-[#FFC400]/20 text-[#111111] border border-[#FFC400]/40'
                              : 'bg-[#F7F7F7] text-[#111111] border border-[#E8E8E8]'
                          }`}>
                            {tx.transaction_type}
                          </span>
                          {tx.equipment_condition && (
                            <span className="block text-[10px] text-[#666666] mt-0.5 capitalize">Cond: {tx.equipment_condition}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-[#111111]">
                          {tx.quantity.toLocaleString()} {tx.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#111111] bg-[#FFC400]/10">
                          {tx.running_balance !== undefined ? `${tx.running_balance.toLocaleString()} ${tx.unit}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-[#111111]">
                          <div className="space-y-0.5">
                            {tx.issued_to && <span className="block font-medium">Crew: {tx.issued_to}</span>}
                            {tx.supplier_name && <span className="block text-[#666666]">{tx.supplier_name}</span>}
                            {(tx.invoice_number || tx.challan_number) && (
                              <span className="block font-mono text-[10px] text-[#666666]">
                                {tx.invoice_number ? `Inv: ${tx.invoice_number} ` : ''}
                                {tx.challan_number ? `DC: ${tx.challan_number}` : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[#111111]">
                          <span className="block font-medium">{tx.created_by_name}</span>
                          <span className="text-[10px] text-[#666666] font-mono">{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {tx.attachment_url ? (
                            <a href={tx.attachment_url} target="_blank" rel="noreferrer" className="text-[#111111] hover:underline inline-flex items-center gap-1 font-semibold text-[11px]">
                              <Paperclip className="w-3.5 h-3.5" />
                              View
                            </a>
                          ) : '—'}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-right">
                            {!tx.is_reversal && (
                              <button
                                onClick={() => {
                                  setReversalTarget(tx);
                                  setReversalReason('');
                                }}
                                className="text-[11px] text-[#111111] hover:underline font-semibold"
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
        </div>
      )}

      {/* RECORD MOVEMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#111111]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-[#E8E8E8] max-w-lg w-full p-6 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8E8E8]">
              <h3 className="text-base font-bold text-[#111111] flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#FFC400]" />
                Record Movement — {categoryDef?.name}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#666666] hover:text-[#111111]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {successSaved ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-14 h-14 bg-[#FFC400] text-[#111111] rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-lg text-[#111111]">Transaction Confirmed!</h4>
                <p className="text-xs text-[#666666]">
                  Recorded {successSaved.quantity} {successSaved.unit} of {successSaved.item_name}.
                </p>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSuccessSaved(null);
                  }}
                  className="px-5 py-2.5 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] font-bold text-xs rounded-xl shadow-xs transition-colors"
                >
                  Done & View Ledger
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecordSubmit} className="space-y-4 text-xs mt-4">
                {formError && (
                  <div className="p-3 bg-[#F7F7F7] border border-[#E8E8E8] text-[#111111] rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#111111] shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-[#111111] uppercase mb-1.5">Movement Type</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    <button
                      type="button"
                      onClick={() => setTxType('receipt')}
                      className={`py-2 px-1 rounded-xl font-bold border transition-all text-center text-xs ${
                        txType === 'receipt'
                          ? 'bg-[#FFC400] border-[#FFC400] text-[#111111] shadow-xs'
                          : 'border-[#E8E8E8] text-[#666666] hover:bg-[#F7F7F7] hover:text-[#111111]'
                      }`}
                    >
                      Receive (In)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = items.find(i => i.name === selectedItemName);
                        setTxType((cur?.is_reusable ?? isReusable) ? 'issue' : 'usage');
                      }}
                      className={`py-2 px-1 rounded-xl font-bold border transition-all text-center text-xs ${
                        (txType === 'usage' || txType === 'issue')
                          ? 'bg-[#FFC400] border-[#FFC400] text-[#111111] shadow-xs'
                          : 'border-[#E8E8E8] text-[#666666] hover:bg-[#F7F7F7] hover:text-[#111111]'
                      }`}
                    >
                      {(items.find(i => i.name === selectedItemName)?.is_reusable ?? isReusable) ? 'Issue / Out' : 'Usage / Out'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('return')}
                      className={`py-2 px-1 rounded-xl font-bold border transition-all text-center text-xs ${
                        txType === 'return'
                          ? 'bg-[#FFC400] border-[#FFC400] text-[#111111] shadow-xs'
                          : 'border-[#E8E8E8] text-[#666666] hover:bg-[#F7F7F7] hover:text-[#111111]'
                      }`}
                    >
                      Return
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('damage')}
                      className={`py-2 px-1 rounded-xl font-bold border transition-all text-center text-xs ${
                        txType === 'damage'
                          ? 'bg-[#111111] border-[#111111] text-white shadow-xs'
                          : 'border-[#E8E8E8] text-[#666666] hover:bg-[#F7F7F7] hover:text-[#111111]'
                      }`}
                    >
                      Damaged
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('adjustment')}
                      className={`py-2 px-1 rounded-xl font-bold border transition-all text-center text-xs ${
                        txType === 'adjustment'
                          ? 'bg-[#111111] border-[#111111] text-white shadow-xs'
                          : 'border-[#E8E8E8] text-[#666666] hover:bg-[#F7F7F7] hover:text-[#111111]'
                      }`}
                    >
                      Adjust
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('opening_stock')}
                      className={`py-2 px-1 rounded-xl font-bold border transition-all text-center text-xs ${
                        txType === 'opening_stock'
                          ? 'bg-[#111111] border-[#111111] text-white shadow-xs'
                          : 'border-[#E8E8E8] text-[#666666] hover:bg-[#F7F7F7] hover:text-[#111111]'
                      }`}
                    >
                      Opening
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block font-semibold text-[#111111] uppercase mb-1.5">Material / Equipment Item *</label>
                    <select
                      value={selectedItemName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedItemName(val);
                        const match = items.find(i => i.name === val);
                        if (match) {
                          setTxUnit(match.default_unit);
                          setTxType(match.is_reusable ? 'issue' : 'usage');
                        }
                      }}
                      className="w-full py-2.5 px-3.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] font-medium focus:bg-white focus:outline-none focus:border-[#FFC400]"
                      required
                    >
                      {subcategories.length > 0 ? (
                        subcategories.map(sub => (
                          <optgroup key={sub} label={sub}>
                            {items.filter(i => (i.subcategory || 'General') === sub).map(i => (
                              <option key={i.id} value={i.name}>
                                {i.name} ({i.default_unit}) {i.is_reusable ? '• Reusable' : '• Consumable'}
                              </option>
                            ))}
                          </optgroup>
                        ))
                      ) : (
                        items.map(i => (
                          <option key={i.id} value={i.name}>
                            {i.name} ({i.default_unit})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#111111] uppercase mb-1.5">Quantity *</label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      value={txQty}
                      onChange={(e) => setTxQty(e.target.value)}
                      className="w-full py-2.5 px-3.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] font-mono focus:bg-white focus:outline-none focus:border-[#FFC400]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#111111] uppercase mb-1.5">Unit</label>
                    <select
                      value={txUnit}
                      onChange={(e) => setTxUnit(e.target.value)}
                      className="w-full py-2.5 px-3.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400]"
                    >
                      {(categoryDef?.allowed_units || ['Nos', 'Sets', 'Rolls', 'Pairs', 'Meters', 'Pcs']).map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#111111] uppercase mb-1.5">Date *</label>
                    <input
                      type="date"
                      required
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full py-2.5 px-3.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#111111] uppercase mb-1.5">Storage Yard / Location</label>
                    <select
                      value={txLocationId}
                      onChange={(e) => setTxLocationId(e.target.value)}
                      className="w-full py-2.5 px-3.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400]"
                    >
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>

                  {(items.find(i => i.name === selectedItemName)?.is_reusable ?? isReusable) && (
                    <>
                      <div>
                        <label className="block font-semibold text-[#111111] uppercase mb-1.5">Equipment Condition</label>
                        <select
                          value={txCondition}
                          onChange={(e) => setTxCondition(e.target.value as any)}
                          className="w-full py-2.5 px-3.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400]"
                        >
                          <option value="good">Good Condition</option>
                          <option value="fair">Fair / Functional</option>
                          <option value="damaged">Damaged / Needs Maintenance</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-[#111111] uppercase mb-1.5">Issued To (Worker / Gang / Subcontractor)</label>
                        <input
                          type="text"
                          value={issuedToCrew}
                          onChange={(e) => setIssuedToCrew(e.target.value)}
                          placeholder="e.g. Masonry Gang 2 / Ramesh"
                          className="w-full py-2.5 px-3.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400]"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block font-semibold text-[#111111] uppercase mb-1.5">Supplier / Party Name</label>
                    <input
                      type="text"
                      value={partyName}
                      onChange={(e) => setPartyName(e.target.value)}
                      placeholder="e.g. National Hardware Depot"
                      className="w-full py-2.5 px-3.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#111111] uppercase mb-1.5">Invoice / Challan Reference</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder="Invoice #"
                        className="w-1/2 py-2.5 px-3 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] font-mono focus:bg-white focus:outline-none focus:border-[#FFC400]"
                      />
                      <input
                        type="text"
                        value={challanNumber}
                        onChange={(e) => setChallanNumber(e.target.value)}
                        placeholder="Challan #"
                        className="w-1/2 py-2.5 px-3 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] font-mono focus:bg-white focus:outline-none focus:border-[#FFC400]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#111111] uppercase mb-1.5">Remarks & Details</label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Delivered for Block B scaffolding"
                    className="w-full py-2.5 px-3.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#111111] uppercase mb-1.5">Attach Delivery Challan / Photo</label>
                  {attachment ? (
                    <div className="flex items-center justify-between p-2.5 bg-[#F7F7F7] border border-[#E8E8E8] rounded-xl">
                      <span className="font-semibold text-[#111111] truncate">{attachment.name}</span>
                      <button type="button" onClick={() => setAttachment(null)} className="text-[#666666] hover:text-[#111111] font-bold">Remove</button>
                    </div>
                  ) : (
                    <input type="file" onChange={handleFileUpload} className="w-full text-xs text-[#666666]" />
                  )}
                </div>

                <div className="pt-3 border-t border-[#E8E8E8] flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-[#E8E8E8] text-[#666666] font-semibold rounded-xl hover:bg-[#F7F7F7] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Recording...' : 'Confirm Movement'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ADD ITEM MODAL */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 bg-[#111111]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-[#E8E8E8] max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E8]">
              <h3 className="text-base font-bold text-[#111111] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#111111]" />
                Add Item to {categoryDef?.name}
              </h3>
              <button onClick={() => setIsAddItemOpen(false)} className="text-[#666666] hover:text-[#111111]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItemSubmit} className="space-y-4 text-xs mt-4">
              <div>
                <label className="block font-semibold text-[#111111] uppercase mb-1.5">Material / Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 25mm CPVC Ball Valve, Acrylic Sealant"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E8E8E8] rounded-xl bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400] font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#111111] uppercase mb-1.5">Default Unit</label>
                  <select
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#E8E8E8] rounded-xl bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400]"
                  >
                    {(categoryDef?.allowed_units || ['Nos', 'Sets', 'Rolls', 'kg', 'Meters']).map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#111111] uppercase mb-1.5">Min Stock Alert</label>
                  <input
                    type="number"
                    min="1"
                    value={newItemMinStock}
                    onChange={(e) => setNewItemMinStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#E8E8E8] rounded-xl bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#111111] uppercase mb-1.5">Brand / Manufacturer (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Astral, Asian Paints, Bosch"
                  value={newItemBrand}
                  onChange={(e) => setNewItemBrand(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E8E8E8] rounded-xl bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111111] uppercase mb-1.5">Specification (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Grade, dimensions, or standard specification"
                  value={newItemSpec}
                  onChange={(e) => setNewItemSpec(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E8E8E8] rounded-xl bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400]"
                />
              </div>

              <div className="pt-3 border-t border-[#E8E8E8] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="px-4 py-2 border border-[#E8E8E8] text-[#666666] font-semibold rounded-xl hover:bg-[#F7F7F7] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingItemSaving}
                  className="px-5 py-2 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isAddingItemSaving ? 'Saving...' : 'Add Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MATERIAL DETAILS MODAL */}
      {isEditItemOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-[#111111]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-[#E8E8E8] max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E8]">
              <h3 className="text-base font-bold text-[#111111] flex items-center gap-2">
                <Edit className="w-4 h-4 text-[#111111]" />
                Edit Material Details
              </h3>
              <button onClick={() => setIsEditItemOpen(false)} className="text-[#666666] hover:text-[#111111]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mt-3 p-2.5 bg-[#F7F7F7] border border-[#E8E8E8] text-[#111111] text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#111111] shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditItemSubmit} className="space-y-4 text-xs mt-4">
              <div>
                <label className="block font-semibold text-[#111111] uppercase mb-1.5">Material Name *</label>
                <input
                  type="text"
                  required
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E8E8E8] rounded-xl bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400] font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#111111] uppercase mb-1.5">Default Unit</label>
                  <select
                    value={editItemUnit}
                    onChange={(e) => setEditItemUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#E8E8E8] rounded-xl bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400]"
                  >
                    {(categoryDef?.allowed_units || ['Nos', 'Sets', 'Rolls', 'kg', 'Meters']).map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#111111] uppercase mb-1.5">Min Stock Alert</label>
                  <input
                    type="number"
                    min="1"
                    value={editItemMinStock}
                    onChange={(e) => setEditItemMinStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#E8E8E8] rounded-xl bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#111111] uppercase mb-1.5">Brand / Manufacturer</label>
                <input
                  type="text"
                  placeholder="e.g. Pidilite, Ultra, Havells"
                  value={editItemBrand}
                  onChange={(e) => setEditItemBrand(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E8E8E8] rounded-xl bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111111] uppercase mb-1.5">Technical Specification</label>
                <textarea
                  rows={2}
                  placeholder="Grade, thickness, or material standard"
                  value={editItemSpec}
                  onChange={(e) => setEditItemSpec(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E8E8E8] rounded-xl bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111111] uppercase mb-1.5">Tracking Classification</label>
                <select
                  value={editItemReusable ? 'true' : 'false'}
                  onChange={(e) => setEditItemReusable(e.target.value === 'true')}
                  className="w-full px-3.5 py-2.5 border border-[#E8E8E8] rounded-xl bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400]"
                >
                  <option value="false">Consumable Material (Consumed / Used up)</option>
                  <option value="true">Reusable Equipment (Issued / Returned / In Yard)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#E8E8E8] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditItemOpen(false)}
                  className="px-4 py-2 border border-[#E8E8E8] text-[#666666] font-semibold rounded-xl hover:bg-[#F7F7F7] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSaving}
                  className="px-5 py-2 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isEditSaving ? 'Saving...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVERSAL MODAL */}
      {reversalTarget && (
        <div className="fixed inset-0 z-50 bg-[#111111]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-[#E8E8E8] max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E8]">
              <h3 className="text-base font-bold text-[#111111] flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-[#111111]" />
                Audited Ledger Reversal
              </h3>
              <button onClick={() => setReversalTarget(null)} className="text-[#666666] hover:text-[#111111]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 p-3 bg-[#F7F7F7] rounded-xl border border-[#E8E8E8] text-xs text-[#111111] space-y-1">
              <p>Reversing transaction for <strong className="font-bold">{reversalTarget.item_name}</strong> ({reversalTarget.quantity} {reversalTarget.unit}).</p>
              <p className="text-[11px] text-[#666666]">An audited offsetting entry will be posted to preserve the historical audit trail.</p>
            </div>

            <form onSubmit={handleReversalSubmit} className="space-y-4 text-xs mt-4">
              <div>
                <label className="block font-semibold text-[#111111] uppercase mb-1.5">Reason for Reversal *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="State the audit justification (e.g. data entry error, duplicate invoice correction)"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E8E8E8] rounded-xl bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400]"
                />
              </div>

              <div className="pt-3 border-t border-[#E8E8E8] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReversalTarget(null)}
                  className="px-4 py-2 border border-[#E8E8E8] text-[#666666] font-semibold rounded-xl hover:bg-[#F7F7F7] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReversing}
                  className="px-5 py-2 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isReversing ? 'Reversing...' : 'Confirm Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
