import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Plus,
  Search,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  Edit2,
  Trash2,
  Phone,
  UserCheck,
  Check,
  X,
  Upload,
  UserPlus,
  SlidersHorizontal,
  History,
  TrendingUp,
  CreditCard,
  FileText,
  Camera,
  RefreshCw,
  Eye,
  ShieldAlert
} from 'lucide-react';
import {
  AttendanceGroup,
  Employee,
  DailyAttendanceRecord,
  SalaryPaymentRecord,
  EmployeeSalarySummary,
  AttendanceStatus,
  Project,
  UserProfile,
  SalaryType
} from '../types';
import { attendanceService } from '../services/attendanceService';
import { dataService } from '../services/dataService';
import { CreateGroupModal } from './CreateGroupModal';
import { AddEmployeeModal } from './AddEmployeeModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { AttachmentFileLink, AttachmentLinks } from './AttachmentSections';
import { getLocalDateString, getLocalDateStringOffset, getLocalMonthStartString, getLocalYearStartString } from '../utils/dateUtils';

interface AttendanceViewProps {
  currentUser: UserProfile;
  initialGroupId?: string;
  onNavigateHome?: () => void;
  onNavigateProjects?: () => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  currentUser,
  initialGroupId,
  onNavigateHome,
  onNavigateProjects
}) => {
  // Navigation State
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initialGroupId || null);
  const [activeTab, setActiveTab] = useState<'mark' | 'employees' | 'history' | 'salary' | 'reports'>('mark');

  // Core Data State
  const [groups, setGroups] = useState<AttendanceGroup[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<DailyAttendanceRecord[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<SalaryPaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals State
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AttendanceGroup | null>(null);

  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [addEmployeeDefaultGroupId, setAddEmployeeDefaultGroupId] = useState<string | undefined>(undefined);
  const [assignSuccessMessage, setAssignSuccessMessage] = useState<string | null>(null);

  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentTargetEmployee, setPaymentTargetEmployee] = useState<Employee | null>(null);
  const [paymentSuggestedAmount, setPaymentSuggestedAmount] = useState<number | undefined>(undefined);

  // Group Search & Filter
  const [groupSearch, setGroupSearch] = useState('');
  const [groupStatusFilter, setGroupStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Mark Attendance State
  const [attendanceDate, setAttendanceDate] = useState<string>(getLocalDateString());
  const [dailyForm, setDailyForm] = useState<
    Record<
      string,
      {
        status: AttendanceStatus;
        checkIn: string;
        checkOut: string;
        workingHours: number;
        overtimeHours: number;
        remarks: string;
        photoProofUrl?: string;
      }
    >
  >({});
  const attendanceFormContextRef = useRef<string | null>(null);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [attendanceSaveMessage, setAttendanceSaveMessage] = useState<string | null>(null);

  // History State
  const [historyDate, setHistoryDate] = useState<string>(getLocalDateStringOffset(-1));

  // Salary & Payments State
  const [salarySummaries, setSalarySummaries] = useState<EmployeeSalarySummary[]>([]);
  const [salaryPeriod, setSalaryPeriod] = useState<'this_month' | 'last_30_days' | 'all'>('this_month');

  // Reports State
  const [reportMode, setReportMode] = useState<'date_range' | 'up_to_date'>('date_range');
  const [reportFromDate, setReportFromDate] = useState<string>(getLocalMonthStartString());
  const [reportToDate, setReportToDate] = useState<string>(getLocalDateString());
  const [reportUpToDate, setReportUpToDate] = useState<string>(getLocalDateString());
  const [reportGroupScope, setReportGroupScope] = useState<string>('all');
  const [reportEmployeeFilter, setReportEmployeeFilter] = useState<string>('all');
  const [reportSummaries, setReportSummaries] = useState<EmployeeSalarySummary[]>([]);
  const [reportRecords, setReportRecords] = useState<DailyAttendanceRecord[]>([]);

  const isAdmin = currentUser.role === 'admin';
  const canManage = currentUser.role === 'admin' || currentUser.role === 'project_manager';

  // Load all foundational data
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [allGroups, allEmps, allProjects, allRecords, allPayments] = await Promise.all([
        attendanceService.getGroups(),
        attendanceService.getEmployees(),
        dataService.getProjects(),
        attendanceService.getAttendanceRecords(),
        attendanceService.getPayments()
      ]);
      setGroups(allGroups);
      setEmployees(allEmps);
      setProjects(allProjects);
      setAttendanceRecords(allRecords);
      setPaymentRecords(allPayments);
    } catch (err) {
      console.error('Error loading attendance data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Keep an already-open attendance screen current when another system saves
  // groups, employees, attendance, or payments to the shared cloud snapshot.
  useEffect(() => {
    let active = true;
    const refreshFromCloud = async () => {
      if (!active || document.visibilityState !== 'visible') return;
      try {
        await dataService.syncCloudState();
        if (active) await loadData();
      } catch (err) {
        console.warn('Attendance cloud refresh failed:', err);
      }
    };

    const interval = window.setInterval(refreshFromCloud, 10000);
    window.addEventListener('focus', refreshFromCloud);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshFromCloud);
    };
  }, []);

  const activeGroup = useMemo(() => {
    return groups.find(g => g.id === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  const groupEmployees = useMemo(() => {
    if (!selectedGroupId) return [];
    return employees.filter(e => e.group_id === selectedGroupId && e.status === 'active');
  }, [employees, selectedGroupId]);

  const individualEmployees = useMemo(() => {
    return employees.filter(e => !e.group_id || e.group_id === '' || e.group_id === 'ungrouped');
  }, [employees]);

  // Load daily attendance register when activeGroup or attendanceDate changes
  useEffect(() => {
    if (!selectedGroupId || isLoading) return;

    const currentRecords = attendanceRecords.filter(
      r => r.group_id === selectedGroupId && r.date === attendanceDate
    );

    const initialMap: Record<
      string,
      {
        status: AttendanceStatus;
        checkIn: string;
        checkOut: string;
        workingHours: number;
        overtimeHours: number;
        remarks: string;
        photoProofUrl?: string;
      }
    > = {};

    groupEmployees.forEach(emp => {
      const existing = currentRecords.find(r => r.employee_id === emp.id);
      if (existing) {
        initialMap[emp.id] = {
          status: existing.status,
          checkIn: existing.check_in_time || '08:00',
          checkOut: existing.check_out_time || '17:00',
          workingHours: existing.working_hours,
          overtimeHours: existing.overtime_hours,
          remarks: existing.remarks || '',
          photoProofUrl: existing.photo_proof_url
        };
      } else {
        // Default to 'Not Marked' (CRITICAL requirement: An employee who has not been marked must display Not Marked, not automatically Absent)
        initialMap[emp.id] = {
          status: 'Not Marked',
          checkIn: '08:00',
          checkOut: '17:00',
          workingHours: emp.standard_hours_per_day || 8,
          overtimeHours: 0,
          remarks: ''
        };
      }
    });

    const contextKey = `${selectedGroupId}:${attendanceDate}`;
    const contextChanged = attendanceFormContextRef.current !== contextKey;
    attendanceFormContextRef.current = contextKey;
    setDailyForm(previous => contextChanged ? initialMap : { ...initialMap, ...previous });
    setAttendanceSaveMessage(null);
  }, [selectedGroupId, attendanceDate, groupEmployees, attendanceRecords, isLoading]);

  // Load Salary summaries when group or period changes
  useEffect(() => {
    if (!selectedGroupId) return;
    async function loadSalary() {
      let fromDate = getLocalMonthStartString();
      let toDate = getLocalDateString();
      if (salaryPeriod === 'last_30_days') {
        fromDate = getLocalDateStringOffset(-29);
      } else if (salaryPeriod === 'all') {
        fromDate = getLocalYearStartString();
      }
      const sums = await attendanceService.computeSalarySummaries({
        groupId: selectedGroupId || undefined,
        fromDate,
        toDate
      });
      setSalarySummaries(sums);
    }
    loadSalary();
  }, [selectedGroupId, salaryPeriod, attendanceRecords, paymentRecords]);

  // Load report data when reports tab is active or report parameters change
  useEffect(() => {
    async function loadReports() {
      const targetGroup = reportGroupScope === 'all' ? undefined : reportGroupScope;
      const targetEmp = reportEmployeeFilter === 'all' ? undefined : reportEmployeeFilter;

      if (reportMode === 'date_range') {
        const [sums, recs] = await Promise.all([
          attendanceService.computeSalarySummaries({
            groupId: targetGroup,
            employeeId: targetEmp,
            fromDate: reportFromDate,
            toDate: reportToDate
          }),
          attendanceService.getAttendanceRecords({
            groupId: targetGroup,
            employeeId: targetEmp,
            fromDate: reportFromDate,
            toDate: reportToDate
          })
        ]);
        setReportSummaries(sums);
        setReportRecords(recs);
      } else {
        // Total Report Up To Date
        const [sums, recs] = await Promise.all([
          attendanceService.computeSalarySummaries({
            groupId: targetGroup,
            employeeId: targetEmp,
            toDate: reportUpToDate
          }),
          attendanceService.getAttendanceRecords({
            groupId: targetGroup,
            employeeId: targetEmp,
            toDate: reportUpToDate
          })
        ]);
        setReportSummaries(sums);
        setReportRecords(recs);
      }
    }
    loadReports();
  }, [
    reportMode,
    reportFromDate,
    reportToDate,
    reportUpToDate,
    reportGroupScope,
    reportEmployeeFilter,
    attendanceRecords,
    paymentRecords
  ]);

  // Handlers for Group CRUD
  const handleSaveGroup = async (groupData: any) => {
    if (editingGroup) {
      await attendanceService.updateGroup(editingGroup.id, groupData);
    } else {
      await attendanceService.createGroup(groupData);
    }
    await loadData();
    setEditingGroup(null);
  };

  const handleDeleteGroup = async (group: AttendanceGroup) => {
    if (!window.confirm(`Are you sure you want to delete "${group.name}"?`)) {
      return;
    }
    try {
      await attendanceService.deleteGroup(group.id);
      if (selectedGroupId === group.id) setSelectedGroupId(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Cannot delete group.');
    }
  };

  const handleToggleGroupStatus = async (group: AttendanceGroup) => {
    const nextStatus = group.status === 'active' ? 'inactive' : 'active';
    await attendanceService.updateGroup(group.id, {
      ...group,
      status: nextStatus
    });
    await loadData();
  };

  // Handlers for Employee CRUD
  const handleSaveEmployee = async (employeeData: any) => {
    if (editingEmployee) {
      await attendanceService.updateEmployee(editingEmployee.id, employeeData);
    } else {
      await attendanceService.createEmployee(employeeData);
    }
    await loadData();
    setEditingEmployee(null);
    setAddEmployeeDefaultGroupId(undefined);
  };

  // Handler for assigning an ungrouped employee to an existing group
  const handleAssignGroup = async (employeeId: string, targetGroupId: string) => {
    try {
      const updated = await attendanceService.assignEmployeeToGroup(employeeId, targetGroupId);
      await loadData();
      const targetGroup = groups.find(g => g.id === targetGroupId);
      setAssignSuccessMessage(
        `${updated.full_name} (${updated.employee_code}) was successfully assigned to ${targetGroup ? targetGroup.name : 'the group'}! Historical attendance & payroll records preserved.`
      );
      setTimeout(() => setAssignSuccessMessage(null), 6000);
    } catch (err: any) {
      alert(err.message || 'Failed to assign group.');
    }
  };

  // Handle Daily Attendance Updates
  const handleFormChange = (
    empId: string,
    field: 'status' | 'checkIn' | 'checkOut' | 'workingHours' | 'overtimeHours' | 'remarks',
    value: any
  ) => {
    setDailyForm(prev => {
      const current = prev[empId] || {
        status: 'Not Marked',
        checkIn: '08:00',
        checkOut: '17:00',
        workingHours: 8,
        overtimeHours: 0,
        remarks: ''
      };

      const updated = { ...current, [field]: value };

      // Auto-recalculate working hours if checkIn or checkOut changed
      if (field === 'checkIn' || field === 'checkOut') {
        const inTime = field === 'checkIn' ? value : current.checkIn;
        const outTime = field === 'checkOut' ? value : current.checkOut;
        const calcHours = attendanceService.calculateHours(inTime, outTime);
        updated.workingHours = calcHours;

        // Auto calculate overtime if workingHours exceeds standard 8 hours
        if (calcHours > 8) {
          updated.overtimeHours = Math.round((calcHours - 8) * 10) / 10;
        } else {
          updated.overtimeHours = 0;
        }
      }

      // If status changed to Half Day
      if (field === 'status' && value === 'Half Day' && updated.workingHours > 4) {
        updated.workingHours = 4;
        updated.overtimeHours = 0;
      }

      return { ...prev, [empId]: updated };
    });
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    setDailyForm(prev => {
      const next = { ...prev };
      groupEmployees.forEach(emp => {
        next[emp.id] = {
          ...(next[emp.id] || {}),
          status,
          workingHours: status === 'Present' ? 8 : status === 'Half Day' ? 4 : 0,
          overtimeHours: 0,
          checkIn: next[emp.id]?.checkIn || '08:00',
          checkOut: next[emp.id]?.checkOut || '17:00',
          remarks: next[emp.id]?.remarks || ''
        };
      });
      return next;
    });
  };

  const handleSaveDailyAttendance = async () => {
    if (!selectedGroupId) return;
    try {
      setIsSavingAttendance(true);
      setAttendanceSaveMessage(null);

      const entries = groupEmployees
        .filter(emp => !emp.joining_date || emp.joining_date <= attendanceDate)
        .map(emp => {
          const f = dailyForm[emp.id] || {
            status: 'Not Marked',
            checkIn: '08:00',
            checkOut: '17:00',
            workingHours: 0,
            overtimeHours: 0,
            remarks: ''
          };

        return {
          employee_id: emp.id,
          status: f.status,
          check_in_time: f.checkIn,
          check_out_time: f.checkOut,
          working_hours: f.workingHours,
          overtime_hours: f.overtimeHours,
          photo_proof_url: f.photoProofUrl,
          remarks: f.remarks
        };
      });

      await attendanceService.saveDailyAttendanceRegister(selectedGroupId, attendanceDate, entries);
      await loadData();
      setAttendanceSaveMessage(`Attendance register successfully saved for ${attendanceDate}!`);
    } catch (err: any) {
      alert(err.message || 'Failed to save attendance.');
    } finally {
      setIsSavingAttendance(false);
    }
  };

  // Payment Recording
  const handleSavePayment = async (paymentData: any) => {
    await attendanceService.recordPayment(paymentData);
    await loadData();
    setIsRecordPaymentOpen(false);
  };

  // CSV Export for Reports Tab
  const handleDownloadReportCsv = () => {
    const groupName = reportGroupScope === 'all'
      ? 'All Groups and Direct Workers'
      : reportGroupScope === 'ungrouped'
      ? 'Individual / Direct Workers'
      : (groups.find(g => g.id === reportGroupScope)?.name || 'Group');

    const csv = attendanceService.generateAttendanceCsv({
      reportType: reportMode,
      fromDate: reportFromDate,
      toDate: reportToDate,
      upToDate: reportUpToDate,
      groupName,
      summaries: reportSummaries,
      records: reportRecords,
      payments: paymentRecords
    });

    const filename = reportMode === 'date_range'
      ? `CHEN_INFRA_Attendance_Report_${reportFromDate}_to_${reportToDate}.csv`
      : `CHEN_INFRA_Cumulative_Attendance_Report_UpTo_${reportUpToDate}.csv`;

    attendanceService.downloadCsv(filename, csv);
  };

  // Filtered Groups for Home View
  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      const matchSearch = g.name.toLowerCase().includes(groupSearch.toLowerCase()) ||
        g.leader_name.toLowerCase().includes(groupSearch.toLowerCase()) ||
        (g.project_name && g.project_name.toLowerCase().includes(groupSearch.toLowerCase()));
      const matchStatus = groupStatusFilter === 'all' || g.status === groupStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [groups, groupSearch, groupStatusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150 font-['Inter',sans-serif]">
      
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-bp-muted">
        {onNavigateHome && (
          <button onClick={onNavigateHome} className="hover:text-bp-text transition-colors">
            CHEN INFRA
          </button>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-bp-muted" />
        {selectedGroupId ? (
          <>
            <button
              onClick={() => setSelectedGroupId(null)}
              className="hover:text-bp-text transition-colors flex items-center gap-1 font-medium"
            >
              <Users className="w-3.5 h-3.5 text-bp-cyan" />
              Attendance Groups
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-bp-muted" />
            <span className="font-semibold text-bp-text">{activeGroup?.name || 'Group Workspace'}</span>
          </>
        ) : (
          <span className="font-semibold text-bp-text flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-bp-cyan" />
            Attendance & Worker Groups
          </span>
        )}
      </nav>

      {/* ======================================================== */}
      {/* SCREEN 1: ATTENDANCE GROUPS HOME SCREEN */}
      {/* ======================================================== */}
      {!selectedGroupId ? (
        <div className="space-y-6">
          
          {/* Hero Banner with Create Group Button */}
          <div className="bg-white rounded-2xl border border-bp-border p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-bp-cyan text-bp-text font-mono">
                    CHEN INFRA ERP
                  </span>
                  <span className="text-xs text-bp-muted font-medium">
                    Group-Based Attendance & Labor Ledger
                  </span>
                </div>
                <h1 className="text-2xl sm:text-[28px] font-bold text-bp-text tracking-tight">
                  Worker Groups & Gang Attendance
                </h1>
                <p className="text-xs sm:text-sm text-bp-muted max-w-2xl">
                  Manage worker teams, subcontractor gangs, daily attendance registers, wage rates, and CSV payroll statements.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {canManage && (
                  <>
                    <button
                      onClick={() => {
                        setEditingEmployee(null);
                        setAddEmployeeDefaultGroupId(undefined);
                        setIsAddEmployeeOpen(true);
                      }}
                      className="px-4 py-2.5 bg-bp-navy hover:bg-bp-navy-light text-bp-cyan font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all hover:scale-[1.02] border border-bp-navy-border"
                      title="Add employee (individual or assign to a group)"
                    >
                      <UserPlus className="w-4 h-4 text-bp-cyan" />
                      <span>Add Employee</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingGroup(null);
                        setIsCreateGroupOpen(true);
                      }}
                      className="px-4 py-2.5 bg-bp-cyan hover:bg-bp-blue text-bp-text font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all hover:scale-[1.02]"
                    >
                      <Plus className="w-4 h-4 text-bp-text" />
                      <span>Create Group</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="pt-4 border-t border-bp-border grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-bp-background p-3 rounded-xl border border-bp-border">
                <p className="text-[11px] font-semibold text-bp-muted uppercase">Active Gang Groups</p>
                <p className="text-xl font-bold text-bp-text font-mono mt-0.5">
                  {groups.filter(g => g.status === 'active').length} <span className="text-xs font-normal text-bp-muted">groups</span>
                </p>
              </div>
              <div className="bg-bp-background p-3 rounded-xl border border-bp-border">
                <p className="text-[11px] font-semibold text-bp-muted uppercase">Gang Group Workers</p>
                <p className="text-xl font-bold text-bp-text font-mono mt-0.5">
                  {employees.filter(e => e.group_id && e.group_id !== '' && e.status === 'active').length} <span className="text-xs font-normal text-bp-muted">assigned</span>
                </p>
              </div>
              <div className="bg-bp-background p-3 rounded-xl border border-bp-border">
                <p className="text-[11px] font-semibold text-bp-muted uppercase">Individual Workers</p>
                <p className="text-xl font-bold text-bp-blue font-mono mt-0.5">
                  {individualEmployees.filter(e => e.status === 'active').length} <span className="text-xs font-normal text-bp-muted">direct</span>
                </p>
              </div>
              <div className="bg-bp-background p-3 rounded-xl border border-bp-border">
                <p className="text-[11px] font-semibold text-bp-muted uppercase">Active Sites</p>
                <p className="text-xl font-bold text-bp-text font-mono mt-0.5">
                  {projects.filter(p => p.status === 'in_progress').length} <span className="text-xs font-normal text-bp-muted">projects</span>
                </p>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl border border-bp-border p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-bp-muted absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search groups by name, leader, or site..."
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs text-bp-text rounded-xl border border-bp-border-strong focus:outline-none focus:border-bp-cyan"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-bp-muted">Status:</span>
              <select
                value={groupStatusFilter}
                onChange={(e) => setGroupStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-bp-border-strong bg-white text-bp-text focus:outline-none focus:border-bp-cyan"
              >
                <option value="all">All Groups ({groups.length})</option>
                <option value="active">Active Only ({groups.filter(g => g.status === 'active').length})</option>
                <option value="inactive">Inactive ({groups.filter(g => g.status === 'inactive').length})</option>
              </select>
            </div>
          </div>

          {/* Groups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl border border-dashed border-bp-border-strong p-12 text-center space-y-3">
                <Users className="w-10 h-10 text-bp-muted mx-auto" />
                <h3 className="text-base font-bold text-bp-text">No worker groups found</h3>
                <p className="text-xs text-bp-muted max-w-md mx-auto">
                  {groupSearch
                    ? `No groups match the search "${groupSearch}".`
                    : 'Click Create Group to register your first workforce gang.'}
                </p>
                {canManage && (
                  <button
                    onClick={() => {
                      setEditingGroup(null);
                      setIsCreateGroupOpen(true);
                    }}
                    className="px-4 py-2 bg-bp-cyan text-bp-text font-bold text-xs rounded-xl hover:bg-bp-blue transition-colors inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    Create Group Now
                  </button>
                )}
              </div>
            ) : (
              filteredGroups.map(group => {
                const count = employees.filter(e => e.group_id === group.id && e.status === 'active').length;
                const todayPresent = attendanceRecords.filter(
                  r => r.group_id === group.id && r.date === attendanceDate && r.status === 'Present'
                ).length;

                return (
                  <div
                    key={group.id}
                    className="bg-white rounded-2xl border border-bp-border hover:border-bp-cyan shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
                  >
                    <div>
                      {/* Card Top Banner / Photo */}
                      <div className="h-28 bg-bp-navy relative overflow-hidden flex items-center justify-center">
                        {group.photo_url ? (
                          <img
                            src={group.photo_url}
                            alt={group.name}
                            className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-bp-cyan">
                            <Users className="w-10 h-10 opacity-70" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                        {group.photo_url && (
                          <div className="absolute bottom-2.5 left-2.5 rounded-lg bg-white/90 px-2 py-1">
                            <AttachmentFileLink file={{ url: group.photo_url, name: `${group.name} photo`, size: 0, type: 'image/*' }} label="Download photo" />
                          </div>
                        )}

                        {/* Status Badge */}
                        <div className="absolute top-2.5 right-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            group.status === 'active'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-700 text-slate-300'
                          }`}>
                            {group.status}
                          </span>
                        </div>

                        {/* Group Name Header */}
                        <div className="absolute bottom-2.5 left-3.5 right-3.5">
                          <h3 className="text-lg font-bold text-white drop-shadow-xs truncate">
                            {group.name}
                          </h3>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-4 space-y-3 text-xs">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-bp-text-subtle">
                            <UserCheck className="w-3.5 h-3.5 text-bp-text shrink-0" />
                            <span className="font-semibold text-bp-text">{group.leader_name}</span>
                            {group.leader_phone && (
                              <span className="text-bp-muted font-mono text-[11px]">
                                ({group.leader_phone})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-bp-muted">
                            <Building2 className="w-3.5 h-3.5 text-bp-muted shrink-0" />
                            <span className="truncate">{group.project_name || 'General Sites'}</span>
                          </div>

                          {group.remarks && (
                            <p className="text-[11px] text-bp-muted line-clamp-2 italic pt-1">
                              &ldquo;{group.remarks}&rdquo;
                            </p>
                          )}
                        </div>

                        {/* Quick Stats Pill */}
                        <div className="pt-2 border-t border-bp-border flex items-center justify-between text-xs">
                          <div>
                            <span className="text-bp-muted block text-[10px] uppercase font-semibold">Total Workers</span>
                            <span className="font-bold text-sm text-bp-text font-mono">{count}</span>
                          </div>
                          <div>
                            <span className="text-bp-muted block text-[10px] uppercase font-semibold">Today Present</span>
                            <span className="font-bold text-sm text-emerald-700 font-mono">{todayPresent} / {count}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="px-4 py-3 bg-bp-background border-t border-bp-border flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {canManage && (
                          <button
                            onClick={() => {
                              setEditingGroup(group);
                              setIsCreateGroupOpen(true);
                            }}
                            className="p-1.5 text-bp-muted hover:text-bp-text hover:bg-bp-border rounded-lg transition-colors"
                            title="Edit group details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteGroup(group)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete group (safely protected against loss of records)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {canManage && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingEmployee(null);
                              setAddEmployeeDefaultGroupId(group.id);
                              setIsAddEmployeeOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-bp-cyan hover:bg-bp-blue text-bp-text text-xs font-bold rounded-xl flex items-center gap-1 transition-all shadow-xs"
                            title={`Add new employee directly to ${group.name}`}
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>+ Add Employee</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setSelectedGroupId(group.id);
                            setActiveTab('mark');
                          }}
                          className="px-3 py-1.5 bg-bp-navy hover:bg-bp-navy-light text-bp-cyan text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                          <span>Open Workspace</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* ======================================================== */}
          {/* SECTION: INDIVIDUAL EMPLOYEES */}
          {/* ======================================================== */}
          <div className="bg-white rounded-2xl border border-bp-border p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-bp-cyan/20 text-bp-text font-mono border border-bp-cyan/40">
                    Direct Workforce
                  </span>
                  <span className="text-xs text-bp-muted font-medium">
                    {individualEmployees.length} unassigned / direct staff
                  </span>
                </div>
                <h2 className="text-xl sm:text-[22px] font-bold text-bp-text tracking-tight flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-bp-cyan" />
                  <span>Individual Employees</span>
                </h2>
                <p className="text-xs text-bp-muted max-w-2xl">
                  Site workers and specialists registered directly with the company. They can remain unassigned or you can assign them to any gang group at any time without duplicating records.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {canManage && (
                  <button
                    onClick={() => {
                      setEditingEmployee(null);
                      setAddEmployeeDefaultGroupId('');
                      setIsAddEmployeeOpen(true);
                    }}
                    className="px-3.5 py-2 bg-bp-navy hover:bg-bp-navy-light text-bp-cyan text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                    title="Add an individual employee"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-bp-cyan" />
                    <span>+ Add Employee</span>
                  </button>
                )}
              </div>
            </div>

            {assignSuccessMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{assignSuccessMessage}</span>
              </div>
            )}

            {/* Individual Employees Table */}
            {individualEmployees.length === 0 ? (
              <div className="bg-bp-background rounded-xl border border-dashed border-bp-border-strong p-8 text-center space-y-2">
                <Users className="w-8 h-8 text-bp-muted mx-auto" />
                <p className="text-xs font-semibold text-bp-text">No unassigned individual workers</p>
                <p className="text-[11px] text-bp-muted">
                  All current site workers are assigned to gang groups. Click <strong>+ Add Employee</strong> to onboard direct site specialists.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-bp-border rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-bp-navy text-white">
                    <tr>
                      <th className="px-4 py-3 font-semibold uppercase text-[10px]">Worker Details</th>
                      <th className="px-3 py-3 font-semibold uppercase text-[10px]">Job Type</th>
                      <th className="px-3 py-3 font-semibold uppercase text-[10px]">Site Assignment</th>
                      <th className="px-3 py-3 font-semibold uppercase text-[10px]">Salary / Wage</th>
                      <th className="px-3 py-3 font-semibold uppercase text-[10px]">Joining Date</th>
                      <th className="px-3 py-3 font-semibold uppercase text-[10px]">Status</th>
                      <th className="px-4 py-3 font-semibold uppercase text-[10px] text-right">Assign Group / Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {individualEmployees.map(emp => (
                      <tr key={emp.id} className="hover:bg-bp-background transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {emp.photo_url ? (
                              <img src={emp.photo_url} alt={emp.full_name} className="w-10 h-10 rounded-xl object-cover border border-bp-border shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-bp-background border border-bp-border text-bp-text flex items-center justify-center font-bold text-xs shrink-0">
                                {emp.full_name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-bp-text">{emp.full_name}</p>
                              <p className="text-[11px] font-mono text-bp-muted">{emp.employee_code}</p>
                              {emp.phone && <p className="text-[10px] text-bp-muted">{emp.phone}</p>}
                              <div className="mt-1 flex flex-wrap gap-2">
                                {emp.photo_url && <AttachmentFileLink file={{ url: emp.photo_url, name: `${emp.employee_code}-photo`, size: 0, type: 'image/*' }} label="Photo" />}
                                {emp.documents?.aadhaar_pdf && <AttachmentFileLink file={emp.documents.aadhaar_pdf} label="Aadhaar PDF" />}
                                {emp.documents?.aadhaar_front && <AttachmentFileLink file={emp.documents.aadhaar_front} label="Aadhaar front" />}
                                {emp.documents?.aadhaar_back && <AttachmentFileLink file={emp.documents.aadhaar_back} label="Aadhaar back" />}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded-md bg-bp-background border border-bp-border text-bp-text font-semibold text-[11px]">
                            {emp.job_type}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-bp-muted">
                          {emp.project_name || 'General Company Sites'}
                        </td>
                        <td className="px-3 py-3 font-mono font-bold text-bp-text">
                          ₹{emp.salary_amount.toLocaleString()} <span className="text-[10px] font-normal text-bp-muted">/{emp.salary_type === 'daily_wage' ? 'day' : 'mo'}</span>
                        </td>
                        <td className="px-3 py-3 font-mono text-bp-muted">
                          {emp.joining_date}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            emp.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {emp.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Inline Group Assignment Selector */}
                            {canManage && (
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAssignGroup(emp.id, e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-bp-border-strong bg-white text-bp-text focus:outline-none focus:border-bp-cyan"
                                title="Assign this employee to an existing group without creating duplicates"
                              >
                                <option value="">+ Assign to Group...</option>
                                {groups.filter(g => g.status === 'active').map(g => (
                                  <option key={g.id} value={g.id}>
                                    {g.name}
                                  </option>
                                ))}
                              </select>
                            )}

                            {canManage && (
                              <button
                                onClick={() => {
                                  setEditingEmployee(emp);
                                  setIsAddEmployeeOpen(true);
                                }}
                                className="p-1.5 text-bp-muted hover:text-bp-text hover:bg-bp-border rounded-lg transition-colors"
                                title="Edit employee details"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      ) : (
        /* ======================================================== */
        /* SCREEN 2: GROUP WORKSPACE */
        /* ======================================================== */
        <div className="space-y-6">
          
          {/* Workspace Header */}
          <div className="bg-white rounded-2xl border border-bp-border p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                {activeGroup?.photo_url ? (
                  <img
                    src={activeGroup.photo_url}
                    alt={activeGroup.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-bp-cyan shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-bp-navy text-bp-cyan flex items-center justify-center font-bold shrink-0">
                    <Users className="w-8 h-8" />
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-bp-cyan text-bp-text uppercase font-mono">
                      Group Workspace
                    </span>
                    <span className="text-xs text-bp-muted">
                      Site: <strong className="text-bp-text">{activeGroup?.project_name || 'All Sites'}</strong>
                    </span>
                    <span className="text-xs text-bp-muted">
                      Leader: <strong className="text-bp-text">{activeGroup?.leader_name}</strong>
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-[28px] font-bold text-bp-text tracking-tight">
                    {activeGroup?.name}
                  </h1>

                  <p className="text-xs text-bp-muted">
                    Total Registered Workers: <strong className="text-bp-text font-mono">{groupEmployees.length} active</strong>
                  </p>
                </div>
              </div>

              {/* Add Employee, Group Switcher & Back Button */}
              <div className="flex items-center gap-2 shrink-0">
                {canManage && (
                  <button
                    onClick={() => {
                      setEditingEmployee(null);
                      setAddEmployeeDefaultGroupId(activeGroup?.id);
                      setIsAddEmployeeOpen(true);
                    }}
                    className="px-3 py-2 bg-bp-cyan hover:bg-bp-blue text-bp-text text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                    title={`Add new employee to ${activeGroup?.name}`}
                  >
                    <UserPlus className="w-3.5 h-3.5 text-bp-text" />
                    <span>+ Add Employee</span>
                  </button>
                )}

                <select
                  value={selectedGroupId || ''}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="px-3 py-2 bg-bp-background text-xs font-bold text-bp-text rounded-xl border border-bp-border-strong focus:outline-none focus:border-bp-cyan"
                >
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>

                <button
                  onClick={() => setSelectedGroupId(null)}
                  className="px-3 py-2 bg-bp-navy hover:bg-bp-navy-light text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>All Groups</span>
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="pt-3 border-t border-bp-border flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveTab('mark')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
                  activeTab === 'mark'
                    ? 'bg-bp-cyan text-bp-text shadow-xs'
                    : 'text-bp-muted hover:text-bp-text hover:bg-bp-background'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-bp-text" />
                Daily Attendance Register
              </button>

              <button
                onClick={() => setActiveTab('employees')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
                  activeTab === 'employees'
                    ? 'bg-bp-cyan text-bp-text shadow-xs'
                    : 'text-bp-muted hover:text-bp-text hover:bg-bp-background'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-bp-text" />
                Worker Management ({groupEmployees.length})
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
                  activeTab === 'history'
                    ? 'bg-bp-cyan text-bp-text shadow-xs'
                    : 'text-bp-muted hover:text-bp-text hover:bg-bp-background'
                }`}
              >
                <History className="w-3.5 h-3.5 text-bp-text" />
                Attendance History
              </button>

              <button
                onClick={() => setActiveTab('salary')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
                  activeTab === 'salary'
                    ? 'bg-bp-cyan text-bp-text shadow-xs'
                    : 'text-bp-muted hover:text-bp-text hover:bg-bp-background'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-bp-text" />
                Salary & Payments
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
                  activeTab === 'reports'
                    ? 'bg-bp-cyan text-bp-text shadow-xs'
                    : 'text-bp-muted hover:text-bp-text hover:bg-bp-background'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-bp-text" />
                Reports & CSV Export
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: DAILY ATTENDANCE REGISTER */}
          {/* ======================================================== */}
          {activeTab === 'mark' && (
            <div className="space-y-4">
              
              {/* Register Date Selector & Quick Controls */}
              <div className="bg-white rounded-2xl border border-bp-border p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-bp-muted uppercase mb-1">
                      Attendance Date
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={attendanceDate}
                        onChange={(e) => setAttendanceDate(e.target.value)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-bp-border-strong focus:outline-none focus:border-bp-cyan text-bp-text"
                      />
                      <button
                        type="button"
                        onClick={() => setAttendanceDate(getLocalDateString())}
                        className="px-2.5 py-1 text-[11px] font-medium bg-bp-background hover:bg-bp-border text-bp-text rounded-lg border border-bp-border-strong"
                      >
                        Today
                      </button>
                    </div>
                  </div>

                  <div className="h-8 border-l border-bp-border hidden sm:block" />

                  {/* Bulk Mark Buttons */}
                  <div className="flex items-center gap-1.5 pt-4 sm:pt-0">
                    <span className="text-[11px] font-semibold text-bp-muted mr-1">Quick:</span>
                    <button
                      type="button"
                      onClick={() => handleMarkAll('Present')}
                      className="px-2.5 py-1 text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl transition-colors"
                    >
                      All Present
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarkAll('Not Marked')}
                      className="px-2.5 py-1 text-xs font-semibold bg-bp-background hover:bg-bp-border text-bp-muted rounded-xl transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {attendanceSaveMessage && (
                    <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      {attendanceSaveMessage}
                    </span>
                  )}
                  {canManage && (
                    <button
                      onClick={handleSaveDailyAttendance}
                      disabled={isSavingAttendance || groupEmployees.length === 0}
                      className="px-5 py-2.5 bg-bp-cyan hover:bg-bp-blue text-bp-text font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
                    >
                      <Check className="w-4 h-4 text-bp-text" />
                      <span>{isSavingAttendance ? 'Saving Register...' : 'Save Attendance Register'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Attendance Register Table */}
              <div className="bg-white rounded-2xl border border-bp-border overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-bp-navy text-white uppercase font-bold text-[11px]">
                      <tr>
                        <th className="px-4 py-3">Worker / ID</th>
                        <th className="px-3 py-3">Trade</th>
                        <th className="px-3 py-3 text-center">Attendance Status</th>
                        <th className="px-3 py-3">Check-In</th>
                        <th className="px-3 py-3">Check-Out</th>
                        <th className="px-2 py-3 text-center">Hours</th>
                        <th className="px-2 py-3 text-center">OT (h)</th>
                        <th className="px-3 py-3 text-right">Daily Wage</th>
                        <th className="px-3 py-3 text-right bg-bp-navy-light text-bp-cyan">Earnings</th>
                        <th className="px-4 py-3">Remarks / Task Proof</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {groupEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-10 text-center text-bp-muted">
                            No active employees registered in this group yet. Click <strong>Worker Management</strong> to add workers.
                          </td>
                        </tr>
                      ) : (
                        groupEmployees.map(emp => {
                          const form = dailyForm[emp.id] || {
                            status: 'Not Marked',
                            checkIn: '08:00',
                            checkOut: '17:00',
                            workingHours: emp.standard_hours_per_day || 8,
                            overtimeHours: 0,
                            remarks: ''
                          };

                          const { dailyEarnings } = attendanceService.calculateDailyEarnings(
                            form.status,
                            emp.salary_type,
                            emp.salary_amount,
                            form.overtimeHours,
                            emp.overtime_rate_per_hour || 0
                          );

                          const hasJoined = !emp.joining_date || emp.joining_date <= attendanceDate;

                          return (
                            <tr key={emp.id} className={`hover:bg-bp-background transition-colors ${!hasJoined ? 'opacity-50 bg-bp-background' : ''}`}>
                              {/* Photo + Name + ID */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  {emp.photo_url ? (
                                    <img
                                      src={emp.photo_url}
                                      alt={emp.full_name}
                                      className="w-9 h-9 rounded-xl object-cover border border-bp-border shrink-0"
                                    />
                                  ) : (
                                    <div className="w-9 h-9 rounded-xl bg-bp-background border border-bp-border text-bp-text flex items-center justify-center font-bold text-xs shrink-0">
                                      {emp.full_name.charAt(0)}
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-bold text-bp-text">{emp.full_name}</p>
                                    <p className="text-[10px] text-bp-muted font-mono">{emp.employee_code}</p>
                                    {!hasJoined && (
                                      <span className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 block mt-0.5">
                                        Joins on {emp.joining_date}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Trade / Job Type */}
                              <td className="px-3 py-3">
                                <span className="px-2 py-0.5 rounded-md bg-bp-background border border-bp-border text-[11px] font-medium text-bp-slate">
                                  {emp.job_type}
                                </span>
                              </td>

                              {/* Attendance Status Selector */}
                              <td className="px-3 py-3 text-center">
                                {!hasJoined ? (
                                  <span className="text-[11px] font-medium text-bp-muted italic">
                                    Not joined yet
                                  </span>
                                ) : (
                                  <select
                                    value={form.status}
                                    onChange={(e) => handleFormChange(emp.id, 'status', e.target.value as AttendanceStatus)}
                                    className={`px-2.5 py-1 text-xs font-bold rounded-xl border focus:outline-none transition-colors ${
                                      form.status === 'Present'
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                        : form.status === 'Half Day'
                                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                                        : form.status === 'Absent'
                                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                                        : form.status === 'Leave'
                                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                                        : form.status === 'Weekly Off' || form.status === 'Holiday'
                                        ? 'bg-purple-100 text-purple-800 border-purple-300'
                                        : 'bg-slate-100 text-slate-600 border-slate-300'
                                    }`}
                                  >
                                    <option value="Not Marked">Not Marked</option>
                                    <option value="Present">Present</option>
                                    <option value="Half Day">Half Day</option>
                                    <option value="Absent">Absent</option>
                                    <option value="Leave">Leave</option>
                                    <option value="Weekly Off">Weekly Off</option>
                                    <option value="Holiday">Holiday</option>
                                  </select>
                                )}
                              </td>

                              {/* Check-In Time */}
                              <td className="px-3 py-3">
                                <input
                                  type="time"
                                  value={form.checkIn}
                                  onChange={(e) => handleFormChange(emp.id, 'checkIn', e.target.value)}
                                  disabled={form.status === 'Absent' || form.status === 'Not Marked'}
                                  className="px-2 py-1 text-xs font-mono rounded-lg border border-bp-border-strong focus:outline-none focus:border-bp-cyan disabled:opacity-40"
                                />
                              </td>

                              {/* Check-Out Time */}
                              <td className="px-3 py-3">
                                <input
                                  type="time"
                                  value={form.checkOut}
                                  onChange={(e) => handleFormChange(emp.id, 'checkOut', e.target.value)}
                                  disabled={form.status === 'Absent' || form.status === 'Not Marked'}
                                  className="px-2 py-1 text-xs font-mono rounded-lg border border-bp-border-strong focus:outline-none focus:border-bp-cyan disabled:opacity-40"
                                />
                              </td>

                              {/* Actual Working Hours */}
                              <td className="px-2 py-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="24"
                                  step="0.5"
                                  value={form.workingHours}
                                  onChange={(e) => handleFormChange(emp.id, 'workingHours', Number(e.target.value))}
                                  disabled={form.status === 'Absent' || form.status === 'Not Marked'}
                                  className="w-16 px-1.5 py-1 text-xs font-mono text-center font-bold rounded-lg border border-bp-border-strong focus:outline-none focus:border-bp-cyan disabled:opacity-40"
                                />
                              </td>

                              {/* Overtime Hours */}
                              <td className="px-2 py-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="12"
                                  step="0.5"
                                  value={form.overtimeHours}
                                  onChange={(e) => handleFormChange(emp.id, 'overtimeHours', Number(e.target.value))}
                                  disabled={form.status === 'Absent' || form.status === 'Not Marked'}
                                  className="w-14 px-1.5 py-1 text-xs font-mono text-center text-blue-700 font-bold rounded-lg border border-bp-border-strong focus:outline-none focus:border-bp-cyan disabled:opacity-40"
                                />
                              </td>

                              {/* Daily Wage / Rate */}
                              <td className="px-3 py-3 text-right font-mono font-semibold text-bp-text-subtle">
                                ₹{emp.salary_amount}
                                <span className="block text-[9px] text-bp-muted font-sans">
                                  {emp.salary_type === 'daily_wage' ? 'per day' : 'monthly'}
                                </span>
                              </td>

                              {/* Calculated Earnings */}
                              <td className="px-3 py-3 text-right font-mono font-bold text-sm bg-bp-cyan/10 text-bp-text">
                                ₹{dailyEarnings.toLocaleString()}
                              </td>

                              {/* Remarks & Photo Proof */}
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  placeholder="e.g., Column casting grid 3"
                                  value={form.remarks}
                                  onChange={(e) => handleFormChange(emp.id, 'remarks', e.target.value)}
                                  className="w-full px-2.5 py-1 text-xs rounded-lg border border-bp-border focus:outline-none focus:border-bp-cyan"
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-bp-background border-t border-bp-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-bp-muted">
                  <p>
                    Showing {groupEmployees.length} worker(s) in {activeGroup?.name}. Earnings calculate live based on attendance status, working hours, and overtime rates.
                  </p>
                  {canManage && (
                    <button
                      onClick={handleSaveDailyAttendance}
                      disabled={isSavingAttendance || groupEmployees.length === 0}
                      className="px-4 py-2 bg-bp-cyan hover:bg-bp-blue text-bp-text font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 text-bp-text" />
                      Save Register for {attendanceDate}
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: EMPLOYEE MANAGEMENT */}
          {/* ======================================================== */}
          {activeTab === 'employees' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-bp-border p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-bp-text">
                    Workers in {activeGroup?.name}
                  </h3>
                  <p className="text-xs text-bp-muted">
                    Manage gang members, photo IDs, trade types, wages, and group assignments
                  </p>
                </div>

                {canManage && (
                  <button
                    onClick={() => {
                      setEditingEmployee(null);
                      setAddEmployeeDefaultGroupId(activeGroup?.id);
                      setIsAddEmployeeOpen(true);
                    }}
                    className="px-4 py-2 bg-bp-cyan hover:bg-bp-blue text-bp-text font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-colors"
                  >
                    <UserPlus className="w-4 h-4 text-bp-text" />
                    <span>+ Add Employee</span>
                  </button>
                )}
              </div>

              {/* Workers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupEmployees.map(emp => (
                  <div
                    key={emp.id}
                    className="bg-white rounded-2xl border border-bp-border hover:border-bp-cyan shadow-xs p-4 flex flex-col justify-between space-y-3 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {emp.photo_url ? (
                        <img
                          src={emp.photo_url}
                          alt={emp.full_name}
                          className="w-14 h-14 rounded-2xl object-cover border border-bp-border shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-bp-background border border-bp-border-strong text-bp-text flex items-center justify-center font-bold text-base shrink-0">
                          {emp.full_name.charAt(0)}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-bp-background border border-bp-border text-bp-text">
                            {emp.employee_code}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                            emp.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {emp.status}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-bp-text truncate mt-1">
                          {emp.full_name}
                        </h4>
                        <p className="text-xs text-bp-muted font-medium">
                          {emp.job_type}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {emp.photo_url && <AttachmentFileLink file={{ url: emp.photo_url, name: `${emp.employee_code}-photo`, size: 0, type: 'image/*' }} label="Photo" />}
                          {emp.documents?.aadhaar_pdf && <AttachmentFileLink file={emp.documents.aadhaar_pdf} label="Aadhaar PDF" />}
                          {emp.documents?.aadhaar_front && <AttachmentFileLink file={emp.documents.aadhaar_front} label="Aadhaar front" />}
                          {emp.documents?.aadhaar_back && <AttachmentFileLink file={emp.documents.aadhaar_back} label="Aadhaar back" />}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-bp-border text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-bp-muted">Wage / Rate:</span>
                        <span className="font-mono font-bold text-bp-text">
                          ₹{emp.salary_amount} / {emp.salary_type === 'daily_wage' ? 'day' : 'month'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bp-muted">Std / Overtime:</span>
                        <span className="font-mono text-bp-text-subtle">
                          {emp.standard_hours_per_day}h &bull; ₹{emp.overtime_rate_per_hour}/h
                        </span>
                      </div>
                      {emp.phone && (
                        <div className="flex justify-between">
                          <span className="text-bp-muted">Phone:</span>
                          <span className="font-mono text-bp-text-subtle">{emp.phone}</span>
                        </div>
                      )}
                    </div>

                    {canManage && (
                      <div className="pt-2 border-t border-bp-border flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingEmployee(emp);
                            setIsAddEmployeeOpen(true);
                          }}
                          className="px-3 py-1 bg-bp-background hover:bg-bp-border text-xs font-semibold text-bp-text rounded-xl flex items-center gap-1 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit Details
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: ATTENDANCE HISTORY */}
          {/* ======================================================== */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-bp-border p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-bp-muted uppercase mb-1">
                      Select Past Register Date
                    </label>
                    <input
                      type="date"
                      value={historyDate}
                      onChange={(e) => setHistoryDate(e.target.value)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-bp-border-strong focus:outline-none focus:border-bp-cyan text-bp-text"
                    />
                  </div>
                  <div className="pt-4 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setHistoryDate(getLocalDateStringOffset(-1))}
                      className="px-2.5 py-1 text-xs font-medium bg-bp-background hover:bg-bp-border text-bp-text rounded-lg border border-bp-border-strong"
                    >
                      Oct 16
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryDate(getLocalDateStringOffset(-2))}
                      className="px-2.5 py-1 text-xs font-medium bg-bp-background hover:bg-bp-border text-bp-text rounded-lg border border-bp-border-strong"
                    >
                      Oct 15
                    </button>
                  </div>
                </div>

                <span className="text-xs text-bp-muted">
                  Showing historical saved entries for <strong>{historyDate}</strong>
                </span>
              </div>

              {/* History Table */}
              <div className="bg-white rounded-2xl border border-bp-border overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-bp-navy text-white uppercase font-bold text-[11px]">
                      <tr>
                        <th className="px-4 py-3">Worker / ID</th>
                        <th className="px-3 py-3">Trade</th>
                        <th className="px-3 py-3 text-center">Status</th>
                        <th className="px-3 py-3">Check-In</th>
                        <th className="px-3 py-3">Check-Out</th>
                        <th className="px-3 py-3 text-center">Hours</th>
                        <th className="px-3 py-3 text-center">OT (h)</th>
                        <th className="px-3 py-3 text-right">Earned</th>
                        <th className="px-4 py-3">Audited By</th>
                        <th className="px-4 py-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {attendanceRecords.filter(r => r.group_id === selectedGroupId && r.date === historyDate).length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-10 text-center text-bp-muted">
                            No saved attendance record found for {historyDate}.
                          </td>
                        </tr>
                      ) : (
                        attendanceRecords
                          .filter(r => r.group_id === selectedGroupId && r.date === historyDate)
                          .map(rec => (
                            <tr key={rec.id} className="hover:bg-bp-background transition-colors">
                              <td className="px-4 py-3 font-semibold text-bp-text">
                                {rec.employee_name}
                                <span className="block text-[10px] text-bp-muted font-mono">{rec.employee_code}</span>
                              </td>
                              <td className="px-3 py-3 text-bp-text-subtle">{rec.job_type}</td>
                              <td className="px-3 py-3 text-center">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  rec.status === 'Present'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : rec.status === 'Half Day'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {rec.status}
                                </span>
                              </td>
                              <td className="px-3 py-3 font-mono">{rec.check_in_time || '—'}</td>
                              <td className="px-3 py-3 font-mono">{rec.check_out_time || '—'}</td>
                              <td className="px-3 py-3 text-center font-mono font-bold">{rec.working_hours}h</td>
                              <td className="px-3 py-3 text-center font-mono text-blue-700">{rec.overtime_hours}h</td>
                              <td className="px-3 py-3 text-right font-mono font-bold text-bp-text">
                                ₹{rec.daily_earnings.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-bp-muted">{rec.recorded_by_name}</td>
                              <td className="px-4 py-3 text-bp-muted">{rec.remarks || '—'}</td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: SALARY & PAYMENTS */}
          {/* ======================================================== */}
          {activeTab === 'salary' && (
            <div className="space-y-4">
              
              {/* Controls & Record Payment button */}
              <div className="bg-white rounded-2xl border border-bp-border p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-bp-muted">Period:</span>
                  <select
                    value={salaryPeriod}
                    onChange={(e) => setSalaryPeriod(e.target.value as any)}
                    className="px-3 py-1.5 text-xs font-bold text-bp-text rounded-xl border border-bp-border-strong bg-white focus:outline-none focus:border-bp-cyan"
                  >
                    <option value="this_month">This Month (October 2026)</option>
                    <option value="last_30_days">Last 30 Days</option>
                    <option value="all">Full Year 2026</option>
                  </select>
                </div>

                {canManage && (
                  <button
                    onClick={() => {
                      setPaymentTargetEmployee(null);
                      setPaymentSuggestedAmount(undefined);
                      setIsRecordPaymentOpen(true);
                    }}
                    className="px-4 py-2.5 bg-bp-cyan hover:bg-bp-blue text-bp-text font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-colors"
                  >
                    <DollarSign className="w-4 h-4 text-bp-text" />
                    <span>Record Salary / Advance Payment</span>
                  </button>
                )}
              </div>

              {/* Salary Ledger Table */}
              <div className="bg-white rounded-2xl border border-bp-border overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-bp-navy text-white uppercase font-bold text-[11px]">
                      <tr>
                        <th className="px-4 py-3">Worker Name</th>
                        <th className="px-3 py-3">Trade</th>
                        <th className="px-2 py-3 text-center">Rate</th>
                        <th className="px-2 py-3 text-center">P / HD / A</th>
                        <th className="px-2 py-3 text-center">Pay Days</th>
                        <th className="px-2 py-3 text-center">Hours (OT)</th>
                        <th className="px-3 py-3 text-right bg-bp-navy-light text-bp-cyan">Gross Earned</th>
                        <th className="px-3 py-3 text-right text-rose-400">Advances / Ded.</th>
                        <th className="px-3 py-3 text-right text-emerald-400">Paid Out</th>
                        <th className="px-3 py-3 text-right font-bold text-white bg-slate-900">Remaining Balance</th>
                        <th className="px-3 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {salarySummaries.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="px-4 py-10 text-center text-bp-muted">
                            No salary or payment records calculated for this period.
                          </td>
                        </tr>
                      ) : (
                        salarySummaries.map(s => (
                          <tr key={s.employee_id} className="hover:bg-bp-background transition-colors">
                            <td className="px-4 py-3 font-semibold text-bp-text">
                              {s.employee_name}
                              <span className="block text-[10px] text-bp-muted font-mono">{s.employee_code}</span>
                            </td>
                            <td className="px-3 py-3 text-bp-text-subtle">{s.job_type}</td>
                            <td className="px-2 py-3 text-center font-mono">₹{s.salary_rate}</td>
                            <td className="px-2 py-3 text-center font-mono">
                              <span className="text-emerald-700 font-bold">{s.present_days}</span> / <span className="text-blue-700">{s.half_days}</span> / <span className="text-rose-700">{s.absent_days}</span>
                            </td>
                            <td className="px-2 py-3 text-center font-mono font-bold text-bp-text">
                              {s.total_payable_days}d
                            </td>
                            <td className="px-2 py-3 text-center font-mono">
                              {s.total_working_hours}h {s.total_overtime_hours > 0 && `(+${s.total_overtime_hours}h)`}
                            </td>
                            <td className="px-3 py-3 text-right font-mono font-bold bg-bp-cyan/10 text-bp-text">
                              ₹{s.gross_earnings.toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-rose-700">
                              {(s.total_advances + s.total_deductions) > 0 ? `-₹${(s.total_advances + s.total_deductions).toLocaleString()}` : '₹0'}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-emerald-700 font-semibold">
                              ₹{s.total_paid.toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-right font-mono font-bold text-sm bg-slate-50 text-bp-text">
                              ₹{s.net_payable_balance.toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {canManage && (
                                <button
                                  onClick={() => {
                                    const empObj = employees.find(e => e.id === s.employee_id) || null;
                                    setPaymentTargetEmployee(empObj);
                                    setPaymentSuggestedAmount(Math.max(0, s.net_payable_balance));
                                    setIsRecordPaymentOpen(true);
                                  }}
                                  className="px-2.5 py-1 text-xs font-semibold bg-bp-navy text-bp-cyan hover:bg-bp-navy-light rounded-xl transition-colors shadow-xs"
                                >
                                  Pay
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

              {/* Payment History Ledger */}
              <div className="bg-white rounded-2xl border border-bp-border p-5 shadow-xs space-y-3">
                <h4 className="text-sm font-bold text-bp-text uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-bp-text" />
                  Recent Payment Disbursements for {activeGroup?.name}
                </h4>

                <div className="divide-y divide-[#E2E8F0] text-xs">
                  {paymentRecords.filter(p => p.group_id === selectedGroupId).length === 0 ? (
                    <p className="py-4 text-bp-muted text-center">No payment transactions recorded for this group yet.</p>
                  ) : (
                    paymentRecords
                      .filter(p => p.group_id === selectedGroupId)
                      .map(p => (
                        <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                          <div>
                            <span className="font-bold text-bp-text">{p.employee_name}</span>
                            <span className="text-[10px] text-bp-muted font-mono ml-2">({p.employee_code})</span>
                            <span className="text-xs text-bp-muted block">
                              Method: {p.payment_method} {p.reference_no && `• Ref: ${p.reference_no}`} {p.remarks && `• "${p.remarks}"`}
                            </span>
                            <AttachmentLinks attachments={p.attachments} />
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-sm text-bp-text">₹{p.amount.toLocaleString()}</span>
                            <span className="text-[10px] text-bp-muted block">{p.payment_date}</span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: REPORTS & CSV EXPORT */}
          {/* ======================================================== */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              
              {/* TWO SEPARATE REPORT OPTIONS WORKFLOW */}
              <div className="bg-white rounded-2xl border border-bp-border p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-bp-text">
                      Attendance & Labor Wage Reports
                    </h3>
                    <p className="text-xs text-bp-muted">
                      Generate audited daily attendance registers, working hours, and CSV exports for Excel.
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadReportCsv}
                    className="px-4 py-2.5 bg-bp-cyan hover:bg-bp-blue text-bp-text font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all hover:scale-[1.02]"
                  >
                    <Download className="w-4 h-4 text-bp-text" />
                    <span>Download Matching CSV</span>
                  </button>
                </div>

                {/* The Two Report Options Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {/* Option A: Date Range Report */}
                  <button
                    type="button"
                    onClick={() => setReportMode('date_range')}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      reportMode === 'date_range'
                        ? 'border-bp-cyan bg-bp-cyan/10 shadow-sm'
                        : 'border-bp-border hover:border-bp-border-strong bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-bp-text">Option A: Date Range Report</h4>
                      {reportMode === 'date_range' && <CheckCircle2 className="w-4 h-4 text-bp-text" />}
                    </div>
                    <p className="text-xs text-bp-muted mt-1">
                      Prompts for <strong>From Date</strong> and <strong>To Date</strong> (both dates included).
                    </p>
                  </button>

                  {/* Option B: Total Report Up To Date */}
                  <button
                    type="button"
                    onClick={() => setReportMode('up_to_date')}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      reportMode === 'up_to_date'
                        ? 'border-bp-cyan bg-bp-cyan/10 shadow-sm'
                        : 'border-bp-border hover:border-bp-border-strong bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-bp-text">Option B: Total Report Up To Date</h4>
                      {reportMode === 'up_to_date' && <CheckCircle2 className="w-4 h-4 text-bp-text" />}
                    </div>
                    <p className="text-xs text-bp-muted mt-1">
                      Prompts for <strong>only one date: Report Up To Date</strong>. (No From Date asked).
                    </p>
                  </button>
                </div>

                {/* Filter Controls Bar (Dynamic based on selected option) */}
                <div className="p-4 bg-bp-background rounded-xl border border-bp-border space-y-3 text-xs">
                  {reportMode === 'date_range' ? (
                    /* Date Range: Shows From Date and To Date */
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div>
                        <label className="block text-[11px] font-bold text-bp-text uppercase mb-1">
                          From Date *
                        </label>
                        <input
                          type="date"
                          value={reportFromDate}
                          onChange={(e) => setReportFromDate(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white text-xs text-bp-text font-semibold rounded-xl border border-bp-border-strong"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-bp-text uppercase mb-1">
                          To Date * (Inclusive)
                        </label>
                        <input
                          type="date"
                          value={reportToDate}
                          onChange={(e) => setReportToDate(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white text-xs text-bp-text font-semibold rounded-xl border border-bp-border-strong"
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setReportFromDate(getLocalMonthStartString());
                            setReportToDate(getLocalDateString());
                          }}
                          className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-bp-border text-bp-text rounded-lg border border-bp-border-strong"
                        >
                          October 2026
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReportFromDate(getLocalDateStringOffset(-6));
                            setReportToDate(getLocalDateString());
                          }}
                          className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-bp-border text-bp-text rounded-lg border border-bp-border-strong"
                        >
                          Last 7 Days
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Up To Date: Shows ONLY Report Up To Date (Never ask for From Date!) */
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div>
                        <label className="block text-[11px] font-bold text-bp-text uppercase mb-1">
                          Report Up To Date * (Cut-off Date)
                        </label>
                        <input
                          type="date"
                          value={reportUpToDate}
                          onChange={(e) => setReportUpToDate(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white text-xs text-bp-text font-semibold rounded-xl border border-bp-border-strong"
                        />
                      </div>
                      <div className="sm:col-span-3 flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setReportUpToDate(getLocalDateString())}
                          className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-bp-border text-bp-text rounded-lg border border-bp-border-strong"
                        >
                          Today (Oct 17)
                        </button>
                        <button
                          type="button"
                          onClick={() => setReportUpToDate(getLocalDateStringOffset(-2))}
                          className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-bp-border text-bp-text rounded-lg border border-bp-border-strong"
                        >
                          Oct 15
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Group & Employee Scope */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-bp-text uppercase mb-1">
                        Group Scope
                      </label>
                      <select
                        value={reportGroupScope}
                        onChange={(e) => setReportGroupScope(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white text-xs text-bp-text font-semibold rounded-xl border border-bp-border-strong"
                      >
                        <option value="all">All Groups & Direct Workers (Company Wide)</option>
                        <option value="ungrouped">Individual / Direct Workers Only</option>
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-bp-text uppercase mb-1">
                        Employee Filter
                      </label>
                      <select
                        value={reportEmployeeFilter}
                        onChange={(e) => setReportEmployeeFilter(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white text-xs text-bp-text font-semibold rounded-xl border border-bp-border-strong"
                      >
                        <option value="all">All Workers in Selected Scope</option>
                        {employees
                          .filter(e => reportGroupScope === 'all' || e.group_id === reportGroupScope)
                          .map(e => (
                            <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>

              </div>

              {/* Report Preview Table */}
              <div className="bg-white rounded-2xl border border-bp-border overflow-hidden shadow-xs">
                <div className="px-5 py-3 border-b border-bp-border flex items-center justify-between bg-bp-background">
                  <span className="text-xs font-bold text-bp-text uppercase tracking-wider">
                    On-Screen Report Summary ({reportSummaries.length} workers)
                  </span>
                  <span className="text-xs text-bp-muted">
                    {reportMode === 'date_range'
                      ? `Range: ${reportFromDate} to ${reportToDate}`
                      : `Cumulative Up To: ${reportUpToDate}`}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-bp-navy text-white uppercase font-bold text-[11px]">
                      <tr>
                        <th className="px-4 py-3">Group</th>
                        <th className="px-4 py-3">Worker Name</th>
                        <th className="px-3 py-3">Trade</th>
                        <th className="px-2 py-3 text-center">Wage Rate</th>
                        <th className="px-2 py-3 text-center">Present</th>
                        <th className="px-2 py-3 text-center">Half Day</th>
                        <th className="px-2 py-3 text-center">Hours</th>
                        <th className="px-2 py-3 text-center">OT (h)</th>
                        <th className="px-3 py-3 text-right bg-bp-navy-light text-bp-cyan">Gross Earnings</th>
                        <th className="px-3 py-3 text-right text-emerald-400">Total Paid</th>
                        <th className="px-3 py-3 text-right font-bold text-white bg-slate-900">Remaining</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {reportSummaries.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="px-4 py-10 text-center text-bp-muted">
                            No attendance records match the selected date parameters.
                          </td>
                        </tr>
                      ) : (
                        reportSummaries.map(s => (
                          <tr key={s.employee_id} className="hover:bg-bp-background transition-colors">
                            <td className="px-4 py-3 text-bp-text-subtle font-medium">{s.group_name}</td>
                            <td className="px-4 py-3 font-semibold text-bp-text">
                              {s.employee_name}
                              <span className="block text-[10px] text-bp-muted font-mono">{s.employee_code}</span>
                            </td>
                            <td className="px-3 py-3 text-bp-text-subtle">{s.job_type}</td>
                            <td className="px-2 py-3 text-center font-mono">₹{s.salary_rate}</td>
                            <td className="px-2 py-3 text-center font-mono font-bold text-emerald-700">{s.present_days}</td>
                            <td className="px-2 py-3 text-center font-mono text-blue-700">{s.half_days}</td>
                            <td className="px-2 py-3 text-center font-mono">{s.total_working_hours}h</td>
                            <td className="px-2 py-3 text-center font-mono text-blue-700">{s.total_overtime_hours}h</td>
                            <td className="px-3 py-3 text-right font-mono font-bold bg-bp-cyan/10 text-bp-text">
                              ₹{s.gross_earnings.toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-emerald-700 font-semibold">
                              ₹{s.total_paid.toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-right font-mono font-bold text-sm bg-slate-50 text-bp-text">
                              ₹{s.net_payable_balance.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-bp-background border-t border-bp-border flex items-center justify-between">
                  <p className="text-xs text-bp-muted">
                    Ready to export. CSV includes detailed itemized records with job type, check-in, check-out, payable days, and earnings.
                  </p>
                  <button
                    onClick={handleDownloadReportCsv}
                    className="px-4 py-2 bg-bp-navy hover:bg-bp-navy-light text-bp-cyan font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* CREATE / EDIT GROUP MODAL */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => {
          setIsCreateGroupOpen(false);
          setEditingGroup(null);
        }}
        onSubmit={handleSaveGroup}
        editingGroup={editingGroup}
        projects={projects}
      />

      {/* ADD / EDIT EMPLOYEE MODAL */}
      <AddEmployeeModal
        isOpen={isAddEmployeeOpen}
        onClose={() => {
          setIsAddEmployeeOpen(false);
          setEditingEmployee(null);
          setAddEmployeeDefaultGroupId(undefined);
        }}
        onSubmit={handleSaveEmployee}
        editingEmployee={editingEmployee}
        groups={groups}
        projects={projects}
        defaultGroupId={addEmployeeDefaultGroupId !== undefined ? addEmployeeDefaultGroupId : (selectedGroupId || undefined)}
        onUploadFile={(file) => dataService.uploadPrivateAttachment(file, selectedGroupId || 'attendance')}
      />

      {/* RECORD PAYMENT MODAL */}
      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => {
          setIsRecordPaymentOpen(false);
          setPaymentTargetEmployee(null);
        }}
        onSubmit={handleSavePayment}
        groupId={selectedGroupId || (groups[0]?.id || '')}
        employees={selectedGroupId ? groupEmployees : employees}
        selectedEmployee={paymentTargetEmployee}
        suggestedAmount={paymentSuggestedAmount}
        onUploadFile={(file) => dataService.uploadAttachment(file, selectedGroupId || 'attendance')}
      />

    </div>
  );
};
