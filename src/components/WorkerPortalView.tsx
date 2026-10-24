import React, { useState, useEffect } from 'react';
import {
  User,
  Clock,
  DollarSign,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Building2,
  Phone,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { UserProfile, Employee, DailyAttendanceRecord, SalaryPaymentRecord } from '../types';
import { attendanceService } from '../services/attendanceService';

interface WorkerPortalViewProps {
  currentUser: UserProfile;
}

export const WorkerPortalView: React.FC<WorkerPortalViewProps> = ({ currentUser }) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [records, setRecords] = useState<DailyAttendanceRecord[]>([]);
  const [payments, setPayments] = useState<SalaryPaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadWorkerData = async () => {
      try {
        setIsLoading(true);
        // Find worker's linked employee profile
        let matchedEmp: Employee | null = null;
        if (currentUser.employee_id) {
          matchedEmp = await attendanceService.getEmployeeById(currentUser.employee_id);
        }
        if (!matchedEmp) {
          // Attempt match by email or name
          const allEmps = await attendanceService.getEmployees();
          matchedEmp = allEmps.find(
            e => e.full_name.toLowerCase() === currentUser.full_name.toLowerCase()
          ) || allEmps[0] || null;
        }

        setEmployee(matchedEmp);

        if (matchedEmp) {
          const [recList, payList] = await Promise.all([
            attendanceService.getAttendanceRecords({ employeeId: matchedEmp.id }),
            attendanceService.getPayments({ employeeId: matchedEmp.id })
          ]);
          setRecords(recList);
          setPayments(payList);
        }
      } catch (err) {
        console.error('Failed to load worker personal data', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkerData();
  }, [currentUser]);

  // Aggregate metrics
  const totalDays = records.filter(r => r.status === 'Present').length;
  const halfDays = records.filter(r => r.status === 'Half Day').length;
  const totalHours = records.reduce((sum, r) => sum + (r.working_hours || 0), 0);
  const totalOtHours = records.reduce((sum, r) => sum + (r.overtime_hours || 0), 0);
  const grossEarnings = records.reduce((sum, r) => sum + (r.daily_earnings || 0), 0);
  const totalPaid = payments
    .filter(p => p.payment_type !== 'deduction')
    .reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = grossEarnings - totalPaid;

  const handleDownloadPersonalCsv = () => {
    if (!employee) return;
    const rows = [
      ['Date', 'Status', 'Check-In', 'Check-Out', 'Hours', 'OT Hours', 'Daily Rate', 'Earnings', 'Remarks'],
      ...records.map(r => [
        r.date,
        r.status,
        r.check_in_time || '—',
        r.check_out_time || '—',
        r.working_hours,
        r.overtime_hours,
        r.salary_rate,
        r.daily_earnings,
        r.remarks || ''
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${employee.full_name.replace(/\s+/g, '_')}_Attendance_Statement.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-['Inter',sans-serif] animate-in fade-in duration-150">
      
      {/* Worker Header Card */}
      <div className="bg-white rounded-2xl border border-bp-border p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {employee?.photo_url ? (
              <img
                src={employee.photo_url}
                alt={currentUser.full_name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-bp-cyan shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-bp-navy text-bp-cyan flex items-center justify-center font-bold text-xl shrink-0">
                {currentUser.full_name.charAt(0)}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-bp-cyan text-bp-text font-mono">
                  WORKER PORTAL
                </span>
                <span className="text-xs text-bp-muted">
                  User ID: <strong className="font-mono text-bp-text">{currentUser.user_id || 'CHEN-WRK'}</strong>
                </span>
              </div>
              <h1 className="text-2xl font-bold text-bp-text tracking-tight mt-0.5">
                {currentUser.full_name}
              </h1>
              <p className="text-xs text-bp-muted flex items-center gap-2 mt-1">
                <span>Trade: <strong>{employee?.job_type || 'Specialist Worker'}</strong></span>
                <span>•</span>
                <span>Team: <strong>{employee?.group_name || 'Assigned Gang'}</strong></span>
                <span>•</span>
                <span>Site: <strong>{employee?.project_name || 'Skyline Commercial Hub'}</strong></span>
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <button
              onClick={handleDownloadPersonalCsv}
              disabled={records.length === 0}
              className="px-4 py-2.5 bg-bp-navy hover:bg-bp-navy-light text-bp-cyan font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-bp-cyan" />
              <span>Download My Statement (CSV)</span>
            </button>
          </div>
        </div>

        {/* Worker Financial & Attendance Summary */}
        <div className="pt-4 border-t border-bp-border grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-bp-background p-3 rounded-xl border border-bp-border">
            <p className="text-[11px] font-semibold text-bp-muted uppercase">Days Worked</p>
            <p className="text-xl font-bold text-bp-text font-mono mt-0.5">
              {totalDays} <span className="text-xs font-normal text-bp-muted">present</span>
              {halfDays > 0 && <span className="text-xs text-amber-700 ml-1">({halfDays} half)</span>}
            </p>
          </div>
          <div className="bg-bp-background p-3 rounded-xl border border-bp-border">
            <p className="text-[11px] font-semibold text-bp-muted uppercase">Hours Logged</p>
            <p className="text-xl font-bold text-bp-text font-mono mt-0.5">
              {totalHours} <span className="text-xs font-normal text-bp-muted">hrs</span>
              {totalOtHours > 0 && <span className="text-xs text-blue-700 ml-1">(+{totalOtHours} OT)</span>}
            </p>
          </div>
          <div className="bg-bp-background p-3 rounded-xl border border-bp-border">
            <p className="text-[11px] font-semibold text-bp-muted uppercase">Gross Earnings</p>
            <p className="text-xl font-bold text-bp-text font-mono mt-0.5">
              ₹{grossEarnings.toLocaleString()}
            </p>
          </div>
          <div className="bg-bp-background p-3 rounded-xl border border-bp-border">
            <p className="text-[11px] font-semibold text-bp-muted uppercase">Pending Balance</p>
            <p className="text-xl font-bold text-emerald-700 font-mono mt-0.5">
              ₹{remainingBalance.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Daily Attendance History */}
      <div className="bg-white rounded-2xl border border-bp-border overflow-hidden shadow-xs space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-bp-cyan" />
            <h2 className="text-base font-bold text-bp-text">My Daily Attendance & Daily Wage Records</h2>
          </div>
          <span className="text-xs text-bp-muted">{records.length} logged shifts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bp-navy text-white uppercase font-bold text-[11px]">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-3 py-3">In / Out</th>
                <th className="px-2 py-3 text-center">Hours</th>
                <th className="px-2 py-3 text-center">OT (h)</th>
                <th className="px-3 py-3 text-right">Applicable Wage</th>
                <th className="px-3 py-3 text-right bg-bp-navy-light text-bp-cyan">Daily Earnings</th>
                <th className="px-4 py-3">Site / Work Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-bp-muted">
                    No attendance records marked for your profile yet.
                  </td>
                </tr>
              ) : (
                records.map(r => (
                  <tr key={r.id} className="hover:bg-bp-background">
                    <td className="px-4 py-3 font-mono font-bold text-bp-text">
                      {r.date}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        r.status === 'Present'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'Half Day'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-bp-muted">
                      {r.check_in_time || '—'} – {r.check_out_time || '—'}
                    </td>
                    <td className="px-2 py-3 text-center font-mono font-semibold text-bp-text">
                      {r.working_hours}
                    </td>
                    <td className="px-2 py-3 text-center font-mono text-blue-700 font-bold">
                      {r.overtime_hours > 0 ? `+${r.overtime_hours}` : '—'}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-bp-text-subtle">
                      ₹{r.salary_rate}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-bp-text bg-bp-cyan/10">
                      ₹{r.daily_earnings.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-bp-muted italic">
                      {r.remarks || 'Standard site shift'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Receipts History */}
      <div className="bg-white rounded-2xl border border-bp-border overflow-hidden shadow-xs space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <h2 className="text-base font-bold text-bp-text">Payment Receipts & Advances</h2>
          </div>
          <span className="text-xs text-bp-muted">{payments.length} transactions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bp-background text-bp-muted uppercase font-bold text-[10px] border-b border-bp-border">
              <tr>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-3 py-2.5">Payment Type</th>
                <th className="px-3 py-2.5">Method</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
                <th className="px-4 py-2.5">Reference / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-bp-muted">
                    No payments or advances recorded for your profile.
                  </td>
                </tr>
              ) : (
                payments.map(p => (
                  <tr key={p.id} className="hover:bg-bp-background">
                    <td className="px-4 py-2.5 font-mono">{p.payment_date}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {p.payment_type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-bp-text-subtle">{p.payment_method}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-bp-text">
                      ₹{p.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-bp-muted">
                      {p.reference_no && <span className="font-mono mr-2">{p.reference_no}</span>}
                      {p.remarks}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
