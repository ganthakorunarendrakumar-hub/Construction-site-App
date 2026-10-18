import { dataService } from './dataService';
import { MaterialTransaction, GenericMaterialTransaction, Project, MaterialCategoryDef } from '../types';

export interface UnifiedTransaction {
  id: string;
  projectId: string;
  projectName: string;
  category: string;
  categoryName: string;
  itemName: string;
  subcategory?: string;
  brandName?: string;
  diameterOrSize?: string;
  unit: string;
  transactionDate: string; // YYYY-MM-DD
  transactionType: 'receipt' | 'usage' | 'issue' | 'damage' | 'return' | 'adjustment' | 'opening_stock';
  quantity: number;
  receivedQty: number;
  usedQty: number;
  damagedQty: number;
  returnQty: number;
  adjustedQty: number;
  supplierName?: string;
  invoiceNumber?: string;
  challanNumber?: string;
  locationName?: string;
  createdByName: string;
  createdByRole?: string;
  remarks?: string;
  isReusable: boolean;
  createdAt: string;
}

export interface MaterialDateRangeSummary {
  key: string;
  category: string;
  categoryName: string;
  itemName: string;
  subcategory?: string;
  brandName?: string;
  diameterOrSize?: string;
  unit: string;
  isReusable: boolean;
  openingStock: number;
  received: number;
  used: number;
  damaged: number;
  returned: number;
  adjusted: number;
  closingStock: number;
  netChange: number;
  transactionCount: number;
}

export interface DateRangeReportResult {
  reportType: 'date_range';
  fromDate: string;
  toDate: string;
  projectId: string;
  projectName: string;
  categoryId: string;
  categoryName: string;
  totalReceived: number;
  totalUsed: number;
  totalDamaged: number;
  totalReturned: number;
  totalAdjusted: number;
  totalTransactions: number;
  activeMaterialsCount: number;
  materialSummaries: MaterialDateRangeSummary[];
  transactions: UnifiedTransaction[];
}

export interface MaterialCumulativeSummary {
  key: string;
  category: string;
  categoryName: string;
  itemName: string;
  subcategory?: string;
  brandName?: string;
  diameterOrSize?: string;
  unit: string;
  isReusable: boolean;
  cumulativeReceived: number;
  cumulativeUsed: number;
  cumulativeDamaged: number;
  cumulativeReturned: number;
  cumulativeAdjusted: number;
  closingStock: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  transactionCount: number;
}

export interface CumulativeReportResult {
  reportType: 'up_to_date';
  upToDate: string;
  projectId: string;
  projectName: string;
  categoryId: string;
  categoryName: string;
  cumulativeReceived: number;
  cumulativeUsed: number;
  cumulativeDamaged: number;
  cumulativeReturned: number;
  cumulativeAdjusted: number;
  totalTransactions: number;
  totalMaterialsInStock: number;
  activeMaterialsCount: number;
  materialSummaries: MaterialCumulativeSummary[];
  transactions: UnifiedTransaction[];
}

class ReportService {
  /**
   * Loads all raw transactions from both cement and generic tables and unifies them.
   */
  public async getUnifiedTransactions(projectId?: string, categoryId?: string): Promise<{
    transactions: UnifiedTransaction[];
    projectsMap: Map<string, Project>;
    categoriesMap: Map<string, MaterialCategoryDef>;
  }> {
    const [projects, categories] = await Promise.all([
      dataService.getProjects(),
      dataService.getCategories()
    ]);

    const projectsMap = new Map<string, Project>();
    projects.forEach(p => projectsMap.set(p.id, p));

    const categoriesMap = new Map<string, MaterialCategoryDef>();
    categories.forEach(c => categoriesMap.set(c.id, c));
    categoriesMap.set('cement', {
      id: 'cement',
      name: 'Cement',
      description: 'Bulk & bagged structural cement',
      iconName: 'Package',
      is_core: true,
      is_reusable: false,
      default_unit: 'Bags',
      allowed_units: ['Bags', 'Tonnes']
    });

    const unified: UnifiedTransaction[] = [];

    // 1. Load Cement Transactions
    const storedCement = localStorage.getItem('buildpulse_transactions_v1');
    const cementTxList: MaterialTransaction[] = storedCement ? JSON.parse(storedCement) : [];

    for (const tx of cementTxList) {
      if (tx.is_reversal) continue; // Exclude reversed entries
      if (projectId && projectId !== 'all' && tx.project_id !== projectId) continue;
      if (categoryId && categoryId !== 'all' && categoryId !== 'cement') continue;

      const proj = projectsMap.get(tx.project_id);
      const projName = proj ? proj.name : tx.project_id;

      const receivedQty = tx.transaction_type === 'receipt' ? (tx.received_qty || tx.quantity_bags) : 0;
      const usedQty = tx.transaction_type === 'usage' ? (tx.used_qty || tx.quantity_bags) : 0;
      const damagedQty = tx.transaction_type === 'damage' ? (tx.damaged_qty || tx.quantity_bags) : 0;
      const returnQty = tx.transaction_type === 'return' ? tx.quantity_bags : 0;

      unified.push({
        id: tx.id,
        projectId: tx.project_id,
        projectName: projName,
        category: 'cement',
        categoryName: 'Cement',
        itemName: tx.brand_name || 'Cement Brand',
        brandName: tx.brand_name,
        unit: 'Bags',
        transactionDate: tx.transaction_date,
        transactionType: tx.transaction_type,
        quantity: tx.quantity_bags,
        receivedQty,
        usedQty,
        damagedQty,
        returnQty,
        adjustedQty: 0,
        supplierName: tx.supplier_name,
        invoiceNumber: tx.invoice_number,
        challanNumber: tx.challan_number,
        locationName: tx.location_name,
        createdByName: tx.created_by_name || 'Store Staff',
        createdByRole: tx.created_by_role,
        remarks: tx.remarks,
        isReusable: false,
        createdAt: tx.created_at
      });
    }

    // 2. Load Generic Transactions (Steel, Sand, Bricks, Aggregate, PPE, Tools, Regular Site-Use Materials, etc.)
    const storedGeneric = localStorage.getItem('buildpulse_generic_transactions_v2');
    const genericTxList: GenericMaterialTransaction[] = storedGeneric ? JSON.parse(storedGeneric) : [];

    for (const tx of genericTxList) {
      if (tx.is_reversal) continue; // Exclude reversed entries
      if (projectId && projectId !== 'all' && tx.project_id !== projectId) continue;
      if (categoryId && categoryId !== 'all' && tx.category !== categoryId) continue;

      const proj = projectsMap.get(tx.project_id);
      const projName = proj ? proj.name : tx.project_id;
      const catDef = categoriesMap.get(tx.category);
      const catName = catDef ? catDef.name : tx.category;
      const isReusable = catDef ? catDef.is_reusable : false;

      const isReceipt = tx.transaction_type === 'receipt';
      const isUsage = tx.transaction_type === 'usage' || tx.transaction_type === 'issue';
      const isDamage = tx.transaction_type === 'damage';
      const isReturn = tx.transaction_type === 'return';
      const isAdjustment = tx.transaction_type === 'adjustment';
      const isOpening = tx.transaction_type === 'opening_stock';

      const receivedQty = (isReceipt || isOpening) ? (tx.received_qty || tx.quantity) : 0;
      const usedQty = isUsage ? (tx.used_qty || tx.quantity) : 0;
      const damagedQty = isDamage ? (tx.damaged_qty || tx.quantity) : 0;
      const returnQty = isReturn ? (tx.return_qty || tx.quantity) : 0;
      const adjustedQty = isAdjustment ? (tx.quantity) : 0;

      unified.push({
        id: tx.id,
        projectId: tx.project_id,
        projectName: projName,
        category: tx.category,
        categoryName: catName,
        itemName: tx.item_name,
        subcategory: tx.subcategory,
        brandName: tx.brand_name,
        diameterOrSize: tx.diameter_or_size,
        unit: tx.unit || 'Nos',
        transactionDate: tx.transaction_date,
        transactionType: tx.transaction_type,
        quantity: tx.quantity,
        receivedQty,
        usedQty,
        damagedQty,
        returnQty,
        adjustedQty,
        supplierName: tx.supplier_name,
        invoiceNumber: tx.invoice_number,
        challanNumber: tx.challan_number,
        locationName: tx.location_name,
        createdByName: tx.created_by_name || 'Site Staff',
        createdByRole: tx.created_by_role,
        remarks: tx.remarks,
        isReusable,
        createdAt: tx.created_at
      });
    }

    // Sort descending by date, then created_at
    unified.sort((a, b) => {
      const d = b.transactionDate.localeCompare(a.transactionDate);
      if (d !== 0) return d;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return { transactions: unified, projectsMap, categoriesMap };
  }

  private getItemKey(t: { category: string; itemName: string; brandName?: string; diameterOrSize?: string; unit: string }): string {
    return `${t.category}:::${t.itemName.toLowerCase()}:::${(t.brandName || '').toLowerCase()}:::${(t.diameterOrSize || '').toLowerCase()}:::${t.unit.toLowerCase()}`;
  }

  /**
   * OPTION 1: DATE RANGE REPORT
   * - Filters transactions between fromDate and toDate (inclusive).
   * - Calculates opening stock as of fromDate (all transactions strictly before fromDate).
   * - Calculates closing stock as of toDate (all transactions up to toDate).
   * - Accurately differentiates reusable vs consumable formulas.
   */
  public async generateDateRangeReport(params: {
    fromDate: string;
    toDate: string;
    projectId?: string;
    categoryId?: string;
    search?: string;
  }): Promise<DateRangeReportResult> {
    const { fromDate, toDate, projectId = 'all', categoryId = 'all', search } = params;

    const { transactions, projectsMap, categoriesMap } = await this.getUnifiedTransactions(
      projectId === 'all' ? undefined : projectId,
      categoryId === 'all' ? undefined : categoryId
    );

    const projName = projectId === 'all'
      ? 'All Projects (Portfolio)'
      : (projectsMap.get(projectId)?.name || projectId);

    const catName = categoryId === 'all'
      ? 'All Categories'
      : (categoriesMap.get(categoryId)?.name || categoryId);

    // Group all historical transactions by unique material item key
    const allMaterialsMap = new Map<string, {
      key: string;
      category: string;
      categoryName: string;
      itemName: string;
      subcategory?: string;
      brandName?: string;
      diameterOrSize?: string;
      unit: string;
      isReusable: boolean;
      allTx: UnifiedTransaction[];
    }>();

    for (const tx of transactions) {
      const key = this.getItemKey(tx);
      if (!allMaterialsMap.has(key)) {
        allMaterialsMap.set(key, {
          key,
          category: tx.category,
          categoryName: tx.categoryName,
          itemName: tx.itemName,
          subcategory: tx.subcategory,
          brandName: tx.brandName,
          diameterOrSize: tx.diameterOrSize,
          unit: tx.unit,
          isReusable: tx.isReusable,
          allTx: []
        });
      }
      allMaterialsMap.get(key)!.allTx.push(tx);
    }

    let totalReceived = 0;
    let totalUsed = 0;
    let totalDamaged = 0;
    let totalReturned = 0;
    let totalAdjusted = 0;

    const materialSummaries: MaterialDateRangeSummary[] = [];
    const inRangeTransactions: UnifiedTransaction[] = [];

    // Search query filter
    const query = search ? search.toLowerCase().trim() : '';

    allMaterialsMap.forEach(mat => {
      // Historical opening stock: strictly before fromDate (tx.transactionDate < fromDate)
      let openingStock = 0;
      let preReceived = 0;
      let preUsed = 0;
      let preDamaged = 0;
      let preReturned = 0;
      let preAdjusted = 0;

      // Range movements: fromDate <= tx.transactionDate <= toDate
      let rangeReceived = 0;
      let rangeUsed = 0;
      let rangeDamaged = 0;
      let rangeReturned = 0;
      let rangeAdjusted = 0;
      let rangeTxCount = 0;

      for (const tx of mat.allTx) {
        if (tx.transactionDate < fromDate) {
          // Pre-range transactions (Historical opening stock)
          if (tx.transactionType === 'opening_stock') {
            openingStock += tx.quantity;
          } else if (tx.transactionType === 'receipt') {
            preReceived += tx.receivedQty;
          } else if (tx.transactionType === 'usage' || tx.transactionType === 'issue') {
            preUsed += tx.usedQty;
          } else if (tx.transactionType === 'damage') {
            preDamaged += tx.damagedQty;
          } else if (tx.transactionType === 'return') {
            preReturned += tx.returnQty;
          } else if (tx.transactionType === 'adjustment') {
            preAdjusted += tx.adjustedQty;
          }
        } else if (tx.transactionDate <= toDate) {
          // In range
          rangeTxCount++;
          if (tx.transactionType === 'opening_stock') {
            rangeReceived += tx.quantity;
          } else if (tx.transactionType === 'receipt') {
            rangeReceived += tx.receivedQty;
          } else if (tx.transactionType === 'usage' || tx.transactionType === 'issue') {
            rangeUsed += tx.usedQty;
          } else if (tx.transactionType === 'damage') {
            rangeDamaged += tx.damagedQty;
          } else if (tx.transactionType === 'return') {
            rangeReturned += tx.returnQty;
          } else if (tx.transactionType === 'adjustment') {
            rangeAdjusted += tx.adjustedQty;
          }

          // Check search query for individual transaction inclusion
          if (!query || 
              tx.itemName.toLowerCase().includes(query) ||
              tx.categoryName.toLowerCase().includes(query) ||
              tx.supplierName?.toLowerCase().includes(query) ||
              tx.invoiceNumber?.toLowerCase().includes(query) ||
              tx.challanNumber?.toLowerCase().includes(query) ||
              tx.createdByName.toLowerCase().includes(query) ||
              tx.remarks?.toLowerCase().includes(query)
          ) {
            inRangeTransactions.push(tx);
          }
        }
      }

      // Compute historical opening stock as of fromDate:
      let openingBalance = 0;
      if (mat.isReusable) {
        // Reusable: Opening in yard = Opening + Received + Returns + Adjustments - Issued - Damaged
        openingBalance = (openingStock + preReceived + preReturned + preAdjusted) - (preUsed + preDamaged);
      } else {
        // Consumable: Opening = Opening + Received + Adjustments - Used - Damaged - Returns
        openingBalance = (openingStock + preReceived + preAdjusted) - (preUsed + preDamaged + preReturned);
      }

      // Compute closing stock as of toDate:
      let closingBalance = 0;
      if (mat.isReusable) {
        closingBalance = openingBalance + (rangeReceived + rangeReturned + rangeAdjusted) - (rangeUsed + rangeDamaged);
      } else {
        closingBalance = openingBalance + (rangeReceived + rangeAdjusted) - (rangeUsed + rangeDamaged + rangeReturned);
      }

      const netChange = closingBalance - openingBalance;

      // Only include material if it has activity in the range, or has opening/closing balance, or matches search
      const hasActivity = rangeTxCount > 0 || openingBalance !== 0 || closingBalance !== 0;
      const matchesSearch = !query || 
        mat.itemName.toLowerCase().includes(query) ||
        mat.categoryName.toLowerCase().includes(query) ||
        (mat.subcategory && mat.subcategory.toLowerCase().includes(query));

      if (hasActivity && matchesSearch) {
        totalReceived += rangeReceived;
        totalUsed += rangeUsed;
        totalDamaged += rangeDamaged;
        totalReturned += rangeReturned;
        totalAdjusted += rangeAdjusted;

        materialSummaries.push({
          key: mat.key,
          category: mat.category,
          categoryName: mat.categoryName,
          itemName: mat.itemName,
          subcategory: mat.subcategory,
          brandName: mat.brandName,
          diameterOrSize: mat.diameterOrSize,
          unit: mat.unit,
          isReusable: mat.isReusable,
          openingStock: Math.max(0, openingBalance),
          received: rangeReceived,
          used: rangeUsed,
          damaged: rangeDamaged,
          returned: rangeReturned,
          adjusted: rangeAdjusted,
          closingStock: Math.max(0, closingBalance),
          netChange,
          transactionCount: rangeTxCount
        });
      }
    });

    // Sort material summaries: first by category, then by item name
    materialSummaries.sort((a, b) => {
      const c = a.categoryName.localeCompare(b.categoryName);
      if (c !== 0) return c;
      return a.itemName.localeCompare(b.itemName);
    });

    return {
      reportType: 'date_range',
      fromDate,
      toDate,
      projectId,
      projectName: projName,
      categoryId,
      categoryName: catName,
      totalReceived,
      totalUsed,
      totalDamaged,
      totalReturned,
      totalAdjusted,
      totalTransactions: inRangeTransactions.length,
      activeMaterialsCount: materialSummaries.length,
      materialSummaries,
      transactions: inRangeTransactions
    };
  }

  /**
   * OPTION 2: TOTAL REPORT UP TO DATE
   * - Does NOT ask for From Date!
   * - Cumulative report from the beginning of transaction history up to and including upToDate.
   * - Excludes any transactions occurring after upToDate to preserve historical accuracy.
   */
  public async generateCumulativeReportUpToDate(params: {
    upToDate: string;
    projectId?: string;
    categoryId?: string;
    search?: string;
  }): Promise<CumulativeReportResult> {
    const { upToDate, projectId = 'all', categoryId = 'all', search } = params;

    const { transactions, projectsMap, categoriesMap } = await this.getUnifiedTransactions(
      projectId === 'all' ? undefined : projectId,
      categoryId === 'all' ? undefined : categoryId
    );

    const projName = projectId === 'all'
      ? 'All Projects (Portfolio)'
      : (projectsMap.get(projectId)?.name || projectId);

    const catName = categoryId === 'all'
      ? 'All Categories'
      : (categoriesMap.get(categoryId)?.name || categoryId);

    // Group cumulative transactions up to and including upToDate
    const allMaterialsMap = new Map<string, {
      key: string;
      category: string;
      categoryName: string;
      itemName: string;
      subcategory?: string;
      brandName?: string;
      diameterOrSize?: string;
      unit: string;
      isReusable: boolean;
      allTx: UnifiedTransaction[];
    }>();

    for (const tx of transactions) {
      const key = this.getItemKey(tx);
      if (!allMaterialsMap.has(key)) {
        allMaterialsMap.set(key, {
          key,
          category: tx.category,
          categoryName: tx.categoryName,
          itemName: tx.itemName,
          subcategory: tx.subcategory,
          brandName: tx.brandName,
          diameterOrSize: tx.diameterOrSize,
          unit: tx.unit,
          isReusable: tx.isReusable,
          allTx: []
        });
      }
      allMaterialsMap.get(key)!.allTx.push(tx);
    }

    let cumulativeReceived = 0;
    let cumulativeUsed = 0;
    let cumulativeDamaged = 0;
    let cumulativeReturned = 0;
    let cumulativeAdjusted = 0;

    const materialSummaries: MaterialCumulativeSummary[] = [];
    const qualifiedTransactions: UnifiedTransaction[] = [];

    const query = search ? search.toLowerCase().trim() : '';

    allMaterialsMap.forEach(mat => {
      let openingStock = 0;
      let cumReceived = 0;
      let cumUsed = 0;
      let cumDamaged = 0;
      let cumReturned = 0;
      let cumAdjusted = 0;
      let txCount = 0;

      for (const tx of mat.allTx) {
        // Only include if on or before upToDate (inclusive)
        if (tx.transactionDate <= upToDate) {
          txCount++;

          if (tx.transactionType === 'opening_stock') {
            openingStock += tx.quantity;
            cumReceived += tx.quantity;
          } else if (tx.transactionType === 'receipt') {
            cumReceived += tx.receivedQty;
          } else if (tx.transactionType === 'usage' || tx.transactionType === 'issue') {
            cumUsed += tx.usedQty;
          } else if (tx.transactionType === 'damage') {
            cumDamaged += tx.damagedQty;
          } else if (tx.transactionType === 'return') {
            cumReturned += tx.returnQty;
          } else if (tx.transactionType === 'adjustment') {
            cumAdjusted += tx.adjustedQty;
          }

          if (!query ||
              tx.itemName.toLowerCase().includes(query) ||
              tx.categoryName.toLowerCase().includes(query) ||
              tx.supplierName?.toLowerCase().includes(query) ||
              tx.invoiceNumber?.toLowerCase().includes(query) ||
              tx.challanNumber?.toLowerCase().includes(query) ||
              tx.createdByName.toLowerCase().includes(query) ||
              tx.remarks?.toLowerCase().includes(query)
          ) {
            qualifiedTransactions.push(tx);
          }
        }
      }

      // Compute closing stock balance as of upToDate:
      let closingBalance = 0;
      if (mat.isReusable) {
        closingBalance = (cumReceived + cumReturned + cumAdjusted) - (cumUsed + cumDamaged);
      } else {
        closingBalance = (cumReceived + cumAdjusted) - (cumUsed + cumDamaged + cumReturned);
      }

      const hasActivity = txCount > 0 || closingBalance !== 0;
      const matchesSearch = !query ||
        mat.itemName.toLowerCase().includes(query) ||
        mat.categoryName.toLowerCase().includes(query) ||
        (mat.subcategory && mat.subcategory.toLowerCase().includes(query));

      if (hasActivity && matchesSearch) {
        cumulativeReceived += cumReceived;
        cumulativeUsed += cumUsed;
        cumulativeDamaged += cumDamaged;
        cumulativeReturned += cumReturned;
        cumulativeAdjusted += cumAdjusted;

        const safeClosingStock = Math.max(0, closingBalance);
        let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
        if (safeClosingStock === 0) {
          stockStatus = 'out_of_stock';
        } else if (safeClosingStock <= 5) {
          stockStatus = 'low_stock';
        }

        materialSummaries.push({
          key: mat.key,
          category: mat.category,
          categoryName: mat.categoryName,
          itemName: mat.itemName,
          subcategory: mat.subcategory,
          brandName: mat.brandName,
          diameterOrSize: mat.diameterOrSize,
          unit: mat.unit,
          isReusable: mat.isReusable,
          cumulativeReceived: cumReceived,
          cumulativeUsed: cumUsed,
          cumulativeDamaged: cumDamaged,
          cumulativeReturned: cumReturned,
          cumulativeAdjusted: cumAdjusted,
          closingStock: safeClosingStock,
          stockStatus,
          transactionCount: txCount
        });
      }
    });

    materialSummaries.sort((a, b) => {
      const c = a.categoryName.localeCompare(b.categoryName);
      if (c !== 0) return c;
      return a.itemName.localeCompare(b.itemName);
    });

    const inStockCount = materialSummaries.filter(m => m.closingStock > 0).length;

    return {
      reportType: 'up_to_date',
      upToDate,
      projectId,
      projectName: projName,
      categoryId,
      categoryName: catName,
      cumulativeReceived,
      cumulativeUsed,
      cumulativeDamaged,
      cumulativeReturned,
      cumulativeAdjusted,
      totalTransactions: qualifiedTransactions.length,
      totalMaterialsInStock: inStockCount,
      activeMaterialsCount: materialSummaries.length,
      materialSummaries,
      transactions: qualifiedTransactions
    };
  }

  /**
   * Generates CSV for Date Range Report (Option 1)
   */
  public generateDateRangeCsv(report: DateRangeReportResult, companyName = 'CHEN INFRA'): string {
    const lines: string[] = [];
    const escapeCsv = (str?: string | number | null) => {
      if (str === undefined || str === null) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    lines.push(escapeCsv(`${companyName} - BUILDPULSE ERP`));
    lines.push(escapeCsv('DATE RANGE INVENTORY & STOCK REPORT'));
    lines.push(`"Report Range:",${escapeCsv(`${report.fromDate} to ${report.toDate}`)}`);
    lines.push(`"Project Scope:",${escapeCsv(report.projectName)}`);
    lines.push(`"Category Scope:",${escapeCsv(report.categoryName)}`);
    lines.push(`"Generated On:",${escapeCsv(new Date().toLocaleString())}`);
    lines.push('');

    // Executive Summary
    lines.push(escapeCsv(`EXECUTIVE SUMMARY (${report.fromDate} to ${report.toDate})`));
    lines.push('"Metric","Value"');
    lines.push(`"Total Transactions in Range",${report.totalTransactions}`);
    lines.push(`"Active Materials with Activity",${report.activeMaterialsCount}`);
    lines.push(`"Total Materials Received Qty",${report.totalReceived}`);
    lines.push(`"Total Materials Used / Issued Qty",${report.totalUsed}`);
    lines.push(`"Total Materials Damaged Qty",${report.totalDamaged}`);
    lines.push(`"Total Materials Returned Qty",${report.totalReturned}`);
    lines.push(`"Total Materials Adjusted Qty",${report.totalAdjusted}`);
    lines.push('');

    // Material-wise Summary
    lines.push(escapeCsv('MATERIAL-WISE INVENTORY LEDGER (HISTORICAL STOCK BALANCE)'));
    lines.push('"Category","Material Name","Subcategory","Unit","Opening Stock (as of ' + report.fromDate + ')","Received in Range","Used / Issued in Range","Damaged in Range","Returned in Range","Adjusted in Range","Closing Stock (as of ' + report.toDate + ')","Net Stock Change","Transactions Count"');

    for (const m of report.materialSummaries) {
      lines.push(
        [
          escapeCsv(m.categoryName),
          escapeCsv(m.itemName + (m.brandName ? ` (${m.brandName})` : '') + (m.diameterOrSize ? ` - ${m.diameterOrSize}` : '')),
          escapeCsv(m.subcategory || 'General'),
          escapeCsv(m.unit),
          m.openingStock,
          m.received,
          m.used,
          m.damaged,
          m.returned,
          m.adjusted,
          m.closingStock,
          m.netChange >= 0 ? `+${m.netChange}` : `${m.netChange}`,
          m.transactionCount
        ].join(',')
      );
    }
    lines.push('');

    // Detailed Itemized Transaction Log
    lines.push(escapeCsv('ITEMIZED TRANSACTION LOG (' + report.fromDate + ' to ' + report.toDate + ')'));
    lines.push('"Date","Project","Category","Material / Item","Type","Quantity","Unit","Supplier / Issued To","Invoice # / Challan #","Location","Recorded By","Remarks"');

    for (const tx of report.transactions) {
      const party = tx.supplierName || tx.remarks?.includes('issued') ? (tx.supplierName || 'Site Crew') : (tx.supplierName || '—');
      const doc = [tx.invoiceNumber, tx.challanNumber].filter(Boolean).join(' / ') || '—';
      lines.push(
        [
          escapeCsv(tx.transactionDate),
          escapeCsv(tx.projectName),
          escapeCsv(tx.categoryName),
          escapeCsv(tx.itemName + (tx.brandName ? ` (${tx.brandName})` : '')),
          escapeCsv(tx.transactionType.toUpperCase()),
          tx.quantity,
          escapeCsv(tx.unit),
          escapeCsv(party),
          escapeCsv(doc),
          escapeCsv(tx.locationName || 'Main Storage'),
          escapeCsv(tx.createdByName),
          escapeCsv(tx.remarks || '')
        ].join(',')
      );
    }

    return lines.join('\r\n');
  }

  /**
   * Generates CSV for Total Report Up To Date (Option 2)
   */
  public generateCumulativeCsv(report: CumulativeReportResult, companyName = 'CHEN INFRA'): string {
    const lines: string[] = [];
    const escapeCsv = (str?: string | number | null) => {
      if (str === undefined || str === null) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    lines.push(escapeCsv(`${companyName} - BUILDPULSE ERP`));
    lines.push(escapeCsv('CUMULATIVE INVENTORY & STOCK REPORT UP TO DATE'));
    lines.push(`"Report Up To Date:",${escapeCsv(report.upToDate)}`);
    lines.push(`"Project Scope:",${escapeCsv(report.projectName)}`);
    lines.push(`"Category Scope:",${escapeCsv(report.categoryName)}`);
    lines.push(`"Generated On:",${escapeCsv(new Date().toLocaleString())}`);
    lines.push('');

    // Executive Summary
    lines.push(escapeCsv(`CUMULATIVE EXECUTIVE SUMMARY (UP TO ${report.upToDate})`));
    lines.push('"Metric","Value"');
    lines.push(`"Total Transactions Recorded Up To Date",${report.totalTransactions}`);
    lines.push(`"Active Materials Tracked",${report.activeMaterialsCount}`);
    lines.push(`"Materials In Stock",${report.totalMaterialsInStock}`);
    lines.push(`"Cumulative Materials Received Qty",${report.cumulativeReceived}`);
    lines.push(`"Cumulative Materials Used / Issued Qty",${report.cumulativeUsed}`);
    lines.push(`"Cumulative Materials Damaged Qty",${report.cumulativeDamaged}`);
    lines.push(`"Cumulative Materials Returned Qty",${report.cumulativeReturned}`);
    lines.push(`"Cumulative Materials Adjusted Qty",${report.cumulativeAdjusted}`);
    lines.push('');

    // Material-wise Summary
    lines.push(escapeCsv('MATERIAL-WISE CUMULATIVE STOCK BALANCES (AS OF ' + report.upToDate + ')'));
    lines.push('"Category","Material Name","Subcategory","Unit","Cumulative Received","Cumulative Used / Issued","Cumulative Damaged","Cumulative Returned","Cumulative Adjusted","Closing Stock Balance (as of ' + report.upToDate + ')","Stock Status","Total Transactions"');

    for (const m of report.materialSummaries) {
      lines.push(
        [
          escapeCsv(m.categoryName),
          escapeCsv(m.itemName + (m.brandName ? ` (${m.brandName})` : '') + (m.diameterOrSize ? ` - ${m.diameterOrSize}` : '')),
          escapeCsv(m.subcategory || 'General'),
          escapeCsv(m.unit),
          m.cumulativeReceived,
          m.cumulativeUsed,
          m.cumulativeDamaged,
          m.cumulativeReturned,
          m.cumulativeAdjusted,
          m.closingStock,
          escapeCsv(m.stockStatus === 'in_stock' ? 'In Stock' : m.stockStatus === 'low_stock' ? 'Low Stock' : 'Out of Stock'),
          m.transactionCount
        ].join(',')
      );
    }
    lines.push('');

    // Detailed Itemized Transaction Log
    lines.push(escapeCsv('ITEMIZED CUMULATIVE TRANSACTION LOG (UP TO ' + report.upToDate + ')'));
    lines.push('"Date","Project","Category","Material / Item","Type","Quantity","Unit","Supplier / Issued To","Invoice # / Challan #","Location","Recorded By","Remarks"');

    for (const tx of report.transactions) {
      const party = tx.supplierName || (tx.remarks?.includes('issued') ? 'Site Crew' : '—');
      const doc = [tx.invoiceNumber, tx.challanNumber].filter(Boolean).join(' / ') || '—';
      lines.push(
        [
          escapeCsv(tx.transactionDate),
          escapeCsv(tx.projectName),
          escapeCsv(tx.categoryName),
          escapeCsv(tx.itemName + (tx.brandName ? ` (${tx.brandName})` : '')),
          escapeCsv(tx.transactionType.toUpperCase()),
          tx.quantity,
          escapeCsv(tx.unit),
          escapeCsv(party),
          escapeCsv(doc),
          escapeCsv(tx.locationName || 'Main Storage'),
          escapeCsv(tx.createdByName),
          escapeCsv(tx.remarks || '')
        ].join(',')
      );
    }

    return lines.join('\r\n');
  }

  /**
   * Triggers a browser download of the CSV content.
   */
  public downloadCsv(filename: string, csvContent: string): void {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const reportService = new ReportService();
