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
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {employee?.photo_url ? (
              <img
                src={employee.photo_url}
                alt={currentUser.full_name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#FFC400] shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#111111] text-[#FFC400] flex items-center justify-center font-bold text-xl shrink-0">
                {currentUser.full_name.charAt(0)}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#FFC400] text-[#111111] font-mono">
                  WORKER PORTAL
                </span>
                <span className="text-xs text-[#666666]">
                  User ID: <strong className="font-mono text-[#111111]">{currentUser.user_id || 'CHEN-WRK'}</strong>
                </span>
              </div>
              <h1 className="text-2xl font-bold text-[#111111] tracking-tight mt-0.5">
                {currentUser.full_name}
              </h1>
              <p className="text-xs text-[#666666] flex items-center gap-2 mt-1">
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
              className="px-4 py-2.5 bg-[#111111] hover:bg-[#222222] text-[#FFC400] font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-[#FFC400]" />
              <span>Download My Statement (CSV)</span>
            </button>
          </div>
        </div>

        {/* Worker Financial & Attendance Summary */}
        <div className="pt-4 border-t border-[#E8E8E8] grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#F7F7F7] p-3 rounded-xl border border-[#E8E8E8]">
            <p className="text-[11px] font-semibold text-[#666666] uppercase">Days Worked</p>
            <p className="text-xl font-bold text-[#111111] font-mono mt-0.5">
              {totalDays} <span className="text-xs font-normal text-[#666666]">present</span>
              {halfDays > 0 && <span className="text-xs text-amber-700 ml-1">({halfDays} half)</span>}
            </p>
          </div>
          <div className="bg-[#F7F7F7] p-3 rounded-xl border border-[#E8E8E8]">
            <p className="text-[11px] font-semibold text-[#666666] uppercase">Hours Logged</p>
            <p className="text-xl font-bold text-[#111111] font-mono mt-0.5">
              {totalHours} <span className="text-xs font-normal text-[#666666]">hrs</span>
              {totalOtHours > 0 && <span className="text-xs text-blue-700 ml-1">(+{totalOtHours} OT)</span>}
            </p>
          </div>
          <div className="bg-[#F7F7F7] p-3 rounded-xl border border-[#E8E8E8]">
            <p className="text-[11px] font-semibold text-[#666666] uppercase">Gross Earnings</p>
            <p className="text-xl font-bold text-[#111111] font-mono mt-0.5">
              ₹{grossEarnings.toLocaleString()}
            </p>
          </div>
          <div className="bg-[#F7F7F7] p-3 rounded-xl border border-[#E8E8E8]">
            <p className="text-[11px] font-semibold text-[#666666] uppercase">Pending Balance</p>
            <p className="text-xl font-bold text-emerald-700 font-mono mt-0.5">
              ₹{remainingBalance.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Daily Attendance History */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden shadow-xs space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#FFC400]" />
            <h2 className="text-base font-bold text-[#111111]">My Daily Attendance & Daily Wage Records</h2>
          </div>
          <span className="text-xs text-[#666666]">{records.length} logged shifts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] text-white uppercase font-bold text-[11px]">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-3 py-3">In / Out</th>
                <th className="px-2 py-3 text-center">Hours</th>
                <th className="px-2 py-3 text-center">OT (h)</th>
                <th className="px-3 py-3 text-right">Applicable Wage</th>
                <th className="px-3 py-3 text-right bg-[#222222] text-[#FFC400]">Daily Earnings</th>
                <th className="px-4 py-3">Site / Work Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8E8]">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#666666]">
                    No attendance records marked for your profile yet.
                  </td>
                </tr>
              ) : (
                records.map(r => (
                  <tr key={r.id} className="hover:bg-[#F9F9F9]">
                    <td className="px-4 py-3 font-mono font-bold text-[#111111]">
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
                    <td className="px-3 py-3 font-mono text-[#666666]">
                      {r.check_in_time || '—'} – {r.check_out_time || '—'}
                    </td>
                    <td className="px-2 py-3 text-center font-mono font-semibold text-[#111111]">
                      {r.working_hours}
                    </td>
                    <td className="px-2 py-3 text-center font-mono text-blue-700 font-bold">
                      {r.overtime_hours > 0 ? `+${r.overtime_hours}` : '—'}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[#555555]">
                      ₹{r.salary_rate}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-[#111111] bg-[#FFC400]/10">
                      ₹{r.daily_earnings.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[#666666] italic">
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
      <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden shadow-xs space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <h2 className="text-base font-bold text-[#111111]">Payment Receipts & Advances</h2>
          </div>
          <span className="text-xs text-[#666666]">{payments.length} transactions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F7F7] text-[#666666] uppercase font-bold text-[10px] border-b border-[#E8E8E8]">
              <tr>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-3 py-2.5">Payment Type</th>
                <th className="px-3 py-2.5">Method</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
                <th className="px-4 py-2.5">Reference / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8E8]">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[#666666]">
                    No payments or advances recorded for your profile.
                  </td>
                </tr>
              ) : (
                payments.map(p => (
                  <tr key={p.id} className="hover:bg-[#F9F9F9]">
                    <td className="px-4 py-2.5 font-mono">{p.payment_date}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {p.payment_type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[#555555]">{p.payment_method}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-[#111111]">
                      ₹{p.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-[#666666]">
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
