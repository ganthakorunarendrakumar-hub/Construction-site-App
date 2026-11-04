import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Clock3,
  Edit2,
  MapPin,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  X
} from 'lucide-react';
import { DailyAttendanceRecord, Employee, MaterialLocation, Project, UserProfile } from '../types';
import { attendanceService, DuplicateAttendanceRecordError, IndividualAttendanceStatus } from '../services/attendanceService';
import { dataService } from '../services/dataService';
import { getLocalDateString } from '../utils/dateUtils';

const PRIMARY_PROJECT_SITE = '__primary_project_site__';

interface IndividualAttendanceViewProps {
  currentUser: UserProfile;
  employees: Employee[];
  onRecordsChanged: () => Promise<void>;
  onOpenGroupRecord: (record: DailyAttendanceRecord) => void;
}

const INDIVIDUAL_STATUSES: IndividualAttendanceStatus[] = ['Present', 'Absent', 'Half Day', 'Leave'];

export const IndividualAttendanceView: React.FC<IndividualAttendanceViewProps> = ({
  currentUser,
  employees,
  onRecordsChanged,
  onOpenGroupRecord
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [records, setRecords] = useState<DailyAttendanceRecord[]>([]);
  const [sites, setSites] = useState<MaterialLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [duplicateRecord, setDuplicateRecord] = useState<DailyAttendanceRecord | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [siteId, setSiteId] = useState(PRIMARY_PROJECT_SITE);
  const [attendanceDate, setAttendanceDate] = useState(getLocalDateString());
  const [status, setStatus] = useState<IndividualAttendanceStatus>('Present');
  const [workingHours, setWorkingHours] = useState('8');
  const [overtimeHours, setOvertimeHours] = useState('0');
  const [remarks, setRemarks] = useState('');

  const [filterEmployeeId, setFilterEmployeeId] = useState('all');
  const [filterProjectId, setFilterProjectId] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      if (dataService.isCloudConnected()) await dataService.syncCloudState();
      const [projectRows, attendanceRows] = await Promise.all([
        dataService.getProjects(),
        attendanceService.getAttendanceRecords()
      ]);
      setProjects(projectRows.filter(project => project.company_id === currentUser.company_id));
      setRecords(attendanceRows.filter(record => record.company_id === currentUser.company_id));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Attendance data could not be refreshed.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [currentUser.company_id]);

  useEffect(() => {
    void loadData(true);
    let active = true;
    const refresh = async () => {
      if (!active || document.visibilityState !== 'visible') return;
      await loadData(false);
    };
    const interval = window.setInterval(refresh, 10000);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [loadData]);

  useEffect(() => {
    let active = true;
    const loadSites = async () => {
      if (!projectId) {
        setSites([]);
        setSiteId(PRIMARY_PROJECT_SITE);
        return;
      }
      try {
        const locations = await dataService.getMaterialLocations(projectId);
        if (!active) return;
        const companyLocations = locations.filter(location => location.company_id === currentUser.company_id);
        setSites(companyLocations);
        setSiteId(current => companyLocations.some(location => location.id === current)
          ? current
          : companyLocations[0]?.id || PRIMARY_PROJECT_SITE);
      } catch (siteError) {
        if (!active) return;
        setSites([]);
        setSiteId(PRIMARY_PROJECT_SITE);
        setError(siteError instanceof Error ? siteError.message : 'Project sites could not be loaded.');
      }
    };
    void loadSites();
    return () => { active = false; };
  }, [projectId, currentUser.company_id]);

  const companyEmployees = useMemo(
    () => employees.filter(employee => employee.company_id === currentUser.company_id),
    [employees, currentUser.company_id]
  );
  const activeEmployees = useMemo(
    () => companyEmployees.filter(employee => employee.status === 'active'),
    [companyEmployees]
  );
  const selectedEmployee = companyEmployees.find(employee => employee.id === employeeId);
  const selectedProject = projects.find(project => project.id === projectId);
  const assignedProject = projects.find(project => project.id === selectedEmployee?.project_id);
  const selectedSiteName = sites.find(site => site.id === siteId)?.name
    || (siteId === PRIMARY_PROJECT_SITE ? selectedProject?.location || selectedProject?.name : undefined);
  const canManageSelectedProject = Boolean(projectId && attendanceService.canManageAttendance(projectId));

  const filteredRecords = useMemo(() => records.filter(record => {
    if (record.attendance_source !== 'individual') return false;
    if (filterEmployeeId !== 'all' && record.employee_id !== filterEmployeeId) return false;
    if (filterProjectId !== 'all' && record.project_id !== filterProjectId) return false;
    if (filterStatus !== 'all' && record.status !== filterStatus) return false;
    if (filterFromDate && record.date < filterFromDate) return false;
    if (filterToDate && record.date > filterToDate) return false;
    return true;
  }), [records, filterEmployeeId, filterProjectId, filterStatus, filterFromDate, filterToDate]);

  const resetForm = () => {
    setEditingRecordId(null);
    setEmployeeId('');
    setProjectId('');
    setSiteId(PRIMARY_PROJECT_SITE);
    setAttendanceDate(getLocalDateString());
    setStatus('Present');
    setWorkingHours('8');
    setOvertimeHours('0');
    setRemarks('');
    setDuplicateRecord(null);
  };

  const beginEdit = (record: DailyAttendanceRecord) => {
    if (!attendanceService.canManageAttendance(record.project_id)) return;
    if (record.attendance_source !== 'individual') {
      onOpenGroupRecord(record);
      return;
    }
    setEditingRecordId(record.id);
    setEmployeeId(record.employee_id);
    setProjectId(record.project_id || '');
    setSiteId(record.site_id || PRIMARY_PROJECT_SITE);
    setAttendanceDate(record.date);
    setStatus(INDIVIDUAL_STATUSES.includes(record.status as IndividualAttendanceStatus)
      ? record.status as IndividualAttendanceStatus
      : 'Present');
    setWorkingHours(String(record.working_hours || 0));
    setOvertimeHours(String(record.overtime_hours || 0));
    setRemarks(record.remarks || '');
    setDuplicateRecord(null);
    setError(null);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEmployeeChange = (nextEmployeeId: string) => {
    setEmployeeId(nextEmployeeId);
    const employee = companyEmployees.find(item => item.id === nextEmployeeId);
    const assignedProjectId = employee?.project_id && projects.some(project => project.id === employee.project_id)
      ? employee.project_id
      : projects[0]?.id || '';
    setProjectId(assignedProjectId);
    if (employee) setWorkingHours(String(employee.standard_hours_per_day || 8));
  };

  const handleStatusChange = (nextStatus: IndividualAttendanceStatus) => {
    setStatus(nextStatus);
    if (nextStatus === 'Absent' || nextStatus === 'Leave') {
      setWorkingHours('0');
      setOvertimeHours('0');
    } else if (nextStatus === 'Half Day') {
      setWorkingHours(String(Math.max(0.5, (selectedEmployee?.standard_hours_per_day || 8) / 2)));
      setOvertimeHours('0');
    } else if (workingHours === '0') {
      setWorkingHours(String(selectedEmployee?.standard_hours_per_day || 8));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setDuplicateRecord(null);
    setIsSaving(true);
    try {
      await attendanceService.saveIndividualAttendance({
        employee_id: employeeId,
        project_id: projectId,
        site_id: siteId === PRIMARY_PROJECT_SITE ? undefined : siteId,
        date: attendanceDate,
        status,
        working_hours: Number(workingHours),
        overtime_hours: Number(overtimeHours),
        remarks
      }, editingRecordId || undefined);
      setNotice(editingRecordId ? 'Individual attendance updated.' : 'Individual attendance saved.');
      resetForm();
      await Promise.all([loadData(false), onRecordsChanged()]);
    } catch (saveError) {
      if (saveError instanceof DuplicateAttendanceRecordError) {
        setDuplicateRecord(saveError.existingRecord);
      } else {
        setError(saveError instanceof Error ? saveError.message : 'Individual attendance could not be saved.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (record: DailyAttendanceRecord) => {
    if (!attendanceService.canManageAttendance(record.project_id)) return;
    if (!window.confirm(`Delete individual attendance for ${record.employee_name} on ${record.date}?`)) return;
    setError(null);
    try {
      await attendanceService.deleteIndividualAttendance(record.id);
      if (editingRecordId === record.id) resetForm();
      setNotice('Individual attendance deleted.');
      await Promise.all([loadData(false), onRecordsChanged()]);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Attendance record could not be deleted.');
    }
  };

  const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString();
  const currentSiteOptions = sites.length > 0
    ? sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)
    : <option value={PRIMARY_PROJECT_SITE}>{selectedProject?.location || selectedProject?.name || 'Project main site'}</option>;

  if (isLoading) {
    return <div className="rounded-2xl border border-bp-border bg-white p-10 text-center text-sm text-bp-muted">Loading individual attendance…</div>;
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-bp-text">Individual Attendance</h1>
          <p className="mt-1 text-sm text-bp-muted">Record and review attendance for one employee at a time.</p>
        </div>
        <button type="button" onClick={() => void loadData(true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-bp-border-strong bg-white px-3.5 text-sm font-semibold text-bp-text hover:bg-bp-background">
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
        </button>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

      <form onSubmit={handleSubmit} className="rounded-2xl border border-bp-border bg-white p-4 shadow-xs sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-bp-text">{editingRecordId ? 'Edit Individual Attendance' : 'Record Individual Attendance'}</h2>
          {editingRecordId && <button type="button" onClick={resetForm} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-bp-muted hover:bg-bp-background"><X className="h-3.5 w-3.5" /> Cancel edit</button>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1.5 text-sm font-medium text-bp-text">
            <span className="inline-flex items-center gap-1.5"><UserRound className="h-4 w-4 text-bp-blue" /> Employee *</span>
            <select required value={employeeId} onChange={event => handleEmployeeChange(event.target.value)} disabled={isSaving || Boolean(editingRecordId)} className="min-h-11 w-full rounded-xl border border-bp-border-strong bg-white px-3 text-sm disabled:bg-bp-background">
              <option value="">Select employee</option>
              {activeEmployees.map(employee => {
                const projectName = employee.project_name || projects.find(project => project.id === employee.project_id)?.name || 'No project assigned';
                return <option key={employee.id} value={employee.id}>{employee.full_name} · {employee.employee_code} · {employee.job_type} · {projectName}</option>;
              })}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium text-bp-text">
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-bp-blue" /> Project *</span>
            <select required value={projectId} onChange={event => setProjectId(event.target.value)} disabled={isSaving} className="min-h-11 w-full rounded-xl border border-bp-border-strong bg-white px-3 text-sm disabled:bg-bp-background">
              <option value="">Select project</option>
              {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium text-bp-text">
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-bp-blue" /> Site *</span>
            <select required value={siteId} onChange={event => setSiteId(event.target.value)} disabled={!projectId || isSaving} className="min-h-11 w-full rounded-xl border border-bp-border-strong bg-white px-3 text-sm disabled:bg-bp-background">
              {!projectId ? <option value={PRIMARY_PROJECT_SITE}>Select a project first</option> : currentSiteOptions}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium text-bp-text">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-bp-blue" /> Attendance date *</span>
            <input required type="date" value={attendanceDate} onChange={event => setAttendanceDate(event.target.value)} disabled={isSaving} className="min-h-11 w-full rounded-xl border border-bp-border-strong bg-white px-3 text-sm" />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-bp-text">
            <span>Status *</span>
            <select required value={status} onChange={event => handleStatusChange(event.target.value as IndividualAttendanceStatus)} disabled={isSaving} className="min-h-11 w-full rounded-xl border border-bp-border-strong bg-white px-3 text-sm">
              {INDIVIDUAL_STATUSES.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium text-bp-text">
            <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-bp-blue" /> Working hours *</span>
            <input required type="number" min="0" max="24" step="0.25" value={workingHours} onChange={event => setWorkingHours(event.target.value)} disabled={isSaving || status === 'Absent' || status === 'Leave'} className="min-h-11 w-full rounded-xl border border-bp-border-strong bg-white px-3 text-sm bp-numeric disabled:bg-bp-background" />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-bp-text">
            <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-bp-blue" /> Overtime hours</span>
            <input type="number" min="0" max="24" step="0.25" value={overtimeHours} onChange={event => setOvertimeHours(event.target.value)} disabled={isSaving || status === 'Absent' || status === 'Leave'} className="min-h-11 w-full rounded-xl border border-bp-border-strong bg-white px-3 text-sm bp-numeric disabled:bg-bp-background" />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-bp-text sm:col-span-2 lg:col-span-3">
            <span>Remarks <span className="font-normal text-bp-muted">(optional)</span></span>
            <textarea rows={2} value={remarks} onChange={event => setRemarks(event.target.value)} disabled={isSaving} className="w-full resize-y rounded-xl border border-bp-border-strong bg-white px-3 py-2.5 text-sm" />
          </label>
        </div>

        {selectedEmployee && (
          <div className="mt-3 space-y-1 text-xs text-bp-muted">
            <p>Employee ID: <strong className="text-bp-text">{selectedEmployee.employee_code}</strong> · Trade: <strong className="text-bp-text">{selectedEmployee.job_type}</strong> · Assigned project: <strong className="text-bp-text">{assignedProject?.name || selectedEmployee.project_name || 'Not assigned'}</strong></p>
            <p>Attendance location: <strong className="text-bp-text">{selectedProject?.name || 'Select a project'}{selectedSiteName ? ` · ${selectedSiteName}` : ''}</strong></p>
            <p>Salary calculation uses {selectedEmployee.salary_type.replace('_', ' ')} rate {selectedEmployee.salary_amount.toLocaleString()} and the existing overtime rate.</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-bp-border pt-4">
          {!canManageSelectedProject && <p className="mr-auto text-xs text-bp-muted">Select a project you are authorized to manage.</p>}
          <button type="submit" disabled={isSaving || !canManageSelectedProject || !employeeId || !projectId} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-bp-navy px-4 text-sm font-semibold text-white hover:bg-bp-blue disabled:cursor-not-allowed disabled:opacity-50">
            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {isSaving ? 'Saving…' : editingRecordId ? 'Save Changes' : 'Save Attendance'}
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-bp-border bg-white p-4 shadow-xs sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-bp-text">Individual Attendance History</h2>
            <p className="mt-1 text-xs text-bp-muted">Filter saved records by employee, project, status, and date range.</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-xs font-semibold text-bp-muted">Employee
              <select value={filterEmployeeId} onChange={event => setFilterEmployeeId(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-bp-border-strong bg-white px-2.5 text-sm text-bp-text">
                <option value="all">All employees</option>
                {companyEmployees.map(employee => <option key={employee.id} value={employee.id}>{employee.full_name} · {employee.employee_code}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-bp-muted">Project
              <select value={filterProjectId} onChange={event => setFilterProjectId(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-bp-border-strong bg-white px-2.5 text-sm text-bp-text">
                <option value="all">All projects</option>
                {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-bp-muted">From
              <input type="date" value={filterFromDate} onChange={event => setFilterFromDate(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-bp-border-strong bg-white px-2.5 text-sm text-bp-text" />
            </label>
            <label className="text-xs font-semibold text-bp-muted">To
              <input type="date" value={filterToDate} onChange={event => setFilterToDate(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-bp-border-strong bg-white px-2.5 text-sm text-bp-text" />
            </label>
            <label className="text-xs font-semibold text-bp-muted">Status
              <select value={filterStatus} onChange={event => setFilterStatus(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-bp-border-strong bg-white px-2.5 text-sm text-bp-text">
                <option value="all">All statuses</option>
                {INDIVIDUAL_STATUSES.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-bp-border">
          <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
            <thead className="bg-bp-background text-[10px] uppercase tracking-wide text-bp-muted">
              <tr>
                <th className="px-3 py-3 font-bold">Employee</th>
                <th className="px-3 py-3 font-bold">Project / Site</th>
                <th className="px-3 py-3 font-bold">Date</th>
                <th className="px-3 py-3 font-bold">Status</th>
                <th className="px-3 py-3 text-right font-bold">Hours</th>
                <th className="px-3 py-3 text-right font-bold">Overtime</th>
                <th className="px-3 py-3 font-bold">Remarks</th>
                <th className="px-3 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bp-border">
              {filteredRecords.map(record => {
                const canEdit = record.attendance_source === 'individual' && attendanceService.canManageAttendance(record.project_id);
                return (
                  <tr key={record.id} className="hover:bg-bp-background/70">
                    <td className="px-3 py-3"><span className="font-semibold text-bp-text">{record.employee_name}</span><span className="ml-1.5 text-bp-muted">{record.employee_code}</span></td>
                    <td className="px-3 py-3"><span className="block font-medium text-bp-text">{record.project_name || '—'}</span><span className="text-bp-muted">{record.site_name || '—'}</span></td>
                    <td className="px-3 py-3 whitespace-nowrap">{formatDate(record.date)}</td>
                    <td className="px-3 py-3"><span className="rounded-full border border-bp-border bg-bp-background px-2 py-1 font-semibold">{record.status}</span></td>
                    <td className="px-3 py-3 text-right bp-numeric">{record.working_hours.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right bp-numeric">{record.overtime_hours.toFixed(2)}</td>
                    <td className="max-w-56 truncate px-3 py-3" title={record.remarks || ''}>{record.remarks || '—'}</td>
                    <td className="px-3 py-3 text-right">
                      {canEdit ? <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => beginEdit(record)} aria-label={`Edit attendance for ${record.employee_name} on ${record.date}`} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-bp-border px-2.5 text-xs font-semibold text-bp-text hover:bg-bp-background"><Edit2 className="h-3.5 w-3.5" /> Edit</button>
                        <button type="button" onClick={() => void handleDelete(record)} aria-label={`Delete attendance for ${record.employee_name} on ${record.date}`} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-rose-200 px-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                      </div> : <span className="text-bp-muted">—</span>}
                    </td>
                  </tr>
                );
              })}
              {filteredRecords.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-bp-muted"><Search className="mx-auto mb-2 h-5 w-5" />No individual attendance records match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-bp-muted">{filteredRecords.length} record(s)</p>
      </section>

      {duplicateRecord && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-bp-navy/60 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setDuplicateRecord(null); }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="duplicate-attendance-title" className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
              <div>
                <h3 id="duplicate-attendance-title" className="font-bold text-bp-text">Attendance already exists</h3>
                <p className="mt-1 text-sm text-bp-muted">A record already exists for this employee, project, and date. Review it before continuing.</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-bp-background p-3 text-xs">
              <dt className="text-bp-muted">Employee</dt><dd className="text-right font-semibold text-bp-text">{duplicateRecord.employee_name} · {duplicateRecord.employee_code}</dd>
              <dt className="text-bp-muted">Project / Site</dt><dd className="text-right font-semibold text-bp-text">{duplicateRecord.project_name} · {duplicateRecord.site_name || '—'}</dd>
              <dt className="text-bp-muted">Date and status</dt><dd className="text-right font-semibold text-bp-text">{duplicateRecord.date} · {duplicateRecord.status}</dd>
              <dt className="text-bp-muted">Hours / overtime</dt><dd className="text-right font-semibold text-bp-text">{duplicateRecord.working_hours} / {duplicateRecord.overtime_hours}</dd>
            </dl>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setDuplicateRecord(null)} className="min-h-10 rounded-xl border border-bp-border px-3.5 text-sm font-semibold text-bp-text">Close</button>
              {attendanceService.canManageAttendance(duplicateRecord.project_id) && (duplicateRecord.attendance_source === 'individual'
                ? <button type="button" onClick={() => beginEdit(duplicateRecord)} className="min-h-10 rounded-xl bg-bp-navy px-3.5 text-sm font-semibold text-white">Edit Existing Record</button>
                : duplicateRecord.group_id && <button type="button" onClick={() => onOpenGroupRecord(duplicateRecord)} className="min-h-10 rounded-xl bg-bp-navy px-3.5 text-sm font-semibold text-white">Open Group Register</button>)}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
