import React, { useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import {
  AttendanceStatus,
  DailyAttendanceRecord,
  Employee,
  SalaryPaymentRecord,
  SalaryType,
  TransactionAttachments,
  WorkerPayrollEditInput
} from '../types';
import { attendanceService } from '../services/attendanceService';
import { AttachmentLinks, AttachmentSections, emptyTransactionAttachments } from './AttachmentSections';

interface EditWorkerPayrollModalProps {
  employee: Employee;
  groupId?: string;
  period: { fromDate: string; toDate: string };
  attendanceRecords: DailyAttendanceRecord[];
  paymentRecords: SalaryPaymentRecord[];
  onUploadFile: (file: File) => Promise<{ url: string; name: string; size: number }>;
  onDeletePayment: (paymentId: string) => Promise<void>;
  onClose: () => void;
  onSubmit: (input: WorkerPayrollEditInput) => Promise<void>;
}

type EmployeeDraft = {
  employee_code: string;
  full_name: string;
  phone: string;
  address: string;
  job_type: string;
  salary_type: SalaryType;
  salary_amount: string;
  standard_hours_per_day: string;
  overtime_rate_per_hour: string;
  remarks: string;
};

type AttendanceDraft = {
  id: string;
  date: string;
  status: AttendanceStatus;
  working_hours: string;
  overtime_hours: string;
  remarks: string;
};

type PaymentDraft = {
  id: string;
  payment_date: string;
  amount: string;
  payment_method: SalaryPaymentRecord['payment_method'] | '';
  payment_type: SalaryPaymentRecord['payment_type'] | '';
  reference_no: string;
  remarks: string;
  attachments: TransactionAttachments;
};

const fieldClass = 'mt-1 w-full rounded-lg border border-bp-border-strong bg-white px-3 py-2 text-sm text-bp-text focus:border-bp-cyan focus:outline-none';
const labelClass = 'block text-xs font-semibold text-bp-muted';
const salaryTypes: Array<[SalaryType, string]> = [
  ['daily_wage', 'Daily wage'],
  ['monthly_salary', 'Monthly salary'],
  ['contract', 'Contract']
];
const attendanceStatuses: AttendanceStatus[] = ['Present', 'Half Day', 'Absent', 'Leave', 'Weekly Off', 'Holiday'];

const money = (value: number) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value)}`;
const savedAmountInput = (amount: unknown): string => {
  if (typeof amount === 'number') return Number.isFinite(amount) ? String(amount) : '';
  if (typeof amount !== 'string' || !amount.trim()) return '';
  const normalized = amount.trim().replace(/,/g, '').replace(/^[^\d.-]+/, '');
  const numericAmount = Number(normalized);
  return Number.isFinite(numericAmount) ? String(numericAmount) : '';
};

export const EditWorkerPayrollModal: React.FC<EditWorkerPayrollModalProps> = ({
  employee,
  groupId,
  period,
  attendanceRecords,
  paymentRecords,
  onUploadFile,
  onDeletePayment,
  onClose,
  onSubmit
}) => {
  const [employeeDraft, setEmployeeDraft] = useState<EmployeeDraft>(() => ({
    employee_code: employee.employee_code,
    full_name: employee.full_name,
    phone: employee.phone || '',
    address: employee.address || '',
    job_type: employee.job_type,
    salary_type: employee.salary_type,
    salary_amount: String(employee.salary_amount),
    standard_hours_per_day: String(employee.standard_hours_per_day || 8),
    overtime_rate_per_hour: String(employee.overtime_rate_per_hour || 0),
    remarks: employee.remarks || ''
  }));
  const [attendanceDrafts, setAttendanceDrafts] = useState<AttendanceDraft[]>(() => attendanceRecords.map(record => ({
    id: record.id,
    date: record.date,
    status: record.status,
    working_hours: String(record.working_hours),
    overtime_hours: String(record.overtime_hours),
    remarks: record.remarks || ''
  })));
  const [paymentDrafts, setPaymentDrafts] = useState<PaymentDraft[]>(() => paymentRecords.map(payment => ({
    id: payment.id,
    payment_date: payment.payment_date || '',
    amount: savedAmountInput(payment.amount),
    payment_method: payment.payment_method || '',
    payment_type: payment.payment_type || '',
    reference_no: payment.reference_no || '',
    remarks: payment.remarks || '',
    attachments: payment.attachments || emptyTransactionAttachments()
  })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  const preview = useMemo(() => {
    let present = 0;
    let halfDays = 0;
    let absent = 0;
    let payableDays = 0;
    let hours = 0;
    let overtime = 0;
    let gross = 0;
    for (const record of attendanceDrafts) {
      if (record.date < period.fromDate || record.date > period.toDate) continue;
      if (record.status === 'Present') present++;
      else if (record.status === 'Half Day') halfDays++;
      else if (record.status === 'Absent') absent++;
      const day = attendanceService.calculateDailyEarnings(
        record.status,
        employeeDraft.salary_type,
        Number(employeeDraft.salary_amount) || 0,
        Number(record.overtime_hours) || 0,
        Number(employeeDraft.overtime_rate_per_hour) || 0
      );
      payableDays += day.payableDays;
      hours += Number(record.working_hours) || 0;
      overtime += Number(record.overtime_hours) || 0;
      gross += day.dailyEarnings;
    }

    const paymentTotals = attendanceService.calculatePaymentTotals(paymentDrafts.map(payment => ({
      payment_date: payment.payment_date,
      amount: payment.amount.trim() ? Number(payment.amount) : Number.NaN,
      payment_type: payment.payment_type as SalaryPaymentRecord['payment_type']
    })), period.fromDate, period.toDate);
    return {
      present,
      halfDays,
      absent,
      payableDays,
      hours,
      overtime,
      gross,
      advances: paymentTotals.advances,
      deductions: paymentTotals.deductions,
      paid: paymentTotals.paid,
      invalidPaymentCount: paymentTotals.invalidCount,
      balance: gross - paymentTotals.advances - paymentTotals.deductions - paymentTotals.paid
    };
  }, [attendanceDrafts, employeeDraft, paymentDrafts, period.fromDate, period.toDate]);

  const updateAttendance = (id: string, changes: Partial<AttendanceDraft>) => {
    setAttendanceDrafts(current => current.map(record => record.id === id ? { ...record, ...changes } : record));
  };

  const updatePayment = (id: string, changes: Partial<PaymentDraft>) => {
    setPaymentDrafts(current => current.map(payment => payment.id === id ? { ...payment, ...changes } : payment));
  };

  const restorePaymentDraft = (paymentId: string) => {
    const saved = paymentRecords.find(payment => payment.id === paymentId);
    if (!saved) return;
    setPaymentDrafts(current => current.map(payment => payment.id === paymentId ? {
      id: saved.id,
      payment_date: saved.payment_date || '',
      amount: savedAmountInput(saved.amount),
      payment_method: saved.payment_method || '',
      payment_type: saved.payment_type || '',
      reference_no: saved.reference_no || '',
      remarks: saved.remarks || '',
      attachments: saved.attachments || emptyTransactionAttachments()
    } : payment));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const standardHours = Number(employeeDraft.standard_hours_per_day);
      if (!employeeDraft.standard_hours_per_day.trim() || !Number.isFinite(standardHours) || standardHours <= 0 || standardHours > 24) {
        throw new Error('Standard hours per day must be greater than zero and no more than 24.');
      }
      for (const payment of paymentDrafts) {
        if (!payment.amount.trim()) throw new Error(`Enter the saved amount for payment ${payment.id}; an empty amount cannot be treated as zero.`);
        if (!Number.isFinite(Number(payment.amount)) || Number(payment.amount) <= 0) throw new Error(`Enter a valid amount greater than zero for payment ${payment.id}.`);
        if (!payment.payment_date) throw new Error(`Select a payment date for payment ${payment.id}.`);
        if (!payment.payment_method) throw new Error(`Select a payment method for payment ${payment.id}.`);
        if (!payment.payment_type) throw new Error(`Select a transaction type for payment ${payment.id}.`);
      }
      setSaving(true);
      await onSubmit({
        employee_id: employee.id,
        group_id: groupId,
        period_from: period.fromDate,
        period_to: period.toDate,
        employee: {
          ...employeeDraft,
          salary_amount: Number(employeeDraft.salary_amount),
          standard_hours_per_day: Number(employeeDraft.standard_hours_per_day),
          overtime_rate_per_hour: Number(employeeDraft.overtime_rate_per_hour)
        },
        attendance: attendanceDrafts.map(record => ({
          ...record,
          working_hours: Number(record.working_hours),
          overtime_hours: Number(record.overtime_hours)
        })),
        payments: paymentDrafts.map(payment => ({
          ...payment,
          amount: Number(payment.amount),
          payment_method: payment.payment_method as SalaryPaymentRecord['payment_method'],
          payment_type: payment.payment_type as SalaryPaymentRecord['payment_type'],
          reference_no: payment.reference_no.trim() || undefined,
          remarks: payment.remarks.trim() || undefined,
          attachments: payment.attachments
        }))
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Worker payroll could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (payment: PaymentDraft) => {
    if (!window.confirm(`Delete this ${payment.payment_type || 'payment'} transaction (${payment.id})? This cannot be undone.`)) return;
    setError(null);
    setNotice(null);
    try {
      setSaving(true);
      await onDeletePayment(payment.id);
      setPaymentDrafts(current => current.filter(row => row.id !== payment.id));
      setEditingPaymentId(current => current === payment.id ? null : current);
      setNotice('Transaction deleted. Payroll totals have been recalculated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The payment transaction could not be deleted.');
    } finally {
      setSaving(false);
    }
  };

  const statusChanged = (status: AttendanceStatus) => {
    if (status === 'Present') {
      return { status, working_hours: String(Number(employeeDraft.standard_hours_per_day) || 8), overtime_hours: '0' };
    }
    if (status === 'Half Day') {
      return { status, working_hours: String((Number(employeeDraft.standard_hours_per_day) || 8) / 2), overtime_hours: '0' };
    }
    return { status, working_hours: '0', overtime_hours: '0' };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bp-navy/60 p-3 backdrop-blur-xs sm:p-5">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-bp-border bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between bg-bp-navy px-5 py-4 text-white sm:px-6">
          <div>
            <h2 className="text-base font-bold">Edit worker payroll</h2>
            <p className="mt-1 text-xs text-bp-muted">{employee.full_name} · {period.fromDate} to {period.toDate}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close payroll editor" className="rounded-lg p-2 text-bp-muted hover:bg-white/10 hover:text-white disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-bp-text">Worker details and pay rates</h3>
                <p className="mt-1 text-xs text-bp-muted">Changing a rate recalculates earnings for attendance in this period.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className={labelClass}>Worker name *<input required value={employeeDraft.full_name} onChange={event => setEmployeeDraft({ ...employeeDraft, full_name: event.target.value })} className={fieldClass} /></label>
                <label className={labelClass}>Employee code *<input required value={employeeDraft.employee_code} onChange={event => setEmployeeDraft({ ...employeeDraft, employee_code: event.target.value })} className={fieldClass} /></label>
                <label className={labelClass}>Trade *<input required value={employeeDraft.job_type} onChange={event => setEmployeeDraft({ ...employeeDraft, job_type: event.target.value })} className={fieldClass} /></label>
                <label className={labelClass}>Phone<input type="tel" value={employeeDraft.phone} onChange={event => setEmployeeDraft({ ...employeeDraft, phone: event.target.value })} className={fieldClass} /></label>
                <label className={labelClass}>Salary basis<select value={employeeDraft.salary_type} onChange={event => setEmployeeDraft({ ...employeeDraft, salary_type: event.target.value as SalaryType })} className={fieldClass}>{salaryTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className={labelClass}>Rate (₹) *<input required type="number" min="0.01" step="0.01" value={employeeDraft.salary_amount} onChange={event => setEmployeeDraft({ ...employeeDraft, salary_amount: event.target.value })} className={fieldClass} /></label>
                <label className={labelClass}>Standard hours / day *<input required type="number" min="0.1" max="24" step="0.1" value={employeeDraft.standard_hours_per_day} onChange={event => setEmployeeDraft({ ...employeeDraft, standard_hours_per_day: event.target.value })} className={fieldClass} /></label>
                <label className={labelClass}>Overtime rate (₹ / hour)<input required type="number" min="0" step="0.01" value={employeeDraft.overtime_rate_per_hour} onChange={event => setEmployeeDraft({ ...employeeDraft, overtime_rate_per_hour: event.target.value })} className={fieldClass} /></label>
                <label className={`${labelClass} sm:col-span-2 lg:col-span-2`}>Address<input value={employeeDraft.address} onChange={event => setEmployeeDraft({ ...employeeDraft, address: event.target.value })} className={fieldClass} /></label>
                <label className={`${labelClass} sm:col-span-2 lg:col-span-2`}>Worker remarks<input value={employeeDraft.remarks} onChange={event => setEmployeeDraft({ ...employeeDraft, remarks: event.target.value })} className={fieldClass} /></label>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-bp-text">Attendance records</h3>
                  <p className="mt-1 text-xs text-bp-muted">Pay days and gross are calculated from the saved attendance and rate rules.</p>
                </div>
                <span className="text-xs text-bp-muted">{attendanceDrafts.length} existing record{attendanceDrafts.length === 1 ? '' : 's'}</span>
              </div>
              {attendanceDrafts.length ? (
                <div className="overflow-x-auto rounded-xl border border-bp-border">
                  <table className="w-full min-w-[840px] text-left text-xs">
                    <thead className="bg-bp-background text-[10px] uppercase text-bp-muted"><tr>
                      <th className="px-3 py-2">Date</th><th className="px-3 py-2">Attendance</th><th className="px-3 py-2">Working hours</th><th className="px-3 py-2">Overtime</th><th className="px-3 py-2">Remarks</th>
                    </tr></thead>
                    <tbody className="divide-y divide-bp-border">
                      {attendanceDrafts.map(record => {
                        const allowsHours = record.status === 'Present' || record.status === 'Half Day';
                        return <tr key={record.id}>
                          <td className="whitespace-nowrap px-3 py-2.5"><input required aria-label={`Attendance date ${record.id}`} type="date" value={record.date} onChange={event => updateAttendance(record.id, { date: event.target.value })} className="rounded-lg border border-bp-border-strong px-2 py-2 text-xs" /></td>
                          <td className="px-3 py-2"><select value={record.status} onChange={event => updateAttendance(record.id, statusChanged(event.target.value as AttendanceStatus))} className="w-full rounded-lg border border-bp-border-strong bg-white px-2 py-2 text-xs">{attendanceStatuses.map(status => <option key={status} value={status}>{status}</option>)}</select></td>
                          <td className="px-3 py-2"><input aria-label={`Working hours ${record.date}`} required={allowsHours} disabled={!allowsHours} type="number" min="0" max="24" step="any" value={record.working_hours} onChange={event => updateAttendance(record.id, { working_hours: event.target.value })} className="w-24 rounded-lg border border-bp-border-strong px-2 py-2 disabled:bg-bp-background disabled:text-bp-muted" /></td>
                          <td className="px-3 py-2"><input aria-label={`Overtime hours ${record.date}`} disabled={!allowsHours} type="number" min="0" max="24" step="any" value={record.overtime_hours} onChange={event => updateAttendance(record.id, { overtime_hours: event.target.value })} className="w-24 rounded-lg border border-bp-border-strong px-2 py-2 disabled:bg-bp-background disabled:text-bp-muted" /></td>
                          <td className="px-3 py-2"><input aria-label={`Attendance remarks ${record.date}`} value={record.remarks} onChange={event => updateAttendance(record.id, { remarks: event.target.value })} className="w-full min-w-40 rounded-lg border border-bp-border-strong px-2 py-2" /></td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <p className="rounded-xl border border-dashed border-bp-border p-4 text-xs text-bp-muted">No attendance records exist for this worker in the selected period.</p>}
            </section>

            <section className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-bp-text">Payment transactions</h3>
                  <p className="mt-1 text-xs text-bp-muted">Edit an existing transaction here. New payments remain available through Record Salary / Advance Payment.</p>
                </div>
                <span className="text-xs text-bp-muted">{paymentDrafts.length} existing transaction{paymentDrafts.length === 1 ? '' : 's'}</span>
              </div>
              {paymentDrafts.length ? (
                <div className="space-y-3">
                  {paymentDrafts.map((payment, index) => {
                    const editing = editingPaymentId === payment.id;
                    const amount = payment.amount.trim() ? Number(payment.amount) : Number.NaN;
                    return <div key={payment.id} className="rounded-xl border border-bp-border p-3 sm:p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-bp-text">Transaction {index + 1} · {payment.id}</h4>
                          <p className="mt-1 text-[11px] text-bp-muted">{payment.payment_type || 'Type missing'} · {payment.payment_date || 'Date missing'} · {Number.isFinite(amount) ? money(amount) : 'Amount missing'}</p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" disabled={saving || Boolean(editingPaymentId && !editing)} onClick={() => {
                            setError(null);
                            if (editing) {
                              restorePaymentDraft(payment.id);
                              setEditingPaymentId(null);
                            } else {
                              setEditingPaymentId(payment.id);
                            }
                          }} className="rounded-lg border border-bp-border px-3 py-1.5 text-xs font-semibold text-bp-text hover:bg-bp-background disabled:opacity-50">{editing ? 'Cancel edit' : 'Edit'}</button>
                          <button type="button" disabled={saving} onClick={() => void handleDeletePayment(payment)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Delete</button>
                        </div>
                      </div>
                      {editing ? (
                        <>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <label className={labelClass}>Payment date *<input required type="date" value={payment.payment_date} onChange={event => updatePayment(payment.id, { payment_date: event.target.value })} className={fieldClass} /></label>
                            <label className={labelClass}>Amount (₹) *<input required type="number" min="0.01" step="0.01" value={payment.amount} onChange={event => updatePayment(payment.id, { amount: event.target.value })} className={fieldClass} /></label>
                            <label className={labelClass}>Transaction type<select required value={payment.payment_type} onChange={event => updatePayment(payment.id, { payment_type: event.target.value as PaymentDraft['payment_type'] })} className={fieldClass}><option value="" disabled>Select type</option><option value="salary">Salary / wage payment</option><option value="advance">Advance</option><option value="bonus">Bonus</option><option value="deduction">Deduction</option></select></label>
                            <label className={labelClass}>Payment method<select required value={payment.payment_method} onChange={event => updatePayment(payment.id, { payment_method: event.target.value as PaymentDraft['payment_method'] })} className={fieldClass}><option value="" disabled>Select method</option><option value="Cash">Cash</option><option value="Bank Transfer">Bank Transfer</option><option value="UPI">UPI</option><option value="Cheque">Cheque</option></select></label>
                            <label className={`${labelClass} sm:col-span-2`}>Reference number<input value={payment.reference_no} onChange={event => updatePayment(payment.id, { reference_no: event.target.value })} className={fieldClass} /></label>
                            <label className={`${labelClass} sm:col-span-2`}>Payment remarks<input value={payment.remarks} onChange={event => updatePayment(payment.id, { remarks: event.target.value })} className={fieldClass} /></label>
                          </div>
                          <AttachmentSections value={payment.attachments} onChange={attachments => updatePayment(payment.id, { attachments })} onUploadFile={onUploadFile} disabled={saving} />
                        </>
                      ) : (
                        <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                          <p><span className="text-bp-muted">Amount: </span><b>{Number.isFinite(amount) ? money(amount) : 'Saved amount unavailable'}</b></p>
                          <p><span className="text-bp-muted">Date: </span><b>{payment.payment_date || 'Saved date unavailable'}</b></p>
                          <p><span className="text-bp-muted">Type: </span><b>{payment.payment_type || 'Saved type unavailable'}</b></p>
                          <p><span className="text-bp-muted">Method: </span><b>{payment.payment_method || 'Saved method unavailable'}</b></p>
                          <p className="sm:col-span-2"><span className="text-bp-muted">Reference: </span>{payment.reference_no || '—'}</p>
                          <p className="sm:col-span-2"><span className="text-bp-muted">Remarks: </span>{payment.remarks || '—'}</p>
                          <div className="sm:col-span-2 lg:col-span-4"><span className="text-bp-muted">Attachments: </span><AttachmentLinks attachments={payment.attachments} /></div>
                        </div>
                      )}
                    </div>;
                  })}
                </div>
              ) : <p className="rounded-xl border border-dashed border-bp-border p-4 text-xs text-bp-muted">No payment transactions exist for this worker in the selected period.</p>}
            </section>

            <section className="rounded-xl border border-bp-border bg-bp-background p-4">
              <h3 className="text-sm font-bold text-bp-text">Calculated summary preview</h3>
              <p className="mb-3 mt-1 text-xs text-bp-muted">These totals update from the values above and will refresh in the table after saving.</p>
              {preview.invalidPaymentCount > 0 && <p role="alert" className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{preview.invalidPaymentCount} transaction(s) have a missing or invalid amount/type. Edit those transactions before relying on the payment totals.</p>}
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4 lg:grid-cols-8">
                <div><span className="block text-bp-muted">P / HD / A</span><b>{preview.present} / {preview.halfDays} / {preview.absent}</b></div>
                <div><span className="block text-bp-muted">Pay days</span><b>{preview.payableDays}</b></div>
                <div><span className="block text-bp-muted">Hours (OT)</span><b>{preview.hours}h ({preview.overtime}h)</b></div>
                <div><span className="block text-bp-muted">Gross earned</span><b>{money(preview.gross)}</b></div>
                <div><span className="block text-bp-muted">Advances</span><b>{preview.invalidPaymentCount ? 'Unavailable' : money(preview.advances)}</b></div>
                <div><span className="block text-bp-muted">Deductions</span><b>{preview.invalidPaymentCount ? 'Unavailable' : money(preview.deductions)}</b></div>
                <div><span className="block text-bp-muted">Paid out</span><b>{preview.invalidPaymentCount ? 'Unavailable' : money(preview.paid)}</b></div>
                <div><span className="block text-bp-muted">Balance</span><b>{preview.invalidPaymentCount ? 'Unavailable' : money(preview.balance)}</b></div>
              </div>
            </section>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-bp-border bg-white px-4 py-3 sm:px-6">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg px-4 py-2 text-sm font-semibold text-bp-muted hover:bg-bp-background disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-bp-cyan px-5 py-2 text-sm font-bold text-bp-text hover:bg-bp-blue disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
