import React, { useEffect, useState } from 'react';
import {
  Plus,
  CheckCircle2,
  Building2,
  Edit2,
  Check,
  X,
  ArrowRight,
  MapPin,
  User,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  Settings2,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { Company, Project, UserProfile } from '../types';
import { CompanyLogo } from './CompanyLogo';

interface HomeScreenProps {
  company: Company;
  companyLogoDisplayUrl?: string;
  ongoingProjects: Project[];
  completedProjects: Project[];
  currentUser: UserProfile;
  onUpdateCompanyName: (newName: string) => Promise<void>;
  onSaveCompanyBranding: (
    settings: { watermark_enabled: boolean; watermark_opacity: number; watermark_size: number },
    logoFile?: File
  ) => Promise<void>;
  onNavigateCreateProject: () => void;
  onNavigateOngoing: () => void;
  onNavigateCompleted: () => void;
  onNavigateReports?: () => void;
  onNavigateAttendance?: () => void;
  onNavigateUserManagement?: () => void;
  onOpenProject: (project: Project) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  company,
  companyLogoDisplayUrl,
  ongoingProjects,
  completedProjects,
  currentUser,
  onUpdateCompanyName,
  onSaveCompanyBranding,
  onNavigateCreateProject,
  onNavigateOngoing,
  onNavigateCompleted,
  onNavigateReports,
  onNavigateAttendance,
  onNavigateUserManagement,
  onOpenProject
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(company.name);
  const [isSavingName, setIsSavingName] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isBrandingSettingsOpen, setIsBrandingSettingsOpen] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | undefined>(companyLogoDisplayUrl);
  const [brandingError, setBrandingError] = useState<string | null>(null);
  const [brandingNotice, setBrandingNotice] = useState<string | null>(null);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [watermarkEnabled, setWatermarkEnabled] = useState(company.watermark_enabled === true);
  const [watermarkOpacity, setWatermarkOpacity] = useState(company.watermark_opacity ?? 6);
  const [watermarkSize, setWatermarkSize] = useState(company.watermark_size ?? 280);

  const canEditCompany = currentUser.role === 'admin';
  const canCreateProject = currentUser.role === 'admin' || currentUser.role === 'project_manager';
  const companyNameConfigured = Boolean(company.name.trim());

  useEffect(() => {
    let previewUrl: string | undefined;
    if (selectedLogoFile) {
      previewUrl = URL.createObjectURL(selectedLogoFile);
      setLogoPreview(previewUrl);
    } else {
      setLogoPreview(companyLogoDisplayUrl);
    }
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [selectedLogoFile, companyLogoDisplayUrl]);

  useEffect(() => {
    setEditNameValue(company.name);
    setWatermarkEnabled(company.watermark_enabled === true);
    setWatermarkOpacity(company.watermark_opacity ?? 6);
    setWatermarkSize(company.watermark_size ?? 280);
  }, [company.name, company.watermark_enabled, company.watermark_opacity, company.watermark_size]);

  const handleSaveCompanyName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNameValue.trim()) {
      setEditError('Company name cannot be blank.');
      return;
    }
    try {
      setIsSavingName(true);
      setEditError(null);
      await onUpdateCompanyName(editNameValue.trim());
      setIsEditingName(false);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update company name');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setBrandingError('Choose a PNG, JPG, or WebP image.');
      return;
    }
    if (file.size <= 0 || file.size > 512 * 1024) {
      setBrandingError('Company logos must be 512 KB or smaller.');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    const preview = new Image();
    preview.onload = () => {
      URL.revokeObjectURL(previewUrl);
      setBrandingError(null);
      setBrandingNotice(null);
      setSelectedLogoFile(file);
    };
    preview.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      setBrandingError('The selected file is not a readable image. Your current logo is unchanged.');
    };
    preview.src = previewUrl;
  };

  const resetBrandingDraft = () => {
    setSelectedLogoFile(null);
    setWatermarkEnabled(company.watermark_enabled === true);
    setWatermarkOpacity(company.watermark_opacity ?? 6);
    setWatermarkSize(company.watermark_size ?? 280);
    setBrandingError(null);
    setBrandingNotice(null);
  };

  const handleSaveBranding = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBrandingError(null);
    setBrandingNotice(null);
    setIsSavingBranding(true);
    try {
      await onSaveCompanyBranding({
        watermark_enabled: watermarkEnabled,
        watermark_opacity: Number(watermarkOpacity),
        watermark_size: Number(watermarkSize)
      }, selectedLogoFile || undefined);
      setSelectedLogoFile(null);
      setBrandingNotice('Company branding settings saved.');
    } catch (error) {
      setBrandingError(error instanceof Error ? error.message : 'Company branding could not be saved.');
    } finally {
      setIsSavingBranding(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      
      {/* Company overview */}
      <section className="bp-dashboard-hero rounded-2xl border border-bp-navy-border bg-bp-navy p-4 text-white sm:p-6">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold leading-tight tracking-tight text-white sm:text-2xl">
              Company overview
            </h1>

            {/* Company identity and setup */}
            {!companyNameConfigured && canEditCompany ? (
              <form onSubmit={handleSaveCompanyName} className="max-w-xl space-y-2 pt-2">
                <h2 className="text-sm font-semibold text-white">Set Up Your Company</h2>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <CompanyLogo src={companyLogoDisplayUrl} companyName={company.name} size={36} className="border border-white/20 bg-white" />
                  <label className="sr-only" htmlFor="company-name-setup">Company Name</label>
                  <input
                    id="company-name-setup"
                    type="text"
                    value={editNameValue}
                    onChange={event => setEditNameValue(event.target.value)}
                    autoComplete="organization"
                    maxLength={255}
                    required
                    className="min-h-10 w-full rounded-xl border border-bp-cyan bg-white px-3 py-2 text-sm font-semibold text-bp-text focus:outline-none focus:ring-2 focus:ring-bp-cyan sm:max-w-sm"
                    aria-label="Company Name"
                  />
                  <button
                    type="submit"
                    disabled={isSavingName || !editNameValue.trim()}
                    className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-bp-cyan px-4 py-2 text-xs font-semibold text-bp-navy transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Check className="h-4 w-4" />
                    Save Company Name
                  </button>
                </div>
                {editError && <p role="alert" className="text-xs text-rose-200">{editError}</p>}
              </form>
            ) : !companyNameConfigured ? (
              <p className="pt-1 text-sm text-white/75">Company name has not been configured.</p>
            ) : isEditingName ? (
              <form onSubmit={handleSaveCompanyName} className="flex flex-wrap items-center gap-2 pt-1">
                <CompanyLogo src={companyLogoDisplayUrl} companyName={company.name} size={32} className="border border-white/20 bg-white" />
                <input
                  type="text"
                  aria-label="Company Name"
                  autoComplete="organization"
                  maxLength={255}
                  required
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  className="w-full rounded-xl border border-bp-cyan bg-bp-background px-3 py-1.5 text-lg font-semibold text-bp-text focus:outline-none focus:ring-1 focus:ring-bp-cyan sm:w-80"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isSavingName}
                  className="px-3.5 py-1.5 bg-bp-cyan hover:bg-bp-blue text-bp-text font-semibold text-xs rounded-xl flex items-center gap-1 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingName(false);
                    setEditNameValue(company.name);
                    setEditError(null);
                  }}
                  className="px-3 py-1.5 bg-bp-background hover:bg-bp-border text-bp-muted text-xs font-medium rounded-xl flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                {editError && <p className="w-full text-xs text-rose-200">{editError}</p>}
              </form>
            ) : (
              <div className="flex min-w-0 flex-wrap items-center gap-2 pt-0.5">
                <CompanyLogo src={companyLogoDisplayUrl} companyName={company.name} size={34} className="border border-white/20 bg-white" />
                <span className="max-w-full break-words text-sm font-semibold text-white/85 sm:text-base">
                  {company.name}
                </span>
                {canEditCompany && (
                  <button
                    type="button"
                    onClick={() => { setEditNameValue(company.name); setEditError(null); setIsEditingName(true); }}
                    className="rounded-lg p-1 text-bp-border-strong transition-colors hover:bg-white/10 hover:text-white"
                    title="Edit company name"
                    aria-label="Edit company name"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {canEditCompany && (
                  <button
                    type="button"
                    onClick={() => { setBrandingError(null); setBrandingNotice(null); setIsBrandingSettingsOpen(value => !value); }}
                    className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/20"
                    aria-expanded={isBrandingSettingsOpen}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Company branding
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="grid w-full grid-cols-2 gap-2 md:max-w-xs">
            <div className="bp-dashboard-stat rounded-xl border border-white/10 bg-white/10 px-3.5 py-3">
              <p className="text-[11px] font-medium text-bp-border-strong">Ongoing projects</p>
              <p className="mt-0.5 bp-numeric text-2xl font-semibold text-white">{ongoingProjects.length}</p>
            </div>
            <div className="bp-dashboard-stat rounded-xl border border-white/10 bg-white/10 px-3.5 py-3">
              <p className="text-[11px] font-medium text-bp-border-strong">Completed projects</p>
              <p className="mt-0.5 bp-numeric text-2xl font-semibold text-white">{completedProjects.length}</p>
            </div>
          </div>
        </div>
      </section>

      {isBrandingSettingsOpen && canEditCompany && companyNameConfigured && (
        <section className="rounded-2xl border border-bp-border bg-white p-4 shadow-xs sm:p-5" aria-labelledby="company-branding-heading">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 id="company-branding-heading" className="text-base font-semibold text-bp-text">Company Logo Watermark</h2>
              <p className="mt-0.5 text-xs text-bp-muted">Manage the company logo and optional background watermark.</p>
            </div>
            <button type="button" onClick={() => setIsBrandingSettingsOpen(false)} className="rounded-lg p-2 text-bp-muted hover:bg-bp-background" aria-label="Close company branding settings">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSaveBranding} className="space-y-4">
            {brandingError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{brandingError}</p>}
            {brandingNotice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{brandingNotice}</p>}

            <div className="flex flex-col gap-4 rounded-xl border border-bp-border bg-bp-background p-3 sm:flex-row sm:items-center">
              <CompanyLogo src={logoPreview} companyName={company.name} size={68} className="border border-bp-border bg-white p-2" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-bp-text">Company Logo</p>
                <p className="mt-0.5 text-xs text-bp-muted">PNG, JPG, or WebP; maximum 512 KB. The BuildPulse mark is shown when no company logo is saved.</p>
                <label className="mt-2 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-bp-border-strong bg-white px-3 py-2 text-xs font-semibold text-bp-navy hover:border-bp-cyan">
                  <Upload className="h-4 w-4" />
                  {selectedLogoFile ? 'Choose a different logo' : 'Upload or select logo'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoFileChange} className="sr-only" aria-label="Upload company logo" />
                </label>
                {!logoPreview && <span className="ml-2 inline-flex items-center gap-1 text-xs text-bp-muted"><ImageIcon className="h-3.5 w-3.5" /> No logo selected</span>}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
              <div className="space-y-3 rounded-xl border border-bp-border p-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label htmlFor="company-watermark-toggle" className="text-sm font-semibold text-bp-text">Enable Watermark</label>
                    <p className="mt-0.5 text-xs text-bp-muted">Show the company logo behind application pages.</p>
                  </div>
                  <input
                    id="company-watermark-toggle"
                    type="checkbox"
                    checked={watermarkEnabled}
                    disabled={!company.logo_url && !selectedLogoFile}
                    onChange={event => setWatermarkEnabled(event.target.checked)}
                    className="h-5 w-5 accent-bp-blue disabled:cursor-not-allowed"
                    aria-label="Enable company logo watermark"
                  />
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-bp-border pt-3">
                  <span className="text-sm font-semibold text-bp-text">Disable Watermark</span>
                  <button type="button" onClick={() => setWatermarkEnabled(false)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${!watermarkEnabled ? 'bg-bp-navy text-white' : 'border border-bp-border text-bp-muted hover:bg-bp-background'}`}>
                    Disable
                  </button>
                </div>
                <label className="block text-xs font-medium text-bp-text">
                  Watermark opacity: {watermarkOpacity}%
                  <input type="range" min="1" max="20" value={watermarkOpacity} onChange={event => setWatermarkOpacity(Number(event.target.value))} disabled={!watermarkEnabled} className="mt-2 block w-full accent-bp-blue disabled:opacity-50" />
                </label>
                <label className="block text-xs font-medium text-bp-text">
                  Watermark size: {watermarkSize}px
                  <input type="range" min="120" max="360" step="10" value={watermarkSize} onChange={event => setWatermarkSize(Number(event.target.value))} disabled={!watermarkEnabled} className="mt-2 block w-full accent-bp-blue disabled:opacity-50" />
                </label>
              </div>

              <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-xl border border-bp-border bg-bp-background p-4" aria-label="Watermark preview">
                {watermarkEnabled && logoPreview ? (
                  <img src={logoPreview} alt="Watermark preview" className="max-h-full max-w-full object-contain" style={{ width: Math.min(watermarkSize, 320), opacity: watermarkOpacity / 100 }} />
                ) : (
                  <div className="text-center text-bp-muted">
                    <CompanyLogo src={logoPreview} companyName={company.name} size={48} className="mx-auto mb-2 bg-white" />
                    <p className="text-xs">Watermark is disabled.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-bp-border pt-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={() => { resetBrandingDraft(); setIsBrandingSettingsOpen(false); }} disabled={isSavingBranding} className="min-h-10 rounded-xl px-3 text-xs font-semibold text-bp-muted hover:bg-bp-background disabled:opacity-50">Cancel</button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => { setWatermarkEnabled(false); setWatermarkOpacity(6); setWatermarkSize(280); }} disabled={isSavingBranding} className="min-h-10 rounded-xl border border-bp-border px-3 text-xs font-semibold text-bp-muted hover:bg-bp-background disabled:opacity-50">Reset to Default</button>
                <button type="submit" disabled={isSavingBranding} className="min-h-10 rounded-xl bg-bp-navy px-4 text-xs font-semibold text-white hover:bg-bp-blue disabled:opacity-50">{isSavingBranding ? 'Saving…' : 'Save Settings'}</button>
              </div>
            </div>
          </form>
        </section>
      )}

      {/* SECTION 4: REDESIGNED THREE MAIN OPERATION CARDS */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-bp-text">
          Workspace shortcuts
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">

          {/* 1. Create Project */}
          {canCreateProject && (
          <div
            role="button"
            tabIndex={0}
            onClick={onNavigateCreateProject}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNavigateCreateProject(); } }}
            className="bp-dashboard-shortcut group flex cursor-pointer items-center justify-between rounded-xl border border-bp-border bg-white p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bp-cyan"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bp-blue font-bold text-white">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-bp-text">
                  Create Project
                </h3>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-bp-muted" />
          </div>
          )}

          {/* Completed Projects */}
          <div
            role="button"
            tabIndex={0}
            onClick={onNavigateCompleted}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNavigateCompleted(); } }}
            className="bp-dashboard-shortcut group flex cursor-pointer items-center justify-between rounded-xl border border-bp-border bg-white p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bp-cyan"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bp-cyan-soft text-bp-blue">
                <CheckCircle2 className="h-5 w-5 text-bp-blue group-hover:text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-bp-text">
                  Completed
                </h3>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-bp-muted" />
          </div>

          {/* 4. Material & Stock Reports */}
          {onNavigateReports && (
          <div
            role="button"
            tabIndex={0}
            onClick={onNavigateReports}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNavigateReports(); } }}
            className="bp-dashboard-shortcut group flex cursor-pointer items-center justify-between rounded-xl border border-bp-border bg-white p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bp-cyan"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bp-cyan-soft text-bp-blue">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-bp-text">
                  Stock Reports
                </h3>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-bp-muted transition-transform group-hover:translate-x-0.5" />
          </div>
          )}

          {/* 5. Attendance & Worker Groups */}
          {onNavigateAttendance && (
          <div
            role="button"
            tabIndex={0}
            onClick={onNavigateAttendance}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNavigateAttendance(); } }}
            className="bp-dashboard-shortcut group flex cursor-pointer items-center justify-between rounded-xl border border-bp-border bg-white p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bp-cyan"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bp-cyan-soft text-bp-blue">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-bp-text">
                  Attendance
                </h3>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-bp-muted transition-transform group-hover:translate-x-0.5" />
          </div>
          )}

          {/* 6. User Accounts & Security (Admin Only) */}
          {currentUser.role === 'admin' && onNavigateUserManagement && (
            <div
              role="button"
              tabIndex={0}
              onClick={onNavigateUserManagement}
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNavigateUserManagement(); } }}
              className="bp-dashboard-shortcut group flex cursor-pointer items-center justify-between rounded-xl border border-bp-border bg-white p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bp-cyan"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bp-cyan-soft text-bp-blue">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-bp-text">
                    User Accounts
                  </h3>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-bp-muted transition-transform group-hover:translate-x-0.5" />
            </div>
          )}

        </div>
      </section>

      {/* ACTIVE SITE HIGHLIGHTS: Clean consumer-app list */}
      <section className="bp-dashboard-section space-y-3 rounded-2xl border border-bp-border bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[18px] sm:text-xl font-semibold text-bp-text">
              Active Sites
            </h3>
          </div>
          <button
            onClick={onNavigateOngoing}
            className="text-xs font-semibold text-bp-text hover:text-bp-muted flex items-center gap-1 transition-colors"
          >
            View all &rarr;
          </button>
        </div>

        {ongoingProjects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-bp-border bg-bp-background py-7 text-center">
            <Building2 className="mx-auto mb-2 h-6 w-6 text-bp-muted" />
            <p className="text-sm font-medium text-bp-text">No ongoing projects</p>
            <p className="mt-1 text-xs text-bp-muted">Use Create Project above to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ongoingProjects.slice(0, 3).map((proj) => (
              <div
                key={proj.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpenProject(proj)}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenProject(proj); } }}
                className="bp-dashboard-shortcut group flex cursor-pointer flex-col justify-between rounded-xl border border-bp-border bg-white p-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bp-cyan"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-bp-background text-bp-text border border-bp-border">
                      {proj.code}
                    </span>
                    <span className="text-[11px] font-medium text-bp-muted">
                      {proj.location}
                    </span>
                  </div>

                  <h4 className="text-[15px] font-semibold text-bp-text group-hover:text-bp-text line-clamp-1">
                    {proj.name}
                  </h4>
                  <p className="text-xs text-bp-muted mt-0.5 line-clamp-1">
                    Client: {proj.client_name}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-bp-border flex items-center justify-between text-xs">
                  <span className="text-bp-muted flex items-center gap-1 text-[11px]">
                    <User className="w-3 h-3 text-bp-muted" />
                    {proj.project_manager_name}
                  </span>
                  <span className="font-semibold text-bp-text group-hover:underline flex items-center gap-1">
                    Open Workspace &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
};
