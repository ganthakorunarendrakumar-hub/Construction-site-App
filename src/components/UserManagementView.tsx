import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Search,
  Filter,
  KeyRound,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  Building2,
  Phone,
  Mail,
  RefreshCw,
  Clock,
  ChevronRight,
  UserCheck,
  Check,
  ShieldAlert,
  Calendar
} from 'lucide-react';
import { AuthAccount, UserRole, Project, Employee } from '../types';
import { authService, ROLE_TITLES } from '../services/authService';
import { attendanceService } from '../services/attendanceService';
import { dataService } from '../services/dataService';

interface UserManagementViewProps {
  onNavigateHome: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ onNavigateHome }) => {
  const [accounts, setAccounts] = useState<AuthAccount[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AuthAccount | null>(null);
  const [resettingPasswordAccount, setResettingPasswordAccount] = useState<AuthAccount | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('ChenInfra@2026');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Create form state
  const [createFullName, setCreateFullName] = useState('');
  const [createUserId, setCreateUserId] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createRole, setCreateRole] = useState<UserRole>('site_supervisor');
  const [createAssignedProjects, setCreateAssignedProjects] = useState<string[]>([]);
  const [createEmployeeId, setCreateEmployeeId] = useState<string>('');
  const [createPassword, setCreatePassword] = useState('ChenInfra@2026');
  const [createRequireChange, setCreateRequireChange] = useState(true);
  const [createStatus, setCreateStatus] = useState<'active' | 'inactive'>('active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit form state
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('site_supervisor');
  const [editAssignedProjects, setEditAssignedProjects] = useState<string[]>([]);
  const [editEmployeeId, setEditEmployeeId] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');

  // Audit Logs drawer
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [accs, projs, emps] = await Promise.all([
        authService.getAccounts(),
        dataService.getProjects(),
        attendanceService.getEmployees()
      ]);
      setAccounts(accs);
      setProjects(projs);
      setEmployees(emps);
      setAuditLogs(authService.getAuthAuditLogs());
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load user accounts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered accounts list
  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch =
      acc.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.phone && acc.phone.includes(searchQuery));
    const matchesRole = roleFilter === 'all' || acc.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || acc.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Handle open create modal
  const handleOpenCreate = () => {
    setCreateFullName('');
    setCreateRole('site_supervisor');
    setCreateEmail('');
    setCreatePhone('');
    setCreateAssignedProjects(projects.slice(0, 1).map(p => p.id));
    setCreateEmployeeId('');
    setCreatePassword('ChenInfra@2026');
    setCreateRequireChange(true);
    setCreateStatus('active');

    // Auto-generate unique ID suggestion
    const nextSeq = (accounts.length + 1).toString().padStart(2, '0');
    setCreateUserId(`CHEN-SUP-${nextSeq}`);

    setErrorMessage(null);
    setIsCreateModalOpen(true);
  };

  const handleRoleChangeForCreate = (newRole: UserRole) => {
    setCreateRole(newRole);
    const prefix = newRole === 'admin' ? 'ADM' :
      newRole === 'site_supervisor' ? 'SUP' :
      newRole === 'accountant' ? 'ACC' :
      newRole === 'worker' ? 'WRK' :
      newRole === 'storekeeper' ? 'STR' : 'USR';
    const nextSeq = (accounts.length + 1).toString().padStart(2, '0');
    setCreateUserId(`CHEN-${prefix}-${nextSeq}`);
  };

  // Submit new account
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const created = await authService.createAccount({
        full_name: createFullName,
        user_id: createUserId,
        email: createEmail,
        phone: createPhone,
        role: createRole,
        assigned_projects: createAssignedProjects,
        employee_id: createEmployeeId || undefined,
        initial_password: createPassword,
        require_password_change: createRequireChange,
        status: createStatus
      });

      await loadData();
      setIsCreateModalOpen(false);
      setNoticeMessage(`Account created successfully for ${created.full_name} with User ID "${created.user_id}".`);
      setTimeout(() => setNoticeMessage(null), 6000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create user account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle open edit
  const handleOpenEdit = (acc: AuthAccount) => {
    setEditingAccount(acc);
    setEditFullName(acc.full_name);
    setEditEmail(acc.email);
    setEditPhone(acc.phone || '');
    setEditRole(acc.role);
    setEditAssignedProjects(acc.assigned_projects || []);
    setEditEmployeeId(acc.employee_id || '');
    setEditStatus(acc.status);
    setErrorMessage(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await authService.updateAccount(editingAccount.auth_uid, {
        full_name: editFullName,
        email: editEmail,
        phone: editPhone,
        role: editRole,
        assigned_projects: editAssignedProjects,
        employee_id: editEmployeeId || undefined,
        status: editStatus
      });

      await loadData();
      setEditingAccount(null);
      setNoticeMessage(`User profile for ${editFullName} updated successfully.`);
      setTimeout(() => setNoticeMessage(null), 6000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleStatus = async (acc: AuthAccount) => {
    const nextStatus = acc.status === 'active' ? 'inactive' : 'active';
    try {
      await authService.toggleAccountStatus(acc.auth_uid, nextStatus);
      await loadData();
      setNoticeMessage(`Account for ${acc.full_name} is now ${nextStatus}.`);
      setTimeout(() => setNoticeMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to change status.');
    }
  };

  // Admin Reset Password Submit
  const handleAdminResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingPasswordAccount) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await authService.adminResetUserPassword(resettingPasswordAccount.auth_uid, adminNewPassword);
      setResettingPasswordAccount(null);
      setNoticeMessage(`Password for ${resettingPasswordAccount.full_name} has been reset.`);
      setTimeout(() => setNoticeMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async (acc: AuthAccount) => {
    if (!window.confirm(`Are you sure you want to permanently delete the account for ${acc.full_name} (${acc.user_id})?`)) {
      return;
    }

    try {
      await authService.deleteAccount(acc.auth_uid);
      await loadData();
      setNoticeMessage(`Account ${acc.user_id} deleted successfully.`);
      setTimeout(() => setNoticeMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete account.');
    }
  };

  return (
    <div className="space-y-6 font-['Inter',sans-serif] animate-in fade-in duration-150">
      
      {/* Top Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#666666]">
        <button onClick={onNavigateHome} className="hover:text-[#111111] transition-colors">
          CHEN INFRA
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-[#888888]" />
        <span className="font-semibold text-[#111111] flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#FFC400]" />
          User Management & Access Control
        </span>
      </nav>

      {/* Hero Banner with Create User Button */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#FFC400] text-[#111111] font-mono">
                ADMINISTRATION CONSOLE
              </span>
              <span className="text-xs text-[#666666] font-medium">
                Server-Enforced Role-Based Access Control
              </span>
            </div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-[#111111] tracking-tight">
              User Accounts & Security Permissions
            </h1>
            <p className="text-xs sm:text-sm text-[#666666] max-w-2xl">
              Create individual staff accounts with unique User IDs, PBKDF2 cryptographic passwords, assigned construction sites, and strict server-enforced role privileges.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowAuditLogs(!showAuditLogs)}
              className="px-3.5 py-2.5 bg-[#F7F7F7] hover:bg-[#EAEAEA] text-[#111111] font-semibold text-xs rounded-xl border border-[#CCCCCC] flex items-center gap-2 transition-colors"
            >
              <Clock className="w-4 h-4 text-[#666666]" />
              <span>{showAuditLogs ? 'Hide Audit Log' : 'Audit Logs'}</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <UserPlus className="w-4 h-4 text-[#111111]" />
              <span>Create User Account</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="pt-4 border-t border-[#E8E8E8] grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#F7F7F7] p-3 rounded-xl border border-[#E8E8E8]">
            <p className="text-[11px] font-semibold text-[#666666] uppercase">Total User Accounts</p>
            <p className="text-xl font-bold text-[#111111] font-mono mt-0.5">
              {accounts.length} <span className="text-xs font-normal text-[#666666]">users</span>
            </p>
          </div>
          <div className="bg-[#F7F7F7] p-3 rounded-xl border border-[#E8E8E8]">
            <p className="text-[11px] font-semibold text-[#666666] uppercase">Active Administrators</p>
            <p className="text-xl font-bold text-[#111111] font-mono mt-0.5">
              {accounts.filter(a => a.role === 'admin' && a.status === 'active').length} <span className="text-xs font-normal text-[#666666]">admins</span>
            </p>
          </div>
          <div className="bg-[#F7F7F7] p-3 rounded-xl border border-[#E8E8E8]">
            <p className="text-[11px] font-semibold text-[#666666] uppercase">Site Supervisors</p>
            <p className="text-xl font-bold text-amber-600 font-mono mt-0.5">
              {accounts.filter(a => a.role === 'site_supervisor' && a.status === 'active').length} <span className="text-xs font-normal text-[#666666]">supervisors</span>
            </p>
          </div>
          <div className="bg-[#F7F7F7] p-3 rounded-xl border border-[#E8E8E8]">
            <p className="text-[11px] font-semibold text-[#666666] uppercase">Workers / Staff</p>
            <p className="text-xl font-bold text-blue-600 font-mono mt-0.5">
              {accounts.filter(a => a.role === 'worker' && a.status === 'active').length} <span className="text-xs font-normal text-[#666666]">workers</span>
            </p>
          </div>
        </div>
      </div>

      {/* Global Notice / Error */}
      {noticeMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{noticeMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Audit Logs Drawer / Section */}
      {showAuditLogs && (
        <div className="bg-white rounded-2xl border border-[#E8E8E8] p-5 shadow-xs space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#FFC400]" />
              <h3 className="font-bold text-sm text-[#111111]">Recent Authentication & Security Audit Trail</h3>
            </div>
            <span className="text-xs text-[#666666]">{auditLogs.length} events recorded</span>
          </div>

          <div className="overflow-x-auto max-h-60 overflow-y-auto divide-y divide-[#E8E8E8] text-xs">
            {auditLogs.length === 0 ? (
              <p className="py-4 text-center text-[#888888]">No audit logs recorded yet.</p>
            ) : (
              auditLogs.slice(0, 30).map((log, i) => (
                <div key={log.id || i} className="py-2 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-semibold text-[#111111] uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-[#F7F7F7] border border-[#E8E8E8] mr-2">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[#666666]">
                      Actor: <strong>{log.actor_name}</strong>
                    </span>
                    {log.metadata?.user_id && (
                      <span className="ml-2 font-mono text-[11px] text-[#888888]">
                        ({log.metadata.user_id})
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#888888] font-mono shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()} · {new Date(log.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#888888] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, User ID, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs text-[#111111] rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-[#666666]">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-[#CCCCCC] bg-white text-[#111111] focus:outline-none focus:border-[#FFC400]"
            >
              <option value="all">All Roles</option>
              <option value="admin">Administrator</option>
              <option value="site_supervisor">Site Supervisor</option>
              <option value="accountant">Accountant</option>
              <option value="worker">Worker</option>
              <option value="storekeeper">Storekeeper</option>
              <option value="project_manager">Project Manager</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-[#666666]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-[#CCCCCC] bg-white text-[#111111] focus:outline-none focus:border-[#FFC400]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Accounts Table */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] text-white uppercase font-bold text-[11px]">
              <tr>
                <th className="px-4 py-3">User ID & Name</th>
                <th className="px-3 py-3">Email / Phone</th>
                <th className="px-3 py-3">Assigned Role</th>
                <th className="px-3 py-3">Assigned Sites</th>
                <th className="px-3 py-3">Linked Employee</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-3 py-3 text-right">Last Login</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8E8]">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#666666]">
                    No user accounts match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map(acc => {
                  const linkedEmp = employees.find(e => e.id === acc.employee_id);
                  const isLocked = acc.lockout_until && new Date(acc.lockout_until) > new Date();

                  return (
                    <tr key={acc.auth_uid} className={`hover:bg-[#F9F9F9] transition-colors ${acc.status === 'inactive' ? 'opacity-60 bg-[#FAFAFA]' : ''}`}>
                      
                      {/* Name + User ID */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#FFC400] text-[#111111] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                            {acc.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-[#111111]">{acc.full_name}</p>
                            <span className="inline-block px-1.5 py-0.2 font-mono font-semibold text-[10px] rounded bg-[#F7F7F7] border border-[#CCCCCC] text-[#111111]">
                              {acc.user_id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email + Phone */}
                      <td className="px-3 py-3.5">
                        <p className="text-[#111111] font-medium">{acc.email}</p>
                        {acc.phone && <p className="text-[11px] text-[#888888] font-mono">{acc.phone}</p>}
                      </td>

                      {/* Role Badge */}
                      <td className="px-3 py-3.5">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                          acc.role === 'admin'
                            ? 'bg-[#111111] text-[#FFC400]'
                            : acc.role === 'site_supervisor'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : acc.role === 'accountant'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : acc.role === 'worker'
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : 'bg-[#F7F7F7] text-[#111111] border border-[#E8E8E8]'
                        }`}>
                          {ROLE_TITLES[acc.role] || acc.role}
                        </span>
                      </td>

                      {/* Assigned Sites */}
                      <td className="px-3 py-3.5">
                        {acc.assigned_projects && acc.assigned_projects.length > 0 ? (
                          <div className="space-y-0.5">
                            {acc.assigned_projects.map(pid => {
                              const proj = projects.find(p => p.id === pid);
                              return (
                                <span key={pid} className="inline-block px-1.5 py-0.5 mr-1 mb-0.5 rounded bg-[#F7F7F7] border border-[#E8E8E8] text-[10px] text-[#555555]">
                                  {proj?.name ? proj.name.slice(0, 20) + '...' : pid}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-[#888888] italic text-[11px]">All Sites (Unrestricted)</span>
                        )}
                      </td>

                      {/* Linked Employee Profile */}
                      <td className="px-3 py-3.5">
                        {linkedEmp ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <UserCheck className="w-3 h-3 text-emerald-600" />
                            {linkedEmp.full_name} ({linkedEmp.employee_code})
                          </span>
                        ) : (
                          <span className="text-[#888888] text-[11px]">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5 text-center">
                        {isLocked ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300">
                            Locked (5 fails)
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(acc)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-all ${
                              acc.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                            title="Click to toggle account activation"
                          >
                            {acc.status}
                          </button>
                        )}
                      </td>

                      {/* Last Login */}
                      <td className="px-3 py-3.5 text-right font-mono text-[#666666] text-[11px]">
                        {acc.last_login_at
                          ? new Date(acc.last_login_at).toLocaleDateString()
                          : 'Never logged in'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reset Password */}
                          <button
                            onClick={() => {
                              setResettingPasswordAccount(acc);
                              setAdminNewPassword('ChenInfra@2026');
                            }}
                            className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#EAEAEA] rounded-lg transition-colors"
                            title="Reset password for this user"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => handleOpenEdit(acc)}
                            className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#EAEAEA] rounded-lg transition-colors"
                            title="Edit user details and roles"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Account */}
                          <button
                            onClick={() => handleDeleteAccount(acc)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete user account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: CREATE USER ACCOUNT */}
      {/* ======================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-[#E8E8E8] overflow-hidden max-h-[90vh] flex flex-col">
            
            <div className="bg-[#111111] text-white px-6 py-4 flex items-center justify-between border-b border-[#222222] shrink-0">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#FFC400]" />
                <h3 className="font-bold text-sm text-white">Register New User Account</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#888888] hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anand Mahindra"
                    value={createFullName}
                    onChange={(e) => setCreateFullName(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-[#111111] bg-white rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    Unique User ID * (Permanent)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CHEN-SUP-05"
                    value={createUserId}
                    onChange={(e) => setCreateUserId(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono font-bold text-[#111111] bg-white rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. user@cheninfra.com"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-[#111111] bg-white rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98450 00000"
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-[#111111] bg-white rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    Role & Server Permissions *
                  </label>
                  <select
                    value={createRole}
                    onChange={(e) => handleRoleChangeForCreate(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs font-semibold text-[#111111] bg-white rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
                  >
                    <option value="admin">Company Administrator (Full Access)</option>
                    <option value="site_supervisor">Site Supervisor (Site Attendance & Workers)</option>
                    <option value="accountant">Accountant (Salaries, Payments & Reports)</option>
                    <option value="worker">Employee / Worker (Personal Info & Wage)</option>
                    <option value="storekeeper">Materials Storekeeper (Inventory Ledger)</option>
                    <option value="project_manager">Senior Project Manager (Projects & Sites)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    Link to Employee Profile (Optional)
                  </label>
                  <select
                    value={createEmployeeId}
                    onChange={(e) => setCreateEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-[#111111] bg-white rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
                  >
                    <option value="">None (Independent Login Account)</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.employee_code} - {emp.job_type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assigned Construction Sites */}
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                  Assigned Sites & Projects (Site Supervisors / Staff)
                </label>
                <div className="p-3 bg-[#F9F9F9] rounded-xl border border-[#E8E8E8] grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {projects.map(p => {
                    const isChecked = createAssignedProjects.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 text-xs text-[#111111] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCreateAssignedProjects(prev => [...prev, p.id]);
                            } else {
                              setCreateAssignedProjects(prev => prev.filter(id => id !== p.id));
                            }
                          }}
                          className="rounded text-[#111111] focus:ring-[#FFC400]"
                        />
                        <span className="truncate">{p.name}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[10px] text-[#666666] mt-1">
                  Leave empty if this account has company-wide access across all sites.
                </p>
              </div>

              {/* Password configuration */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                  <Lock className="w-4 h-4 text-amber-700" />
                  <span>Initial Password Setup (PBKDF2 Encrypted)</span>
                </div>
                <div>
                  <input
                    type="text"
                    required
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold text-[#111111] bg-white rounded-lg border border-amber-300"
                  />
                  <p className="text-[10px] text-amber-800 mt-1">
                    A cryptographic salt will be generated and hashed using PBKDF2 with 100,000 iterations.
                  </p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={createRequireChange}
                    onChange={(e) => setCreateRequireChange(e.target.checked)}
                    className="rounded text-[#111111] focus:ring-[#FFC400]"
                  />
                  <span className="text-xs text-amber-900 font-medium">Require user to change password on first login</span>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#666666] hover:bg-[#F7F7F7] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] font-bold text-xs rounded-xl shadow-xs flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Hashing & Provisioning...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: EDIT USER ACCOUNT */}
      {/* ======================================================== */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-[#E8E8E8] overflow-hidden">
            <div className="bg-[#111111] text-white px-6 py-4 flex items-center justify-between border-b border-[#222222]">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#FFC400]" />
                <h3 className="font-bold text-sm text-white">Edit User: {editingAccount.user_id}</h3>
              </div>
              <button onClick={() => setEditingAccount(null)} className="text-[#888888] hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-[#111111] bg-white rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-[#111111] bg-white rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs font-semibold text-[#111111] bg-white rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
                  >
                    <option value="admin">Company Administrator</option>
                    <option value="site_supervisor">Site Supervisor</option>
                    <option value="accountant">Accountant</option>
                    <option value="worker">Employee / Worker</option>
                    <option value="storekeeper">Materials Storekeeper</option>
                    <option value="project_manager">Senior Project Manager</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs font-semibold text-[#111111] bg-white rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
                >
                  <option value="active">Active (Access Granted)</option>
                  <option value="inactive">Inactive (Access Suspended)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#666666] hover:bg-[#F7F7F7] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] font-bold text-xs rounded-xl shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ADMIN PASSWORD RESET */}
      {/* ======================================================== */}
      {resettingPasswordAccount && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-[#E8E8E8] overflow-hidden">
            <div className="bg-[#111111] text-white px-6 py-4 flex items-center justify-between border-b border-[#222222]">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#FFC400]" />
                <h3 className="font-bold text-sm text-white">Reset Password: {resettingPasswordAccount.full_name}</h3>
              </div>
              <button onClick={() => setResettingPasswordAccount(null)} className="text-[#888888] hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminResetPasswordSubmit} className="p-6 space-y-4">
              <p className="text-xs text-[#666666]">
                As an authorized administrator, you can reset the password for <strong>{resettingPasswordAccount.user_id}</strong>. The user will be required to change their password on next sign in.
              </p>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  New Password (min 8 characters)
                </label>
                <input
                  type="text"
                  required
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-[#111111] bg-white rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResettingPasswordAccount(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#666666] hover:bg-[#F7F7F7] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || adminNewPassword.length < 8}
                  className="px-5 py-2.5 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] font-bold text-xs rounded-xl shadow-xs"
                >
                  {isSubmitting ? 'Hashing & Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
