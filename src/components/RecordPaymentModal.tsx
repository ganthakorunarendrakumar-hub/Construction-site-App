import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, CreditCard, AlertTriangle, User } from 'lucide-react';
import { Employee } from '../types';
import { getLocalDateString } from '../utils/dateUtils';
import { AttachmentSections, emptyTransactionAttachments, hasTransactionAttachments } from './AttachmentSections';
import { TransactionAttachments } from '../types';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (paymentData: {
    group_id: string;
    employee_id: string;
    amount: number;
    payment_date: string;
    payment_method: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque';
    payment_type: 'salary' | 'advance' | 'bonus' | 'deduction';
    reference_no?: string;
    remarks?: string;
    attachments?: TransactionAttachments;
  }) => Promise<void>;
  onUploadFile: (file: File) => Promise<{ url: string; name: string; size: number }>;
  groupId: string;
  employees: Employee[];
  selectedEmployee?: Employee | null;
  suggestedAmount?: number;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  groupId,
  employees,
  selectedEmployee,
  suggestedAmount
  , onUploadFile
}) => {
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(getLocalDateString());
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque'>('Cash');
  const [paymentType, setPaymentType] = useState<'salary' | 'advance' | 'bonus' | 'deduction'>('salary');
  const [referenceNo, setReferenceNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [attachments, setAttachments] = useState<TransactionAttachments>(emptyTransactionAttachments());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedEmployee) {
      setEmployeeId(selectedEmployee.id);
    } else if (employees.length > 0) {
      setEmployeeId(employees[0].id);
    }
    if (suggestedAmount !== undefined && suggestedAmount > 0) {
      setAmount(String(suggestedAmount));
    } else {
      setAmount('');
    }
    setPaymentDate(getLocalDateString());
    setPaymentMethod('Cash');
    setPaymentType('salary');
    setReferenceNo('');
    setRemarks('');
    setAttachments(emptyTransactionAttachments());
    setError(null);
  }, [isOpen, selectedEmployee?.id, suggestedAmount]);

  if (!isOpen) return null;

  const currentEmp = employees.find(e => e.id === employeeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      setError('Please select an employee.');
      return;
    }
    const numAmt = Number(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }
    if (!paymentDate) {
      setError('Please select a payment date.');
      return;
    }
    if (!hasTransactionAttachments(attachments) && !window.confirm('No supporting documents or images have been attached. Select Cancel to upload files, or OK to Skip & Continue.')) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        group_id: groupId,
        employee_id: employeeId,
        amount: numAmt,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        payment_type: paymentType,
        reference_no: referenceNo.trim() || undefined,
        remarks: remarks.trim() || undefined
        , attachments
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-bp-navy/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-bp-border max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-bp-navy text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-bp-cyan text-bp-text flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4 text-bp-text" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Record Wage & Salary Payment</h2>
              <p className="text-[11px] text-bp-muted">
                Manual disbursement record for audited worker accounts
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="text-bp-muted hover:text-white p-1 rounded-lg disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Employee Selection */}
          <div>
            <label className="block text-[11px] font-bold text-bp-text uppercase mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-bp-text" />
              Select Worker / Employee *
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs text-bp-text font-semibold rounded-xl border border-bp-border-strong focus:outline-none focus:border-bp-cyan bg-white"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.employee_code} • {emp.job_type})
                </option>
              ))}
            </select>
            {currentEmp && (
              <p className="text-[10px] text-bp-muted mt-1">
                Configured Rate: ₹{currentEmp.salary_amount} ({currentEmp.salary_type.replace('_', ' ')})
              </p>
            )}
          </div>

          {/* Amount & Payment Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-bp-text uppercase mb-1">
                Payment Amount (₹) *
              </label>
              <input
                type="number"
                required
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono font-bold text-bp-text rounded-xl border border-bp-border-strong focus:outline-none focus:border-bp-cyan"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-bp-text uppercase mb-1">
                Payment Type *
              </label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as any)}
                className="w-full px-3.5 py-2 text-xs text-bp-text font-semibold rounded-xl border border-bp-border-strong focus:outline-none focus:border-bp-cyan bg-white"
              >
                <option value="salary">Salary / Wage Pay</option>
                <option value="advance">Advance Payment</option>
                <option value="bonus">Bonus / Incentive</option>
                <option value="deduction">Deduction / Recovery</option>
              </select>
            </div>
          </div>

          {/* Payment Date & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-bp-text uppercase mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-bp-text" />
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs text-bp-text rounded-xl border border-bp-border-strong focus:outline-none focus:border-bp-cyan"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-bp-text uppercase mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-bp-text" />
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3.5 py-2 text-xs text-bp-text font-semibold rounded-xl border border-bp-border-strong focus:outline-none focus:border-bp-cyan bg-white"
              >
                <option value="Cash">Cash at Site</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="Cheque">Company Cheque</option>
              </select>
            </div>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-[11px] font-bold text-bp-text uppercase mb-1">
              Transaction / Reference # (Optional)
            </label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              className="w-full px-3.5 py-2 text-xs text-bp-text rounded-xl border border-bp-border-strong focus:outline-none focus:border-bp-cyan"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-[11px] font-bold text-bp-text uppercase mb-1">
              Remarks & Note
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3.5 py-2 text-xs text-bp-text rounded-xl border border-bp-border-strong focus:outline-none focus:border-bp-cyan"
            />
          </div>

          {/* Actions */}
          <AttachmentSections value={attachments} onChange={setAttachments} onUploadFile={onUploadFile} />
          <div className="pt-3 border-t border-bp-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-bp-muted hover:bg-bp-background rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-bp-cyan hover:bg-bp-blue text-bp-text font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
