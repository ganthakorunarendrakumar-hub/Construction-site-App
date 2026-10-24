import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarRange,
  Clock,
  Download,
  Filter,
  Search,
  Building2,
  Package,
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  FileSpreadsheet,
  Calendar,
  ChevronRight,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { Project, MaterialCategoryDef } from '../types';
import { dataService } from '../services/dataService';
import {
  reportService,
  DateRangeReportResult,
  CumulativeReportResult,
  MaterialDateRangeSummary,
  MaterialCumulativeSummary,
  UnifiedTransaction
} from '../services/reportService';
import { getLocalDateString, getLocalDateStringOffset, getLocalMonthStartString, getLocalYearStartString } from '../utils/dateUtils';

interface ReportsViewProps {
  initialProjectId?: string;
  onNavigateBack?: () => void;
  onNavigateHome?: () => void;
  onOpenProject?: (project: Project) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  initialProjectId = 'all',
  onNavigateBack,
  onNavigateHome,
  onOpenProject
}) => {
  // Mode selection: 1. Date Range Report | 2. Total Report Up To Date
  const [reportMode, setReportMode] = useState<'date_range' | 'up_to_date'>('date_range');

  // Option 1 inputs: From Date & To Date
  const [fromDate, setFromDate] = useState<string>(getLocalMonthStartString());
  const [toDate, setToDate] = useState<string>(getLocalDateString());

  // Option 2 input: ONLY Report Up To Date (Never ask for fromDate in this option)
  const [upToDate, setUpToDate] = useState<string>(getLocalDateString());

  // Common filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'materials' | 'transactions'>('materials');

  // Data state
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<MaterialCategoryDef[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Category definitions are the single source for this filter. Keep the
  // first definition for a stable id or label so legacy saved catalog entries
  // cannot create duplicate dropdown choices without touching transactions.
  const reportCategories = categories.filter((category, index, all) => {
    const normalizedName = category.name.trim().toLowerCase();
    return all.findIndex(candidate =>
      candidate.id === category.id || candidate.name.trim().toLowerCase() === normalizedName
    ) === index;
  });

  // Results state
  const [dateRangeReport, setDateRangeReport] = useState<DateRangeReportResult | null>(null);
  const [cumulativeReport, setCumulativeReport] = useState<CumulativeReportResult | null>(null);

  // Load project & category lists
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [pList, cList] = await Promise.all([
          dataService.getProjects(),
          dataService.getCategories()
        ]);
        setProjects(pList);
        setCategories(cList);
      } catch (err) {
        console.error('Failed to load projects/categories for reports', err);
      }
    }
    loadMetadata();
  }, []);

  // Generate Report function
  const runReport = async () => {
    setIsLoading(true);
    try {
      if (reportMode === 'date_range') {
        const result = await reportService.generateDateRangeReport({
          fromDate,
          toDate,
          projectId: selectedProjectId,
          categoryId: selectedCategoryId,
          search: searchQuery
        });
        setDateRangeReport(result);
      } else {
        const result = await reportService.generateCumulativeReportUpToDate({
          upToDate,
          projectId: selectedProjectId,
          categoryId: selectedCategoryId,
          search: searchQuery
        });
        setCumulativeReport(result);
      }
    } catch (err) {
      console.error('Report calculation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-run report when mode, dates, project, category, or search changes
  useEffect(() => {
    runReport();
  }, [reportMode, fromDate, toDate, upToDate, selectedProjectId, selectedCategoryId, searchQuery]);

  // CSV Export handler
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const company = await dataService.getCompany();
      const compName = company.name || 'CHEN INFRA';

      if (reportMode === 'date_range' && dateRangeReport) {
        const csv = reportService.generateDateRangeCsv(dateRangeReport, compName);
        const filename = `${compName.replace(/[^a-zA-Z0-9]/g, '_')}_DateRange_Report_${fromDate}_to_${toDate}.csv`;
        reportService.downloadCsv(filename, csv);
      } else if (reportMode === 'up_to_date' && cumulativeReport) {
        const csv = reportService.generateCumulativeCsv(cumulativeReport, compName);
        const filename = `${compName.replace(/[^a-zA-Z0-9]/g, '_')}_Cumulative_Stock_Report_UpTo_${upToDate}.csv`;
        reportService.downloadCsv(filename, csv);
      }
    } catch (err) {
      console.error('CSV Export Error', err);
      alert('Failed to generate CSV export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Shortcuts
  const setQuickRange = (from: string, to: string) => {
    setFromDate(from);
    setToDate(to);
  };

  const setQuickCutoff = (date: string) => {
    setUpToDate(date);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 font-['Inter',sans-serif]">
      
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#666666]">
        {onNavigateHome && (
          <button onClick={onNavigateHome} className="hover:text-[#111111] transition-colors">
            CHEN INFRA
          </button>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-[#888888]" />
        {onNavigateBack && (
          <button onClick={onNavigateBack} className="hover:text-[#111111] transition-colors">
            Workspace
          </button>
        )}
        {onNavigateBack && <ChevronRight className="w-3.5 h-3.5 text-[#888888]" />}
        <span className="font-semibold text-[#111111]">Reports & Inventory Audits</span>
      </nav>

      {/* Main Header Card */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#FFC400] text-[#111111] font-mono">
                CHEN INFRA ERP
              </span>
              <span className="text-xs text-[#666666] font-medium">
                Live Transaction & Stock Auditing
              </span>
            </div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-[#111111] tracking-tight">
              Materials & Stock Reports
            </h1>
            <p className="text-xs sm:text-sm text-[#666666] max-w-2xl">
              Generate audited material inventory statements with historical accuracy. Choose between a bounded date range or cumulative stock ledger up to any date.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExportCsv}
              disabled={isLoading || isExporting}
              className="px-4 py-2.5 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
              title="Download CSV export matching the on-screen report"
            >
              <Download className="w-4 h-4 text-[#111111]" />
              <span>{isExporting ? 'Generating CSV...' : 'Download CSV Export'}</span>
            </button>
          </div>
        </div>

        {/* WORKFLOW: TWO PROMINENT REPORT SELECTION CARDS */}
        <div className="pt-3 border-t border-[#E8E8E8]">
          <p className="text-xs font-semibold text-[#666666] uppercase tracking-wider mb-3">
            Select Report Type:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* OPTION 1 CARD: Date Range Report */}
            <button
              type="button"
              onClick={() => {
                setReportMode('date_range');
                setActiveTab('materials');
              }}
              className={`text-left p-4 sm:p-5 rounded-2xl border-2 transition-all relative group ${
                reportMode === 'date_range'
                  ? 'border-[#FFC400] bg-[#FFC400]/10 shadow-sm ring-1 ring-[#FFC400]/30'
                  : 'border-[#E8E8E8] bg-white hover:border-[#CCCCCC] hover:bg-[#F7F7F7]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    reportMode === 'date_range'
                      ? 'bg-[#111111] text-[#FFC400]'
                      : 'bg-[#F7F7F7] text-[#111111] group-hover:bg-[#E8E8E8]'
                  }`}>
                    <CalendarRange className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-[#111111] flex items-center gap-2">
                      Option 1: Date Range Report
                      {reportMode === 'date_range' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#111111] text-[#FFC400]">
                          ACTIVE
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-[#666666] mt-0.5">
                      Between two specific dates (From Date & To Date)
                    </p>
                  </div>
                </div>
                {reportMode === 'date_range' && (
                  <CheckCircle2 className="w-5 h-5 text-[#111111] shrink-0" />
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-[#E8E8E8]/70 text-[11px] text-[#555555] space-y-1">
                <p>&bull; Asks for <strong>From Date</strong> and <strong>To Date</strong> (both dates included).</p>
                <p>&bull; Displays <strong>Opening Stock</strong> before start date, movements in range, and <strong>Closing Stock</strong>.</p>
                <p>&bull; Provides matching date-range CSV export.</p>
              </div>
            </button>

            {/* OPTION 2 CARD: Total Report Up To Date */}
            <button
              type="button"
              onClick={() => {
                setReportMode('up_to_date');
                setActiveTab('materials');
              }}
              className={`text-left p-4 sm:p-5 rounded-2xl border-2 transition-all relative group ${
                reportMode === 'up_to_date'
                  ? 'border-[#FFC400] bg-[#FFC400]/10 shadow-sm ring-1 ring-[#FFC400]/30'
                  : 'border-[#E8E8E8] bg-white hover:border-[#CCCCCC] hover:bg-[#F7F7F7]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    reportMode === 'up_to_date'
                      ? 'bg-[#111111] text-[#FFC400]'
                      : 'bg-[#F7F7F7] text-[#111111] group-hover:bg-[#E8E8E8]'
                  }`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-[#111111] flex items-center gap-2">
                      Option 2: Total Report Up To Date
                      {reportMode === 'up_to_date' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#111111] text-[#FFC400]">
                          ACTIVE
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-[#666666] mt-0.5">
                      Cumulative report up to one specific cut-off date
                    </p>
                  </div>
                </div>
                {reportMode === 'up_to_date' && (
                  <CheckCircle2 className="w-5 h-5 text-[#111111] shrink-0" />
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-[#E8E8E8]/70 text-[11px] text-[#555555] space-y-1">
                <p>&bull; Asks for <strong>only one date</strong>: Report Up To Date (No From Date asked).</p>
                <p>&bull; Cumulative from start of history; includes all projects or specific project.</p>
                <p>&bull; Displays cumulative movements and <strong>Closing Stock</strong> as of selected date.</p>
              </div>
            </button>

          </div>
        </div>
      </div>

      {/* FILTER & CONFIGURATION PANEL (Shows only relevant date fields for selected option) */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#111111] uppercase tracking-wider flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#111111]" />
            {reportMode === 'date_range' ? 'Date Range Configuration' : 'Cut-off Date Configuration'}
          </h2>
          <span className="text-[11px] text-[#666666]">
            {reportMode === 'date_range' ? 'Bounded Period Filter' : 'Single Cut-off Date Filter'}
          </span>
        </div>

        {/* DYNAMIC DATE FIELDS BASED ON SELECTED OPTION */}
        {reportMode === 'date_range' ? (
          /* OPTION 1: Shows From Date and To Date */
          <div className="bg-[#F7F7F7] p-4 rounded-xl border border-[#E8E8E8] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#111111]" />
                  From Date *
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white text-xs text-[#111111] font-semibold rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#111111]" />
                  To Date * (Inclusive)
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white text-xs text-[#111111] font-semibold rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400]"
                />
              </div>

              {/* Quick Preset Buttons for Date Range */}
              <div className="sm:col-span-2 flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-[#666666] mr-1">Quick:</span>
                <button
                  type="button"
                  onClick={() => setQuickRange(getLocalMonthStartString(), getLocalDateString())}
                  className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-[#E8E8E8] text-[#111111] rounded-lg border border-[#CCCCCC] transition-colors"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange(getLocalDateStringOffset(-6), getLocalDateString())}
                  className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-[#E8E8E8] text-[#111111] rounded-lg border border-[#CCCCCC] transition-colors"
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange(getLocalDateStringOffset(-13), getLocalDateStringOffset(-2))}
                  className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-[#E8E8E8] text-[#111111] rounded-lg border border-[#CCCCCC] transition-colors"
                >
                  Previous 12-Day Audit Window
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange(getLocalYearStartString(), getLocalDateString())}
                  className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-[#E8E8E8] text-[#111111] rounded-lg border border-[#CCCCCC] transition-colors"
                >
                  Year to Date
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-[#666666]">
              <Info className="w-3.5 h-3.5 text-[#111111] shrink-0" />
              <span>
                Report includes all transactions from <strong>{fromDate}</strong> through <strong>{toDate}</strong> (inclusive). Opening stock is accurately calculated from all activity strictly before {fromDate}.
              </span>
            </div>
          </div>
        ) : (
          /* OPTION 2: Shows ONLY Report Up To Date (Never ask for From Date) */
          <div className="bg-[#F7F7F7] p-4 rounded-xl border border-[#E8E8E8] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#111111]" />
                  Report Up To Date * (Cut-off Date)
                </label>
                <input
                  type="date"
                  value={upToDate}
                  onChange={(e) => setUpToDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white text-xs text-[#111111] font-semibold rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400]"
                />
              </div>

              {/* Quick Cutoff Buttons */}
              <div className="sm:col-span-3 flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-[#666666] mr-1">Quick Cut-off:</span>
                <button
                  type="button"
                  onClick={() => setQuickCutoff(getLocalDateString())}
                  className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-[#E8E8E8] text-[#111111] rounded-lg border border-[#CCCCCC] transition-colors"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setQuickCutoff(getLocalDateStringOffset(-3))}
                  className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-[#E8E8E8] text-[#111111] rounded-lg border border-[#CCCCCC] transition-colors"
                >
                  3 Days Ago
                </button>
                <button
                  type="button"
                  onClick={() => setQuickCutoff(getLocalDateStringOffset(-5))}
                  className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-[#E8E8E8] text-[#111111] rounded-lg border border-[#CCCCCC] transition-colors"
                >
                  5 Days Ago
                </button>
                <button
                  type="button"
                  onClick={() => setQuickCutoff(getLocalDateStringOffset(-7))}
                  className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-[#E8E8E8] text-[#111111] rounded-lg border border-[#CCCCCC] transition-colors"
                >
                  7 Days Ago
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-[#666666]">
              <Info className="w-3.5 h-3.5 text-[#111111] shrink-0" />
              <span>
                Cumulative report from the beginning of recorded history up to and including <strong>{upToDate}</strong>. Any transactions after this date are strictly excluded to preserve historical accuracy.
              </span>
            </div>
          </div>
        )}

        {/* COMMON SCOPE FILTERS (Project, Category, Search) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          
          {/* Project Selector */}
          <div>
            <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1">
              Project Scope
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 bg-white text-xs text-[#111111] font-semibold rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
            >
              <option value="all">All Projects (CHEN INFRA Portfolio)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1">
              Material Category
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-3 py-2 bg-white text-xs text-[#111111] font-semibold rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
            >
              <option value="all">All Categories</option>
              {reportCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Filter */}
          <div>
            <label className="block text-[11px] font-bold text-[#111111] uppercase mb-1">
              Search Material / Vendor / Doc
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#888888] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="e.g., UltraTech, Tata, Sponges, Helmets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white text-xs text-[#111111] rounded-xl border border-[#CCCCCC] focus:outline-none focus:border-[#FFC400]"
              />
            </div>
          </div>

        </div>

      </div>

      {/* EXECUTIVE SUMMARY KPI CARDS (Yellow, Black, White) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Total Transactions */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8E8E8] shadow-xs">
          <p className="text-[11px] font-semibold text-[#666666] uppercase">
            {reportMode === 'date_range' ? 'Transactions in Range' : 'Total Transactions'}
          </p>
          <p className="text-2xl font-bold text-[#111111] font-mono mt-1">
            {reportMode === 'date_range'
              ? (dateRangeReport?.totalTransactions ?? 0)
              : (cumulativeReport?.totalTransactions ?? 0)}
          </p>
          <span className="text-[10px] text-[#888888]">audited entries</span>
        </div>

        {/* Total Received */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8E8E8] shadow-xs border-l-4 border-l-[#FFC400]">
          <p className="text-[11px] font-semibold text-[#666666] uppercase">
            {reportMode === 'date_range' ? 'Received in Range' : 'Cumul. Received'}
          </p>
          <p className="text-2xl font-bold text-[#111111] font-mono mt-1">
            {reportMode === 'date_range'
              ? (dateRangeReport?.totalReceived ?? 0).toLocaleString()
              : (cumulativeReport?.cumulativeReceived ?? 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-[#666666]">delivered to sites</span>
        </div>

        {/* Total Used / Issued */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8E8E8] shadow-xs border-l-4 border-l-[#111111]">
          <p className="text-[11px] font-semibold text-[#666666] uppercase">
            {reportMode === 'date_range' ? 'Used / Issued in Range' : 'Cumul. Used / Issued'}
          </p>
          <p className="text-2xl font-bold text-[#111111] font-mono mt-1">
            {reportMode === 'date_range'
              ? (dateRangeReport?.totalUsed ?? 0).toLocaleString()
              : (cumulativeReport?.cumulativeUsed ?? 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-[#666666]">consumed on works</span>
        </div>

        {/* Total Damaged / Scrap */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8E8E8] shadow-xs border-l-4 border-l-rose-500">
          <p className="text-[11px] font-semibold text-[#666666] uppercase">
            {reportMode === 'date_range' ? 'Damaged in Range' : 'Cumul. Damaged'}
          </p>
          <p className="text-2xl font-bold text-rose-700 font-mono mt-1">
            {reportMode === 'date_range'
              ? (dateRangeReport?.totalDamaged ?? 0).toLocaleString()
              : (cumulativeReport?.cumulativeDamaged ?? 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-rose-600">spoilage / damaged</span>
        </div>

        {/* Total Returned */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8E8E8] shadow-xs border-l-4 border-l-emerald-500">
          <p className="text-[11px] font-semibold text-[#666666] uppercase">
            {reportMode === 'date_range' ? 'Returned in Range' : 'Cumul. Returned'}
          </p>
          <p className="text-2xl font-bold text-emerald-700 font-mono mt-1">
            {reportMode === 'date_range'
              ? (dateRangeReport?.totalReturned ?? 0).toLocaleString()
              : (cumulativeReport?.cumulativeReturned ?? 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-emerald-600">returned to store</span>
        </div>

        {/* Total Adjusted / In Stock */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8E8E8] shadow-xs border-l-4 border-l-blue-500">
          <p className="text-[11px] font-semibold text-[#666666] uppercase">
            {reportMode === 'date_range' ? 'Adjusted in Range' : 'Items In Stock'}
          </p>
          <p className="text-2xl font-bold text-blue-700 font-mono mt-1">
            {reportMode === 'date_range'
              ? (dateRangeReport?.totalAdjusted ?? 0).toLocaleString()
              : (cumulativeReport?.totalMaterialsInStock ?? 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-blue-600">
            {reportMode === 'date_range' ? 'audit adjustments' : 'active inventory'}
          </span>
        </div>

      </div>

      {/* REPORT CONTENT VIEW: TABS & TABLES */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden shadow-xs">
        
        {/* Table View Tabs & CSV Export Button */}
        <div className="px-5 py-3.5 border-b border-[#E8E8E8] flex flex-wrap items-center justify-between gap-3 bg-[#FAFAFA]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('materials')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors ${
                activeTab === 'materials'
                  ? 'bg-[#111111] text-white shadow-xs'
                  : 'text-[#666666] hover:text-[#111111] hover:bg-[#E8E8E8]'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              {reportMode === 'date_range' ? 'Material-Wise Stock Ledger' : 'Cumulative Stock Balances'}
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                activeTab === 'materials' ? 'bg-[#FFC400] text-[#111111]' : 'bg-[#E8E8E8] text-[#666666]'
              }`}>
                {reportMode === 'date_range'
                  ? (dateRangeReport?.materialSummaries.length ?? 0)
                  : (cumulativeReport?.materialSummaries.length ?? 0)}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors ${
                activeTab === 'transactions'
                  ? 'bg-[#111111] text-white shadow-xs'
                  : 'text-[#666666] hover:text-[#111111] hover:bg-[#E8E8E8]'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Itemized Transaction Log
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                activeTab === 'transactions' ? 'bg-[#FFC400] text-[#111111]' : 'bg-[#E8E8E8] text-[#666666]'
              }`}>
                {reportMode === 'date_range'
                  ? (dateRangeReport?.transactions.length ?? 0)
                  : (cumulativeReport?.transactions.length ?? 0)}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[#666666]">
              {reportMode === 'date_range'
                ? `Period: ${fromDate} → ${toDate}`
                : `Cut-off: ${upToDate}`}
            </span>
            <button
              onClick={handleExportCsv}
              disabled={isLoading || isExporting}
              className="px-3 py-1.5 bg-[#111111] hover:bg-[#222222] text-[#FFC400] font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#FFC400] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#666666] font-medium">
              Calculating historical stock balances from ledger records...
            </p>
          </div>
        ) : (
          <div>
            
            {/* VIEW 1: MATERIAL-WISE SUMMARY TABLE */}
            {activeTab === 'materials' && (
              <div className="overflow-x-auto">
                {reportMode === 'date_range' ? (
                  /* Option 1: Date Range Material Table */
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7F7F7] text-[#444444] uppercase font-bold border-b border-[#E8E8E8]">
                      <tr>
                        <th className="px-4 py-3">Material / Item</th>
                        <th className="px-3 py-3">Category</th>
                        <th className="px-2 py-3 text-center">Unit</th>
                        <th className="px-3 py-3 text-right bg-[#EAEAEA]/60" title={`Historical opening balance strictly before ${fromDate}`}>
                          Opening Stock ({fromDate})
                        </th>
                        <th className="px-3 py-3 text-right text-emerald-800">Received (+)</th>
                        <th className="px-3 py-3 text-right text-slate-800">Used / Issued (-)</th>
                        <th className="px-3 py-3 text-right text-rose-800">Damaged (-)</th>
                        <th className="px-3 py-3 text-right text-cyan-800">Returned</th>
                        <th className="px-3 py-3 text-right text-blue-800">Adjusted</th>
                        <th className="px-3 py-3 text-right font-bold bg-[#FFC400]/20 text-[#111111]" title={`Calculated closing balance as of ${toDate}`}>
                          Closing Stock ({toDate})
                        </th>
                        <th className="px-3 py-3 text-center">Net Change</th>
                        <th className="px-3 py-3 text-center">Txs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E8E8]">
                      {dateRangeReport?.materialSummaries.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="px-4 py-10 text-center text-[#666666]">
                            No material activity or stock recorded between {fromDate} and {toDate} for the selected filters.
                          </td>
                        </tr>
                      ) : (
                        dateRangeReport?.materialSummaries.map((m) => (
                          <tr key={m.key} className="hover:bg-[#F9F9F9] transition-colors">
                            <td className="px-4 py-3 font-semibold text-[#111111]">
                              <div>{m.itemName}</div>
                              {m.brandName && (
                                <span className="text-[11px] text-[#666666] font-normal">
                                  {m.brandName} {m.diameterOrSize ? `• ${m.diameterOrSize}` : ''}
                                </span>
                              )}
                              {m.subcategory && (
                                <span className="inline-block ml-1 text-[10px] px-1.5 py-0.2 bg-[#F0F0F0] text-[#555555] rounded">
                                  {m.subcategory}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-[#666666] whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-md bg-[#F7F7F7] border border-[#E8E8E8] text-[11px]">
                                {m.categoryName}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-center text-[#666666] font-mono whitespace-nowrap">
                              {m.unit}
                            </td>
                            <td className="px-3 py-3 text-right font-mono font-semibold bg-[#EAEAEA]/30">
                              {m.openingStock.toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-right font-mono font-semibold text-emerald-700">
                              {m.received > 0 ? `+${m.received.toLocaleString()}` : '0'}
                            </td>
                            <td className="px-3 py-3 text-right font-mono font-semibold text-slate-700">
                              {m.used > 0 ? `-${m.used.toLocaleString()}` : '0'}
                            </td>
                            <td className="px-3 py-3 text-right font-mono font-semibold text-rose-700">
                              {m.damaged > 0 ? `-${m.damaged.toLocaleString()}` : '0'}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-cyan-700">
                              {m.returned > 0 ? `+${m.returned.toLocaleString()}` : '0'}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-blue-700">
                              {m.adjusted !== 0 ? m.adjusted.toLocaleString() : '0'}
                            </td>
                            <td className="px-3 py-3 text-right font-mono font-bold text-sm bg-[#FFC400]/15 text-[#111111]">
                              {m.closingStock.toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                m.netChange > 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : m.netChange < 0
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {m.netChange > 0 ? `+${m.netChange}` : m.netChange}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center text-[#666666] font-mono">
                              {m.transactionCount}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : (
                  /* Option 2: Cumulative Up To Date Table */
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7F7F7] text-[#444444] uppercase font-bold border-b border-[#E8E8E8]">
                      <tr>
                        <th className="px-4 py-3">Material / Item</th>
                        <th className="px-3 py-3">Category</th>
                        <th className="px-2 py-3 text-center">Unit</th>
                        <th className="px-3 py-3 text-right text-emerald-800">Cumul. Received</th>
                        <th className="px-3 py-3 text-right text-slate-800">Cumul. Used / Issued</th>
                        <th className="px-3 py-3 text-right text-rose-800">Cumul. Damaged</th>
                        <th className="px-3 py-3 text-right text-cyan-800">Cumul. Returned</th>
                        <th className="px-3 py-3 text-right text-blue-800">Cumul. Adjusted</th>
                        <th className="px-3 py-3 text-right font-bold bg-[#FFC400]/20 text-[#111111]" title={`Calculated closing balance as of ${upToDate}`}>
                          Closing Stock ({upToDate})
                        </th>
                        <th className="px-3 py-3 text-center">Status</th>
                        <th className="px-3 py-3 text-center">Total Txs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E8E8]">
                      {cumulativeReport?.materialSummaries.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="px-4 py-10 text-center text-[#666666]">
                            No transaction history found up to {upToDate} for the selected criteria.
                          </td>
                        </tr>
                      ) : (
                        cumulativeReport?.materialSummaries.map((m) => (
                          <tr key={m.key} className="hover:bg-[#F9F9F9] transition-colors">
                            <td className="px-4 py-3 font-semibold text-[#111111]">
                              <div>{m.itemName}</div>
                              {m.brandName && (
                                <span className="text-[11px] text-[#666666] font-normal">
                                  {m.brandName} {m.diameterOrSize ? `• ${m.diameterOrSize}` : ''}
                                </span>
                              )}
                              {m.subcategory && (
                                <span className="inline-block ml-1 text-[10px] px-1.5 py-0.2 bg-[#F0F0F0] text-[#555555] rounded">
                                  {m.subcategory}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-[#666666] whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-md bg-[#F7F7F7] border border-[#E8E8E8] text-[11px]">
                                {m.categoryName}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-center text-[#666666] font-mono whitespace-nowrap">
                              {m.unit}
                            </td>
                            <td className="px-3 py-3 text-right font-mono font-semibold text-emerald-700">
                              {m.cumulativeReceived.toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-right font-mono font-semibold text-slate-700">
                              {m.cumulativeUsed.toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-right font-mono font-semibold text-rose-700">
                              {m.cumulativeDamaged.toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-cyan-700">
                              {m.cumulativeReturned.toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-blue-700">
                              {m.cumulativeAdjusted.toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-right font-mono font-bold text-sm bg-[#FFC400]/15 text-[#111111]">
                              {m.closingStock.toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                m.stockStatus === 'in_stock'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : m.stockStatus === 'low_stock'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {m.stockStatus === 'in_stock' ? 'In Stock' : m.stockStatus === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center text-[#666666] font-mono">
                              {m.transactionCount}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* VIEW 2: ITEMIZED TRANSACTIONS LOG TABLE */}
            {activeTab === 'transactions' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F7F7] text-[#444444] uppercase font-bold border-b border-[#E8E8E8]">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-3 py-3">Project</th>
                      <th className="px-3 py-3">Category</th>
                      <th className="px-4 py-3">Material / Item</th>
                      <th className="px-3 py-3 text-center">Type</th>
                      <th className="px-3 py-3 text-right">Quantity</th>
                      <th className="px-2 py-3 text-center">Unit</th>
                      <th className="px-3 py-3">Supplier / Issued To</th>
                      <th className="px-3 py-3">Invoice / Challan</th>
                      <th className="px-3 py-3">Recorded By</th>
                      <th className="px-4 py-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E8E8]">
                    {(reportMode === 'date_range' ? dateRangeReport?.transactions : cumulativeReport?.transactions)?.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-10 text-center text-[#666666]">
                          No individual transactions found matching the report criteria.
                        </td>
                      </tr>
                    ) : (
                      (reportMode === 'date_range' ? dateRangeReport?.transactions : cumulativeReport?.transactions)?.map((tx) => (
                        <tr key={tx.id} className="hover:bg-[#F9F9F9] transition-colors">
                          <td className="px-4 py-3 font-mono text-[#111111] whitespace-nowrap">
                            {tx.transactionDate}
                          </td>
                          <td className="px-3 py-3 font-semibold text-[#111111] max-w-xs truncate">
                            {tx.projectName}
                          </td>
                          <td className="px-3 py-3 text-[#666666] whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-[#F7F7F7] border border-[#E8E8E8] text-[11px]">
                              {tx.categoryName}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#111111]">
                            <div>{tx.itemName}</div>
                            {tx.brandName && (
                              <div className="text-[11px] text-[#666666] font-normal">{tx.brandName}</div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              tx.transactionType === 'receipt'
                                ? 'bg-emerald-100 text-emerald-800'
                                : (tx.transactionType === 'usage' || tx.transactionType === 'issue')
                                ? 'bg-slate-100 text-slate-800'
                                : tx.transactionType === 'damage'
                                ? 'bg-rose-100 text-rose-800'
                                : tx.transactionType === 'return'
                                ? 'bg-cyan-100 text-cyan-800'
                                : tx.transactionType === 'adjustment'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}>
                              {tx.transactionType}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-mono font-bold text-[#111111]">
                            {tx.quantity.toLocaleString()}
                          </td>
                          <td className="px-2 py-3 text-center text-[#666666] font-mono">
                            {tx.unit}
                          </td>
                          <td className="px-3 py-3 text-[#666666] max-w-[140px] truncate">
                            {tx.supplierName || (tx.remarks?.includes('issued') ? 'Site Gang' : '—')}
                          </td>
                          <td className="px-3 py-3 text-[#666666] font-mono text-[11px]">
                            {[tx.invoiceNumber, tx.challanNumber].filter(Boolean).join(' / ') || '—'}
                          </td>
                          <td className="px-3 py-3 text-[#666666] whitespace-nowrap">
                            {tx.createdByName}
                          </td>
                          <td className="px-4 py-3 text-[#666666] max-w-xs truncate text-[11px]">
                            {tx.remarks || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

        {/* Footer info & CSV button */}
        <div className="px-5 py-3 border-t border-[#E8E8E8] bg-[#FAFAFA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#666666]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FFC400]" />
            <span>
              {reportMode === 'date_range'
                ? `Historical Stock Ledger between ${fromDate} and ${toDate}`
                : `Cumulative Total Stock Ledger up to ${upToDate}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={isLoading || isExporting}
              className="px-3.5 py-1.5 bg-[#FFC400] hover:bg-[#F0B800] text-[#111111] font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#111111]" />
              Download Matching CSV
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
