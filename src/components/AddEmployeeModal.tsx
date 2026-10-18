import React, { useState, useEffect } from 'react';
import { X, Upload, User, DollarSign, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Employee, AttendanceGroup, Project, SalaryType, EmployeeJobType } from '../types';
import { dataService } from '../services/dataService';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employeeData: {
    employee_code?: string;
    full_name: string;
    photo_url?: string;
    phone?: string;
    address?: string;
    job_type: EmployeeJobType | string;
    group_id: string;
    project_id?: string;
    joining_date?: string;
    salary_type: SalaryType;
    salary_amount: number;
    standard_hours_per_day?: number;
    overtime_rate_per_hour?: number;
    status?: 'active' | 'inactive';
    remarks?: string;
  }) => Promise<void>;
  editingEmployee?: Employee | null;
  groups: AttendanceGroup[];
  projects: Project[];
  defaultGroupId?: string;
}

const JOB_TYPES: EmployeeJobType[] = [
  'Labourer',
  'Mason',
  'Carpenter',
  'Electrician',
  'Plumber',
  'Welder',
  'Barbender',
  'Painter',
  'Supervisor',
  'Other'
];

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingEmployee,
  groups,
  projects,
  defaultGroupId
}) => {
  const [employeeCode, setEmployeeCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [jobType, setJobType] = useState<string>('Labourer');
  const [groupId, setGroupId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [joiningDate, setJoiningDate] = useState('2026-10-01');
  const [salaryType, setSalaryType] = useState<SalaryType>('daily_wage');
  const [salaryAmount, setSalaryAmount] = useState('800');
  const [standardHours, setStandardHours] = useState('8');
  const [overtimeRate, setOvertimeRate] = useState('150');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [remarks, setRemarks] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (editingEmployee) {
      setEmployeeCode(editingEmployee.employee_code);
      setFullName(editingEmployee.full_name);
      setPhotoUrl(editingEmployee.photo_url || '');
      setPhone(editingEmployee.phone || '');
      setAddress(editingEmployee.address || '');
      setJobType(editingEmployee.job_type);
      setGroupId(editingEmployee.group_id || '');
      setProjectId(editingEmployee.project_id || '');
      setJoiningDate(editingEmployee.joining_date || new Date().toISOString().split('T')[0]);
      setSalaryType(editingEmployee.salary_type || 'daily_wage');
      setSalaryAmount(String(editingEmployee.salary_amount));
      setStandardHours(String(editingEmployee.standard_hours_per_day || 8));
      setOvertimeRate(String(editingEmployee.overtime_rate_per_hour || 0));
      setStatus(editingEmployee.status || 'active');
      setRemarks(editingEmployee.remarks || '');
    } else {
      const activeGroupId = defaultGroupId || '';
      setGroupId(activeGroupId);
      
      const targetGroup = groups.find(g => g.id === activeGroupId);
      const prefix = targetGroup
        ? (targetGroup.name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'EMP')
        : 'IND';
      setEmployeeCode(`EMP-${prefix}-${Math.floor(100 + Math.random() * 900)}`);
      
      setFullName('');
      setPhotoUrl('');
      setPhone('');
      setAddress('');
      setJobType('Labourer');
      setProjectId(targetGroup?.project_id || projects[0]?.id || '');
      setJoiningDate(new Date().toISOString().split('T')[0]);
      setSalaryType('daily_wage');
      setSalaryAmount('750');
      setStandardHours('8');
      setOvertimeRate('140');
      setStatus('active');
      setRemarks('');
    }
    setError(null);
  }, [editingEmployee, isOpen, groups, defaultGroupId, projects]);

  const handleGroupChange = (newGroupId: string) => {
    setGroupId(newGroupId);
    const targetGroup = groups.find(g => g.id === newGroupId);
    if (targetGroup?.project_id) {
      setProjectId(targetGroup.project_id);
    }
    if (!editingEmployee) {
      const prefix = targetGroup
        ? (targetGroup.name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'EMP')
        : 'IND';
      setEmployeeCode(`EMP-${prefix}-${Math.floor(100 + Math.random() * 900)}`);
    }
  };

  // Auto-calculate suggested overtime rate when wage or standard hours change
  const handleSalaryChange = (newWage: string, type: SalaryType, stdH: string) => {
    setSalaryAmount(newWage);
    const numWage = Number(newWage);
    const numH = Number(stdH) || 8;
    if (!isNaN(numWage) && numWage > 0) {
      if (type === 'daily_wage') {
        const hourly = numWage / numH;
        setOvertimeRate(String(Math.round(hourly * 1.5)));
      } else if (type === 'monthly_salary') {
        const hourly = (numWage / 30) / numH;
        setOvertimeRate(String(Math.round(hourly * 1.5)));
      }
    }
  };

  if (!isOpen) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      setError(null);
      const res = await dataService.uploadAttachment(file, projectId || 'general');
      setPhotoUrl(res.url);
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Employee full name is required.');
      return;
    }
    const wageNum = Number(salaryAmount);
    if (isNaN(wageNum) || wageNum <= 0) {
      setError('Salary / wage amount must be a positive number.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        employee_code: employeeCode.trim(),
        full_name: fullName.trim(),
        photo_url: photoUrl.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        job_type: jobType,
        group_id: groupId || '',
        project_id: projectId || undefined,
        joining_date: joiningDate,
        salary_type: salaryType,
        salary_amount: wageNum,
        standard_hours_per_day: Number(standardHours) || 8,
        overtime_rate_per_hour: Number(overtimeRate) || 0,
        status,
        remarks: remarks.trim() || undefined
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save employee.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#111111]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#E8E8E8] max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#111111] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFC400] text-[#111111] flex items-center justify-center font-bold">
              <User className="w-4 h-4 text-[#111111]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {editingEmployee
                  ? `Edit Employee Details: ${editingEmployee.full_name}`
                  : defaultGroupId && groups.find(g => g.id === defaultGroupId)
                  ? `Add Employee to ${groups.find(g => g.id === defaultGroupId)?.name}`
                  : 'Add Employee (Group or Individual)'}
              </h2>
              <p className="text-[11px] text-[#888888]">
                Manual worker onboarding, profile photo & wage rate configuration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#888888] hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Photo & Basic Details */}
          <div className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-[#F7F7F7] rounded-xl border border-[#E8E8E8]">
            <div className="shrink-0 flex flex-col items-center gap-2">
              {photoUrl ? (
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#FFC400] bg-white shadow-xs">
                  <img src={photoUrl} alt="Employee" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="absolute top-1 right-1 p-0.5 bg-[#111111]/80 text-white rounded-full hover:bg-black"
                    title="Remove photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-[#CCCCCC] bg-white flex flex-col items-center justify-center text-[#888888]">
                  <User className="w-8 h-8 text-[#AAAAAA]" />
                  <span className="text-[9px] text-[#888888] mt-1 font-semibold">No Photo</span>
                </div>
              )}
            </div>

            <div className="flex-1 w-full space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-[#111111]" />
                  Upload Profile Photo (Manual Upload)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  className="block w-full text-xs text-[#666666] file:mr-3 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#111111] file:text-[#FFC400] hover:file:bg-[#222222] file:cursor-pointer"
                />
                <p className="text-[10px] text-[#888888] mt-0.5">
                  {uploadingPhoto ? 'Processing photo...' : 'Supports JPEG, PNG, WEBP worker photos'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1">
                    Employee ID (Unique) *
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs text-[#111111] font-mono font-bold rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1">
                    Employment Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3 py-1.5 text-xs text-[#111111] font-semibold rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400] bg-white"
                  >
                    <option value="active">Active Worker</option>
                    <option value="inactive">Inactive / On Leave</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Full Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Rameshwar Soren"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs text-[#111111] font-semibold rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                placeholder="+91 98450 00000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-xs text-[#111111] rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
              />
            </div>
          </div>

          {/* Job Type & Group Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1">
                Job / Worker Type *
              </label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="w-full px-3 py-2 text-xs text-[#111111] font-semibold rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400] bg-white"
              >
                {JOB_TYPES.map(j => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1">
                Assigned Group
              </label>
              <select
                value={groupId}
                onChange={(e) => handleGroupChange(e.target.value)}
                className="w-full px-3 py-2 text-xs text-[#111111] font-semibold rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400] bg-white"
              >
                <option value="">None / Ungrouped (Individual Employee)</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name} {g.project_name ? `• ${g.project_name}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-[#888888] mt-0.5">
                {groupId ? 'Worker will be attached to this group gang' : 'Worker will remain in the Individual Employees pool'}
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1">
                Project / Site
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs text-[#111111] font-semibold rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400] bg-white"
              >
                <option value="">General Company Sites</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Joining Date & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1">
                Joining Date
              </label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full px-3 py-2 text-xs text-[#111111] rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1">
                Address / Camp Location (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., Worker Shed #4, Skyline Project Site"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2 text-xs text-[#111111] rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
              />
            </div>
          </div>

          {/* SALARY & WAGE CONFIGURATION */}
          <div className="p-4 bg-[#FFFDF2] rounded-xl border border-[#FFEBAA] space-y-3">
            <h4 className="text-xs font-bold text-[#111111] uppercase flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#111111]" />
              Wage, Working Hours & Payroll Configuration
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1">
                  Salary Type *
                </label>
                <select
                  value={salaryType}
                  onChange={(e) => {
                    const st = e.target.value as SalaryType;
                    setSalaryType(st);
                    handleSalaryChange(salaryAmount, st, standardHours);
                  }}
                  className="w-full px-3 py-2 text-xs text-[#111111] font-semibold rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400] bg-white"
                >
                  <option value="daily_wage">Daily Wage</option>
                  <option value="monthly_salary">Monthly Salary</option>
                  <option value="contract">Contract</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1">
                  {salaryType === 'daily_wage' ? 'Daily Wage (₹) *' : salaryType === 'monthly_salary' ? 'Monthly Pay (₹) *' : 'Contract Rate (₹) *'}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={salaryAmount}
                  onChange={(e) => handleSalaryChange(e.target.value, salaryType, standardHours)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-[#111111] rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#111111]" />
                  Std Hours / Day
                </label>
                <input
                  type="number"
                  required
                  min="4"
                  max="16"
                  step="0.5"
                  value={standardHours}
                  onChange={(e) => {
                    setStandardHours(e.target.value);
                    handleSalaryChange(salaryAmount, salaryType, e.target.value);
                  }}
                  className="w-full px-3 py-2 text-xs font-mono text-[#111111] rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1">
                  Overtime (₹/hour)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={overtimeRate}
                  onChange={(e) => setOvertimeRate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono text-[#111111] rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
                />
              </div>
            </div>

            <p className="text-[10px] text-[#666666]">
              Earnings calculate automatically when marking attendance (Present = 1 payable day, Half Day = 0.5 payable day). Overtime accumulates when actual working hours exceed standard daily hours.
            </p>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1">
              Remarks & Qualifications
            </label>
            <input
              type="text"
              placeholder="e.g., Specializes in beam staging, safety certified, 8 years experience"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3.5 py-2 text-xs text-[#111111] rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#E8E8E8] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-[#666666] hover:bg-[#F7F7F7] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingEmployee ? 'Save Changes' : 'Register Employee'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
