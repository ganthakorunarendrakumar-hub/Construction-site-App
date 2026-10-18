import React, { useState, useRef } from 'react';
import {
  X,
  PlusCircle,
  Upload,
  FileText,
  AlertCircle,
  Building,
  Calendar,
  Layers,
  MapPin,
  CheckCircle2,
  Trash2,
  Hash,
  FileCheck,
  ShieldAlert,
  Info
} from 'lucide-react';
import {
  Project,
  CementBrand,
  MaterialLocation,
  TransactionType,
  UserProfile,
  MaterialTransaction,
  ProjectStockMetrics
} from '../types';

interface CementTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  brands: CementBrand[];
  locations: MaterialLocation[];
  currentUser: UserProfile;
  stockMetrics: ProjectStockMetrics | null;
  preselectedBrandId?: string;
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
}

export const CementTransactionModal: React.FC<CementTransactionModalProps> = ({
  isOpen,
  onClose,
  project,
  brands,
  locations,
  currentUser,
  stockMetrics,
  preselectedBrandId,
  onSaveTransaction,
  onUploadFile
}) => {
  const [transactionType, setTransactionType] = useState<TransactionType>('receipt');
  const [selectedBrandId, setSelectedBrandId] = useState<string>(preselectedBrandId || brands[0]?.id || '');
  const [customBrandName, setCustomBrandName] = useState('');
  const [locationId, setLocationId] = useState(locations[0]?.id || 'main-site');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantityBags, setQuantityBags] = useState<string>('50');
  
  // Commercial & Audit Metadata
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [challanNumber, setChallanNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  // Attachment state
  const [attachment, setAttachment] = useState<{ url: string; name: string; size: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successSaved, setSuccessSaved] = useState<MaterialTransaction | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Selected Brand Stock
  const activeBrand = brands.find(b => b.id === selectedBrandId);
  const brandStock = stockMetrics?.brandSummaries.find(b => b.brand_id === selectedBrandId);
  const currentAvailableBags = brandStock ? brandStock.available_stock : 0;

  const role = currentUser.role;
  const isViewer = role === 'management_viewer';
  const canPerformReceipt = role === 'admin' || role === 'project_manager' || role === 'storekeeper';
  const canPerformUsageOrDamage = role === 'admin' || role === 'project_manager' || role === 'site_engineer';

  const isTypeAllowed = () => {
    if (isViewer) return false;
    if (transactionType === 'receipt' || transactionType === 'opening_stock') return canPerformReceipt;
    if (transactionType === 'usage' || transactionType === 'damage') return canPerformUsageOrDamage;
    return true;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      const uploaded = await onUploadFile(file);
      setAttachment(uploaded);
    } catch (err: any) {
      setUploadError(err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (isViewer) {
      setFormError('Access Denied: Management Viewers are restricted to read-only access.');
      return;
    }

    if (!isTypeAllowed()) {
      setFormError(`Access Denied: Your staff role (${currentUser.role_title}) is not permitted to record ${transactionType} transactions.`);
      return;
    }

    const qty = parseInt(quantityBags, 10);
    if (isNaN(qty) || qty <= 0) {
      setFormError('Quantity must be a positive whole integer greater than zero.');
      return;
    }

    if (!selectedBrandId) {
      setFormError('Please select a cement brand.');
      return;
    }

    let finalBrandName = activeBrand ? activeBrand.brand_name : 'Custom Cement';
    if (activeBrand?.code === 'OTHER' && customBrandName.trim()) {
      finalBrandName = customBrandName.trim();
    }

    // Check negative stock for deductions
    if (transactionType === 'usage' || transactionType === 'damage' || transactionType === 'return') {
      if (qty > currentAvailableBags) {
        setFormError(
          `Insufficient stock: Cannot record ${qty} bags of ${finalBrandName}. Only ${currentAvailableBags} bags available in site stock.`
        );
        return;
      }
    }

    const selectedLoc = locations.find(l => l.id === locationId);
    const locName = selectedLoc ? selectedLoc.name : 'Main Site Cement Yard';

    try {
      setIsSubmitting(true);
      const saved = await onSaveTransaction({
        projectId: project.id,
        locationId,
        locationName: locName,
        brandId: selectedBrandId,
        brandName: finalBrandName,
        transactionDate,
        transactionType,
        quantityBags: qty,
        supplierName: supplierName.trim(),
        invoiceNumber: invoiceNumber.trim(),
        challanNumber: challanNumber.trim(),
        remarks: remarks.trim(),
        attachmentUrl: attachment?.url,
        attachmentName: attachment?.name,
        attachmentSize: attachment?.size
      });

      setSuccessSaved(saved);
    } catch (err: any) {
      setFormError(err.message || 'Failed to record transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSuccessSaved(null);
    setFormError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#111111]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-xl border border-[#E8E8E8] w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#111111] text-white px-6 py-4 flex items-center justify-between border-b border-[#222222]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFC400] text-[#111111] flex items-center justify-center font-bold text-xs">
              01
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Record Cement Transaction</h3>
              <p className="text-xs text-[#AAAAAA]">
                Site: {project.name} ({project.code})
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-[#AAAAAA] hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Confirmation Screen */}
        {successSaved ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-[#FFC400] text-[#111111] rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xl font-bold text-[#111111]">Transaction Confirmed</h4>
              <p className="text-xs text-[#666666]">
                Recorded <strong className="text-[#111111]">{successSaved.quantity_bags} bags</strong> of {successSaved.brand_name} as <span className="uppercase font-semibold text-[#111111]">{successSaved.transaction_type}</span>.
              </p>
              <div className="pt-2">
                <span className="px-3 py-1 bg-[#F7F7F7] text-[#111111] font-mono text-xs font-semibold rounded-lg border border-[#E8E8E8]">
                  Available Stock: {successSaved.running_balance ?? 'Updated'} bags
                </span>
              </div>
            </div>
            <div className="pt-4 flex justify-center">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                Close & View Ledger
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            
            {/* RBAC Warning Banner if restricted */}
            {!isTypeAllowed() && (
              <div className="p-3 bg-[#F7F7F7] border border-[#E8E8E8] rounded-xl flex items-start gap-2.5 text-xs text-[#111111]">
                <ShieldAlert className="w-4 h-4 text-[#111111] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Role Restriction</p>
                  <p className="text-[#666666]">Your current role ({currentUser.role_title}) is not authorized to submit <strong>{transactionType}</strong> entries.</p>
                </div>
              </div>
            )}

            {formError && (
              <div className="p-3 bg-[#F7F7F7] border border-[#E8E8E8] rounded-xl flex items-start gap-2.5 text-xs text-[#111111]">
                <AlertCircle className="w-4 h-4 text-[#111111] shrink-0 mt-0.5" />
                <span className="font-medium">{formError}</span>
              </div>
            )}

            {/* Transaction Type Segmented Control */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1.5">
                Transaction Type <span className="text-[#111111] font-bold">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setTransactionType('receipt')}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                    transactionType === 'receipt'
                      ? 'bg-[#FFC400] border-[#FFC400] text-[#111111] shadow-xs'
                      : 'border-[#E8E8E8] text-[#666666] hover:bg-[#F7F7F7] hover:text-[#111111]'
                  }`}
                >
                  <span className="font-bold">Receive Stock</span>
                  <span className="text-[10px] opacity-80">+ IN to Site</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTransactionType('usage')}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                    transactionType === 'usage'
                      ? 'bg-[#FFC400] border-[#FFC400] text-[#111111] shadow-xs'
                      : 'border-[#E8E8E8] text-[#666666] hover:bg-[#F7F7F7] hover:text-[#111111]'
                  }`}
                >
                  <span className="font-bold">Record Usage</span>
                  <span className="text-[10px] opacity-80">- OUT (Pouring)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTransactionType('damage')}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                    transactionType === 'damage'
                      ? 'bg-[#111111] border-[#111111] text-white shadow-xs'
                      : 'border-[#E8E8E8] text-[#666666] hover:bg-[#F7F7F7] hover:text-[#111111]'
                  }`}
                >
                  <span className="font-bold">Damaged / Wet</span>
                  <span className="text-[10px] opacity-80">- Deduct Stock</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTransactionType('opening_stock')}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                    transactionType === 'opening_stock'
                      ? 'bg-[#111111] border-[#111111] text-white shadow-xs'
                      : 'border-[#E8E8E8] text-[#666666] hover:bg-[#F7F7F7] hover:text-[#111111]'
                  }`}
                >
                  <span className="font-bold">Opening Balance</span>
                  <span className="text-[10px] opacity-80">Initial Base</span>
                </button>
              </div>
            </div>

            {/* Grid: Brand & Storage Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Cement Brand Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1.5">
                  Cement Brand <span className="text-[#111111] font-bold">*</span>
                </label>
                <select
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400] font-medium"
                >
                  {brands.map((b, idx) => (
                    <option key={b.id} value={b.id}>
                      {idx + 1}. {b.brand_name}
                    </option>
                  ))}
                </select>

                {activeBrand?.code === 'OTHER' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      required
                      value={customBrandName}
                      onChange={(e) => setCustomBrandName(e.target.value)}
                      placeholder="Specify custom manufacturer/brand name"
                      className="w-full text-xs px-3.5 py-2 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] focus:bg-white focus:outline-none focus:border-[#FFC400]"
                    />
                  </div>
                )}

                {/* Available Stock Indicator */}
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#666666] font-mono">
                  <span>Available Stock:</span>
                  <span className="font-bold text-[#111111]">
                    {currentAvailableBags} bags
                  </span>
                </div>
              </div>

              {/* Storage Location */}
              <div>
                <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1.5">
                  Storage Location
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-[#666666] absolute left-3 top-3" />
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full text-xs pl-8 pr-3.5 py-2.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400]"
                  >
                    {locations.length > 0 ? (
                      locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} ({loc.code})
                        </option>
                      ))
                    ) : (
                      <option value="main-site">Main Site Storage Yard</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Transaction Date */}
              <div>
                <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1.5">
                  Date <span className="text-[#111111] font-bold">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-[#666666] absolute left-3 top-3" />
                  <input
                    type="date"
                    required
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="w-full text-xs pl-8 pr-3.5 py-2.5 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400]"
                  />
                </div>
              </div>

              {/* Quantity in Bags */}
              <div>
                <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1.5">
                  Quantity (Bags) <span className="text-[#111111] font-bold">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={quantityBags}
                    onChange={(e) => setQuantityBags(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full text-sm font-mono font-bold px-3.5 py-2 rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] text-[#111111] focus:bg-white focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400]"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-[#666666] font-normal">
                    Bags (50kg)
                  </span>
                </div>
              </div>

            </div>

            {/* Commercial Details */}
            <div className="p-4 bg-[#F7F7F7] rounded-xl border border-[#E8E8E8] space-y-3">
              <div className="text-[11px] font-bold text-[#111111] uppercase tracking-wider">
                Commercial & Verification Reference
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#666666] mb-1">
                    {transactionType === 'receipt' ? 'Supplier / Depot' : 'Subcontractor / Gang'}
                  </label>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="e.g. Sri Balaji Materials"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-[#E8E8E8] bg-white text-[#111111] focus:outline-none focus:border-[#FFC400]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#666666] mb-1">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="INV-2026-901"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-[#E8E8E8] bg-white text-[#111111] font-mono focus:outline-none focus:border-[#FFC400]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#666666] mb-1">
                    Delivery Challan #
                  </label>
                  <input
                    type="text"
                    value={challanNumber}
                    onChange={(e) => setChallanNumber(e.target.value)}
                    placeholder="DC-BLR-4019"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-[#E8E8E8] bg-white text-[#111111] font-mono focus:outline-none focus:border-[#FFC400]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#666666] mb-1">
                  Site Remarks & Pouring Location
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. 53-grade OPC cement batch. Poured on 4th floor slab."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-[#E8E8E8] bg-white text-[#111111] focus:outline-none focus:border-[#FFC400]"
                />
              </div>

              {/* Supporting Document Upload */}
              <div>
                <label className="block text-[11px] font-medium text-[#666666] mb-1">
                  Attach Delivery Challan / Invoice / Photo
                </label>

                {attachment ? (
                  <div className="flex items-center justify-between p-2.5 bg-white border border-[#E8E8E8] rounded-xl text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileCheck className="w-4 h-4 text-[#111111] shrink-0" />
                      <span className="font-semibold text-[#111111] truncate">{attachment.name}</span>
                      <span className="text-[10px] text-[#666666] font-mono">
                        ({(attachment.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachment(null)}
                      className="text-[#666666] hover:text-[#111111] p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="px-3 py-1.5 bg-white border border-[#E8E8E8] hover:bg-[#F7F7F7] text-[#111111] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#666666]" />
                      {isUploading ? 'Uploading...' : 'Upload File / Photo (Max 10MB)'}
                    </button>
                    <span className="text-[11px] text-[#666666]">
                      PDF challans, JPG/PNG site photos
                    </span>
                  </div>
                )}
                {uploadError && <p className="text-[11px] text-[#111111] mt-1">{uploadError}</p>}
              </div>

            </div>

            {/* Audit Information */}
            <div className="text-[11px] text-[#666666] bg-[#F7F7F7] p-2.5 rounded-xl border border-[#E8E8E8] flex items-center justify-between">
              <div>
                Recorded By: <strong className="text-[#111111]">{currentUser.full_name}</strong> ({currentUser.role_title})
              </div>
              <div>
                Time: <strong className="text-[#111111] font-mono">{new Date().toLocaleTimeString()}</strong>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-[#E8E8E8] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold text-[#666666] hover:bg-[#F7F7F7] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isTypeAllowed()}
                className="px-5 py-2.5 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4 text-[#111111]" />
                {isSubmitting ? 'Recording...' : 'Commit to Stock Ledger'}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
