import React, { useEffect, useMemo, useState } from 'react';
import { Search, Users, X } from 'lucide-react';
import type { AttendanceGroup, DailyAttendanceRecord, Employee, UserProfile } from '../types';
import { attendanceService } from '../services/attendanceService';

interface EmployeeDirectoryViewProps { currentUser: UserProfile; }

const statusStyle: Record<Employee['status'], string> = {
  active: 'bg-emerald-100 text-emerald-800',
  inactive: 'bg-slate-100 text-slate-700',
  resigned: 'bg-rose-100 text-rose-800'
};

export const EmployeeDirectoryView: React.FC<EmployeeDirectoryViewProps> = ({ currentUser }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [groups, setGroups] = useState<AttendanceGroup[]>([]);
  const [records, setRecords] = useState<DailyAttendanceRecord[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [selected, setSelected] = useState<Employee | null>(null);

  const load = async () => {
    const [allEmployees, allGroups, allRecords] = await Promise.all([
      attendanceService.getEmployees(), attendanceService.getGroups(), attendanceService.getAttendanceRecords()
    ]);
    const companyId = currentUser.company_id.trim();
    setEmployees(allEmployees.filter(employee => employee.company_id.trim() === companyId));
    setGroups(allGroups.filter(group => group.company_id.trim() === companyId));
    setRecords(allRecords.filter(record => record.company_id.trim() === companyId));
  };

  useEffect(() => { void load(); }, [currentUser.company_id]);

  const visibleEmployees = useMemo(() => employees.filter(employee => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || employee.full_name.toLowerCase().includes(term)
      || employee.employee_code.toLowerCase().includes(term) || (employee.phone || '').includes(term);
    return matchesSearch && (statusFilter === 'all' || employee.status === statusFilter)
      && (groupFilter === 'all' || (groupFilter === 'ungrouped' ? !employee.group_id : employee.group_id === groupFilter));
  }).sort((a, b) => a.employee_code.localeCompare(b.employee_code, undefined, { numeric: true })),
  [employees, search, statusFilter, groupFilter]);

  const markResigned = async (employee: Employee) => {
    if (!window.confirm(`Mark ${employee.full_name} as resigned? Their history will be retained.`)) return;
    await attendanceService.updateEmployee(employee.id, { status: 'resigned' });
    await load();
    setSelected({ ...employee, status: 'resigned' });
  };

  const selectedWorkHistory = selected ? records.filter(record => record.employee_id === selected.id)
    .sort((a, b) => b.date.localeCompare(a.date)) : [];

  return <div className="space-y-4">
    <section className="rounded-2xl border border-bp-border bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-xl font-bold text-bp-text">Employee Directory</h1>
          <p className="mt-1 text-sm text-bp-muted">Company-wide employee register, current group assignments, and recorded work history.</p></div>
        <div className="rounded-xl bg-bp-background px-4 py-2 text-sm font-semibold">{employees.length} employees</div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-bp-muted"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, employee ID, phone" className="w-full rounded-xl border border-bp-border py-2 pl-9 pr-3 text-sm" /></label>
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="rounded-xl border border-bp-border px-3 py-2 text-sm"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="resigned">Resigned</option></select>
        <select value={groupFilter} onChange={event => setGroupFilter(event.target.value)} className="rounded-xl border border-bp-border px-3 py-2 text-sm"><option value="all">All groups</option><option value="ungrouped">Individual / unassigned</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
      </div>
    </section>
    <section className="overflow-hidden rounded-2xl border border-bp-border bg-white shadow-xs">
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-bp-navy text-[11px] uppercase text-white"><tr>{['Employee ID','Employee','Trade','Current Group','Joined','Status','Details'].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-bp-border">{visibleEmployees.length ? visibleEmployees.map(employee => <tr key={employee.id} className="hover:bg-bp-background/70">
          <td className="px-4 py-3 font-mono font-semibold">{employee.employee_code}</td><td className="px-4 py-3 font-semibold">{employee.full_name}<span className="block text-xs font-normal text-bp-muted">{employee.phone || 'No phone on file'}</span></td>
          <td className="px-4 py-3">{employee.job_type}</td><td className="px-4 py-3">{employee.group_name || 'Individual / unassigned'}</td><td className="px-4 py-3">{employee.joining_date || '—'}</td>
          <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyle[employee.status]}`}>{employee.status}</span></td>
          <td className="px-4 py-3"><button onClick={() => setSelected(employee)} className="rounded-lg border border-bp-border px-3 py-1.5 text-xs font-semibold">View details</button></td>
        </tr>) : <tr><td colSpan={7} className="px-4 py-12 text-center text-bp-muted"><Users className="mx-auto mb-2 h-6 w-6"/>No employees match these filters.</td></tr>}</tbody>
      </table></div>
    </section>
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="employee-detail-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <header className="flex items-start justify-between gap-3"><div><h2 id="employee-detail-title" className="text-lg font-bold">{selected.full_name}</h2><p className="text-sm text-bp-muted">{selected.employee_code} · {selected.job_type}</p></div><button aria-label="Close details" onClick={() => setSelected(null)}><X className="h-5 w-5"/></button></header>
        <div className="mt-4 grid gap-3 rounded-xl bg-bp-background p-4 text-sm sm:grid-cols-2"><p><b>Status:</b> <span className="capitalize">{selected.status}</span></p><p><b>Current group:</b> {selected.group_name || 'Individual / unassigned'}</p><p><b>Site:</b> {selected.project_name || '—'}</p><p><b>Joined:</b> {selected.joining_date || '—'}</p><p><b>Phone:</b> {selected.phone || '—'}</p><p><b>Rate:</b> ₹{selected.salary_amount} / {selected.salary_type === 'daily_wage' ? 'day' : 'month'}</p></div>
        <div className="mt-5"><h3 className="font-bold">Recorded work history</h3><p className="mb-2 text-xs text-bp-muted">Attendance records show the group and site recorded for each work day.</p><div className="max-h-64 divide-y divide-bp-border overflow-y-auto rounded-xl border border-bp-border">{selectedWorkHistory.length ? selectedWorkHistory.map(record => <div key={record.id} className="flex flex-wrap justify-between gap-2 px-3 py-2 text-sm"><span>{record.date} · {record.group_name || 'Individual'}{record.project_name ? ` · ${record.project_name}` : ''}</span><span className="font-semibold">{record.status} · {record.payable_days} day(s)</span></div>) : <p className="p-4 text-sm text-bp-muted">No attendance history is recorded for this employee.</p>}</div></div>
        {(currentUser.role === 'admin' || currentUser.role === 'project_manager') && selected.status !== 'resigned' && <button onClick={() => void markResigned(selected)} className="mt-4 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700">Mark as resigned</button>}
      </section>
    </div>}
  </div>;
};
