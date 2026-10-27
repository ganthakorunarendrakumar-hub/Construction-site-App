import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, CalendarClock, CheckCircle2, CircleDollarSign, Clock3, Download,
  FileText, Fuel, Plus, Truck, Users, X
} from 'lucide-react';
import {
  Project, TransactionAttachments, UserProfile, VehicleDealerPaymentMethod,
  VehicleDealerPaymentType, VehicleDealerRecord, VehicleDealerPaymentRecord,
  VehicleFuelEntryRecord, VehicleDriverFuelAdvanceRecord, VehicleFuelPayer, VehicleHireBillingMethod,
  VehicleHireContractRecord, VehicleHireDisplayStatus, VehicleHireReturnRecord,
  VehicleFuelType, VehicleHireRecord, VehicleMovementRecord, VehicleRentalRecord
} from '../types';
import { dataService } from '../services/dataService';
import { getLocalDateString } from '../utils/dateUtils';
import {
  calculateDealerOutstanding, calculateFinalVehicleHireBill, calculateVehicleFuelAmount,
  calculateWorkingSessions, formatIndianRupees, getVehicleHireDisplayStatus,
  getVehicleHireLocalDateTime, isDateInsideRange, isValidVehicleHireDate,
  signedVehicleDealerPaymentAmount, sumValidVehicleMovementMinutes
} from '../utils/vehicleHire';
import { AttachmentLinks, AttachmentSections, emptyTransactionAttachments } from './AttachmentSections';
import { VEHICLE_TYPES } from '../utils/hireCatalog';

interface VehicleHireOperationsProps {
  currentProject: Project;
  currentUser: UserProfile;
  onNavigateBack: () => void;
  onNavigateHome: () => void;
  onShowLegacy: () => void;
  onUploadFile: (file: File) => Promise<{ url: string; name: string; size: number }>;
}

type ViewTab = 'overview' | 'dealers' | 'hires' | 'returns' | 'payments' | 'fuel' | 'reports';
type SiteOption = { id?: string; project_id: string; name: string };
type DealerDraft = Omit<VehicleDealerRecord, 'id' | 'company_id' | 'created_by' | 'created_by_name' | 'created_at' | 'updated_at'> & { id?: string };
type HireDraft = {
  id?: string; dealer_id: string; project_id: string; site_id?: string; site_name: string;
  asset_id?: string; vehicle_type: string; registration_number: string; vehicle_description: string;
  driver_name: string; driver_phone: string; start_at: string; expected_return_at: string;
  billing_method: VehicleHireBillingMethod; agreed_rate: string; initial_meter_reading: string;
  initial_engine_hours: string; advance_amount: string; advance_payment_method: VehicleDealerPaymentMethod;
  advance_transaction_reference: string; remarks: string; attachments: TransactionAttachments;
};
type ReturnDraft = {
  hire_id: string; actual_return_at: string; final_meter_reading: string; final_engine_hours: string;
  billable_usage: string; return_condition: string; additional_charges: string; discount: string;
  correction_reason: string; remarks: string; attachments: TransactionAttachments;
};
type PaymentDraft = {
  id?: string; dealer_id: string; hire_id: string; payment_date: string; amount: string;
  payment_type: VehicleDealerPaymentType; method: VehicleDealerPaymentMethod;
  transaction_reference: string; remarks: string; receipt: TransactionAttachments; idempotency_key: string;
  correction_reason: string;
};
type FuelDraft = {
  id?: string;
  hire_id: string; project_id: string; site_id?: string; site_name: string; asset_id: string;
  dealer_id: string; driver_advance_id: string; fuel_date: string; fuel_type: VehicleFuelType; quantity_litres: string;
  price_per_litre: string; meter_reading: string; supplier: string; payer: VehicleFuelPayer;
  driver_advance_amount: string; confirm_dealer_reimbursement: boolean; notes: string; idempotency_key: string; correction_reason: string;
  receipt: TransactionAttachments;
};
type AdvanceDraft = {
  hire_id: string; project_id: string; site_id?: string; site_name: string; driver_name: string;
  advance_date: string; amount: string; method: VehicleDealerPaymentMethod; transaction_reference: string; idempotency_key: string;
};

const rolesCanManage = (role: UserProfile['role']) => ['admin', 'project_manager', 'site_supervisor'].includes(role);
const canConfirmFuelReimbursement = (role: UserProfile['role']) => ['admin', 'project_manager'].includes(role);
const fieldClass = 'mt-1 min-h-10 w-full rounded-lg border border-bp-border bg-white px-3 py-2 text-sm text-bp-text outline-none focus:border-bp-cyan focus:ring-2 focus:ring-bp-cyan/20 disabled:bg-bp-background';
const buttonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';
const money = (amount: number) => formatIndianRupees(Number.isFinite(amount) ? amount : 0);
const round = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
const hireVehicleKey = (hire: VehicleHireContractRecord) => `${hire.vehicle_type}|${hire.registration_number || hire.vehicle_description}`;
const formatDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('en-IN') : value || '—';
};
const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const downloadCsv = (rows: unknown[][], filename: string) => {
  const content = rows.map(row => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
const paymentMethods: Array<[VehicleDealerPaymentMethod, string]> = [
  ['bank_transfer', 'Bank transfer'], ['upi', 'UPI'], ['cash', 'Cash'], ['cheque', 'Cheque'], ['other', 'Other']
];
const paymentTypes: Array<[VehicleDealerPaymentType, string]> = [['advance', 'Advance'], ['partial', 'Partial'], ['full', 'Full']];
const billingMethods: Array<[VehicleHireBillingMethod, string]> = [
  ['hour', 'Hour'], ['day', 'Day'], ['trip', 'Trip'], ['month', 'Month'], ['fixed_contract', 'Fixed contract amount']
];

const freshDealer = (): DealerDraft => ({ dealer_id: '', name: '', contact_person: '', phone: '', address: '', email: '', payment_details: '', remarks: '', status: 'active' });
const freshHire = (project: Project): HireDraft => {
  const start = getVehicleHireLocalDateTime();
  const nextDay = new Date();
  nextDay.setDate(nextDay.getDate() + 1);
  return {
    dealer_id: '', project_id: project.id, site_name: project.location || project.name,
    vehicle_type: VEHICLE_TYPES[0], registration_number: '', vehicle_description: '', driver_name: '', driver_phone: '',
    start_at: start, expected_return_at: getVehicleHireLocalDateTime(nextDay), billing_method: 'day', agreed_rate: '',
    initial_meter_reading: '', initial_engine_hours: '', advance_amount: '', advance_payment_method: 'bank_transfer',
    advance_transaction_reference: '', remarks: '', attachments: emptyTransactionAttachments()
  };
};
const freshReturn = (hireId = ''): ReturnDraft => ({
  hire_id: hireId, actual_return_at: getVehicleHireLocalDateTime(), final_meter_reading: '', final_engine_hours: '',
  billable_usage: '', return_condition: 'Good', additional_charges: '0', discount: '0', correction_reason: '',
  remarks: '', attachments: emptyTransactionAttachments()
});
const freshPayment = (): PaymentDraft => ({
  dealer_id: '', hire_id: '', payment_date: getLocalDateString(), amount: '', payment_type: 'partial',
  method: 'bank_transfer', transaction_reference: '', remarks: '', receipt: emptyTransactionAttachments(), idempotency_key: `vehicle-payment-${crypto.randomUUID()}`, correction_reason: ''
});
const freshFuel = (project: Project): FuelDraft => ({
  hire_id: '', project_id: project.id, site_name: project.location || project.name, asset_id: '', dealer_id: '',
  driver_advance_id: '', fuel_date: getLocalDateString(), fuel_type: 'diesel', quantity_litres: '', price_per_litre: '', meter_reading: '',
  supplier: '', payer: 'company_direct', driver_advance_amount: '', confirm_dealer_reimbursement: false,
  notes: '', receipt: emptyTransactionAttachments(), idempotency_key: `vehicle-fuel-${crypto.randomUUID()}`, correction_reason: ''
});
const freshAdvance = (project: Project): AdvanceDraft => ({
  hire_id: '', project_id: project.id, site_name: project.location || project.name, driver_name: '',
  advance_date: getLocalDateString(), amount: '', method: 'bank_transfer', transaction_reference: '', idempotency_key: `driver-fuel-advance-${crypto.randomUUID()}`
});

export const VehicleHireOperations: React.FC<VehicleHireOperationsProps> = ({ currentProject, currentUser, onNavigateBack, onNavigateHome, onShowLegacy, onUploadFile }) => {
  const manager = rolesCanManage(currentUser.role);
  const [tab, setTab] = useState<ViewTab>('overview');
  const [projects, setProjects] = useState<Project[]>([currentProject]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [dealers, setDealers] = useState<VehicleDealerRecord[]>([]);
  const [hires, setHires] = useState<VehicleHireContractRecord[]>([]);
  const [returns, setReturns] = useState<VehicleHireReturnRecord[]>([]);
  const [payments, setPayments] = useState<VehicleDealerPaymentRecord[]>([]);
  const [fuel, setFuel] = useState<VehicleFuelEntryRecord[]>([]);
  const [fuelAdvances, setFuelAdvances] = useState<VehicleDriverFuelAdvanceRecord[]>([]);
  const [assets, setAssets] = useState<Awaited<ReturnType<typeof dataService.getVehicleAssets>>>([]);
  const [legacyRentals, setLegacyRentals] = useState<VehicleRentalRecord[]>([]);
  const [movements, setMovements] = useState<VehicleMovementRecord[]>([]);
  const [legacyVehicleLogs, setLegacyVehicleLogs] = useState<VehicleHireRecord[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([...VEHICLE_TYPES]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [dealerFilter, setDealerFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dealerDialog, setDealerDialog] = useState(false);
  const [dealerDraft, setDealerDraft] = useState<DealerDraft>(freshDealer());
  const [hireDialog, setHireDialog] = useState(false);
  const [hireDraft, setHireDraft] = useState<HireDraft>(freshHire(currentProject));
  const [detailHire, setDetailHire] = useState<VehicleHireContractRecord | null>(null);
  const [returnDialog, setReturnDialog] = useState(false);
  const [returnDraft, setReturnDraft] = useState<ReturnDraft>(freshReturn());
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft>(freshPayment());
  const [fuelDialog, setFuelDialog] = useState(false);
  const [fuelDraft, setFuelDraft] = useState<FuelDraft>(freshFuel(currentProject));
  const [advanceDialog, setAdvanceDialog] = useState(false);
  const [advanceDraft, setAdvanceDraft] = useState<AdvanceDraft>(freshAdvance(currentProject));
  const [vehicleTypeDialog, setVehicleTypeDialog] = useState(false);
  const [vehicleTypeDraft, setVehicleTypeDraft] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [formBaselines, setFormBaselines] = useState<Record<string, string>>({});

  const setFormBaseline = (key: string, value: unknown) => setFormBaselines(current => ({ ...current, [key]: JSON.stringify(value) }));
  const isFormDirty = (key: string, value: unknown) => formBaselines[key] !== undefined && JSON.stringify(value) !== formBaselines[key];

  const reload = useCallback(async () => {
    setError(null);
    const [nextProjects, nextDealers, nextHires, nextReturns, nextPayments, nextFuel, nextAdvances, nextAssets, nextTypes, nextMovements, nextLegacyRentals] = await Promise.all([
      dataService.getProjects(), dataService.getVehicleDealers(), dataService.getVehicleHireContracts(),
      dataService.getVehicleHireReturns(), dataService.getVehicleDealerPayments(), dataService.getVehicleFuelEntries(),
      dataService.getVehicleDriverFuelAdvances(), dataService.getVehicleAssets(), dataService.getVehicleTypes(),
      dataService.getVehicleMovementRecords(), dataService.getVehicleRentalRecords()
    ]);
    const permittedProjects = currentUser.role === 'site_supervisor' && currentUser.assigned_projects?.length
      ? nextProjects.filter(project => currentUser.assigned_projects?.includes(project.id)) : nextProjects;
    const visible = permittedProjects.some(project => project.id === currentProject.id) ? permittedProjects : [currentProject, ...permittedProjects];
    setProjects(visible);
    setDealers(nextDealers);
    setHires(nextHires);
    setReturns(nextReturns);
    setPayments(nextPayments);
    setFuel(nextFuel);
    setFuelAdvances(nextAdvances);
    setAssets(nextAssets);
    setLegacyRentals(nextLegacyRentals);
    setVehicleTypes(nextTypes);
    setMovements(nextMovements);
    const oldLogs = (await Promise.all(visible.map(project => dataService.getVehicleHireRecords(project.id)))).flat();
    setLegacyVehicleLogs(oldLogs);
    const nextSites = (await Promise.all(visible.map(async project => {
      try {
        const locations = await dataService.getMaterialLocations(project.id);
        return [{ project_id: project.id, name: project.location || project.name }, ...locations.map(location => ({ id: location.id, project_id: project.id, name: location.name }))];
      } catch {
        return [{ project_id: project.id, name: project.location || project.name }];
      }
    }))).flat();
    setSites(nextSites);
  }, [currentProject, currentUser.assigned_projects, currentUser.role]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void reload().catch(loadError => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load Vehicle Hire records.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  const nowLocal = getVehicleHireLocalDateTime();
  const returnByHire = useMemo(() => new Map(returns.map(record => [record.hire_id, record])), [returns]);
  const statusForHire = (hire: VehicleHireContractRecord): VehicleHireDisplayStatus => getVehicleHireDisplayStatus(hire, returnByHire.has(hire.id), nowLocal);
  function hireAssetId(hire: VehicleHireContractRecord) {
    return hire.asset_id || assets.find(asset => Boolean(hire.registration_number
      && asset.registration_number?.toLocaleLowerCase() === hire.registration_number.toLocaleLowerCase()))?.id;
  }
  function vehicleKeyForHire(hire: VehicleHireContractRecord) {
    return hireAssetId(hire) ? `asset:${hireAssetId(hire)}` : `contract:${hireVehicleKey(hire)}`;
  }
  const filteredHires = useMemo(() => hires.filter(hire => {
    const term = query.trim().toLocaleLowerCase();
    const status = statusForHire(hire);
    return (dealerFilter === 'all' || hire.dealer_id === dealerFilter)
      && (projectFilter === 'all' || hire.project_id === projectFilter)
      && (siteFilter === 'all' || hire.site_name === siteFilter)
      && (vehicleFilter === 'all' || vehicleKeyForHire(hire) === vehicleFilter || hireVehicleKey(hire) === vehicleFilter)
      && (statusFilter === 'all' || status === statusFilter)
      && (!fromDate || hire.start_at.slice(0, 10) >= fromDate)
      && (!toDate || hire.start_at.slice(0, 10) <= toDate)
      && (!term || `${hire.hire_reference} ${hire.vehicle_type} ${hire.registration_number || ''} ${hire.vehicle_description} ${hire.project_name} ${hire.site_name} ${dealerName(hire.dealer_id)}`.toLocaleLowerCase().includes(term));
  }), [hires, dealerFilter, projectFilter, siteFilter, vehicleFilter, statusFilter, fromDate, toDate, query, returns, nowLocal, dealers]);
  const filteredDealers = dealers.filter(dealer => (dealerFilter === 'all' || dealer.id === dealerFilter)
    && (!query.trim() || `${dealer.dealer_id} ${dealer.name} ${dealer.contact_person} ${dealer.phone} ${dealer.email || ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
  const filteredLegacyRentals = legacyRentals.filter(record => {
    const asset = assets.find(item => item.id === record.asset_id);
    const current = getLocalDateString() >= record.in_date
      && (record.date_rule === 'inclusive' ? getLocalDateString() <= record.out_date : getLocalDateString() < record.out_date);
    const term = query.trim().toLocaleLowerCase();
    return (dealerFilter === 'all' || asset?.vendor === dealerName(dealerFilter))
      && (projectFilter === 'all' || record.project_id === projectFilter)
      && (siteFilter === 'all' || record.site_name === siteFilter)
      && (vehicleFilter === 'all' || Boolean(asset && (vehicleFilter === `asset:${asset.id}` || `${asset.vehicle_type}|${asset.registration_number || asset.model}` === vehicleFilter)))
      && (!fromDate || record.out_date >= fromDate) && (!toDate || record.in_date <= toDate)
      && (statusFilter === 'all'
        || (['Active', 'Return Due', 'Overdue'].includes(statusFilter) && current)
        || (statusFilter === 'Returned' && (record.out_date < getLocalDateString()
          || (record.out_date === getLocalDateString() && record.date_rule === 'exclusive'))))
      && (!term || `${asset?.vehicle_type || ''} ${asset?.registration_number || ''} ${asset?.model || ''} ${asset?.vendor || ''} ${record.project_name} ${record.site_name}`.toLocaleLowerCase().includes(term));
  });
  const visiblePayments = useMemo(() => payments.filter(payment =>
    (dealerFilter === 'all' || payment.dealer_id === dealerFilter)
      && (payment.hire_ids.length === 0 ? projectFilter === 'all' && siteFilter === 'all' && vehicleFilter === 'all' && statusFilter === 'all' && !query.trim()
        : payment.hire_ids.some(id => filteredHires.some(hire => hire.id === id)))
      && (!fromDate || payment.payment_date >= fromDate) && (!toDate || payment.payment_date <= toDate)
  ), [payments, dealerFilter, projectFilter, siteFilter, vehicleFilter, statusFilter, query, fromDate, toDate, filteredHires]);
  const visibleFuel = useMemo(() => fuel.filter(entry =>
    (dealerFilter === 'all' || entry.dealer_id === dealerFilter)
      && (projectFilter === 'all' || entry.project_id === projectFilter)
      && (siteFilter === 'all' || entry.site_name === siteFilter)
      && (entry.hire_id ? filteredHires.some(hire => hire.id === entry.hire_id) : vehicleFilter === 'all' && statusFilter === 'all')
      && (!query.trim() || `${entry.supplier} ${entry.notes || ''} ${entry.project_name} ${entry.site_name} ${entry.employee_name}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
        || Boolean(entry.hire_id && filteredHires.some(hire => hire.id === entry.hire_id)))
      && (!fromDate || entry.fuel_date >= fromDate) && (!toDate || entry.fuel_date <= toDate)
  ), [fuel, dealerFilter, projectFilter, siteFilter, vehicleFilter, statusFilter, query, filteredHires, fromDate, toDate]);

  function dealerName(id: string) { return dealers.find(dealer => dealer.id === id)?.name || 'Dealer unavailable'; }
  function projectNameForCsv(id: string) { return projects.find(project => project.id === id)?.name || currentProject.name; }
  function sitesFor(projectId: string) { return sites.filter(site => site.project_id === projectId); }
  const visibleReturns = returns.filter(record => filteredHires.some(hire => hire.id === record.hire_id)
    && (!fromDate || record.actual_return_at.slice(0, 10) >= fromDate) && (!toDate || record.actual_return_at.slice(0, 10) <= toDate));
  const activeHires = filteredHires.filter(hire => ['Active', 'Return Due', 'Overdue'].includes(statusForHire(hire)));
  const overdueHires = filteredHires.filter(hire => statusForHire(hire) === 'Overdue');
  const dueHires = filteredHires.filter(hire => statusForHire(hire) === 'Return Due');
  const upcomingHires = filteredHires.filter(hire => ['Active', 'Return Due'].includes(statusForHire(hire)))
    .sort((a, b) => a.expected_return_at.localeCompare(b.expected_return_at));
  const completedCharges = visibleReturns.reduce((sum, record) => sum + record.final_bill, 0);
  const legacyCurrentRentals = filteredLegacyRentals.filter(record => getLocalDateString() >= record.in_date
    && (record.date_rule === 'inclusive' ? getLocalDateString() <= record.out_date : getLocalDateString() < record.out_date));
  const activeVehicleKeys = new Set([
    ...activeHires.map(hire => assets.find(asset => asset.id === hire.asset_id
      || Boolean(hire.registration_number && asset.registration_number?.toLocaleLowerCase() === hire.registration_number.toLocaleLowerCase()))?.id
      || `${hire.vehicle_type}|${hire.registration_number || hire.vehicle_description}`),
    ...legacyCurrentRentals.map(record => record.asset_id)
  ]);
  const matchesVehicleFilters = (asset: Awaited<ReturnType<typeof dataService.getVehicleAssets>>[number]) =>
    (projectFilter === 'all' || asset.project_id === projectFilter)
      && (dealerFilter === 'all' || asset.vendor.toLocaleLowerCase() === dealerName(dealerFilter).toLocaleLowerCase())
      && (siteFilter === 'all' || asset.site_name === siteFilter)
      && (vehicleFilter === 'all' || vehicleFilter === `asset:${asset.id}` || `${asset.vehicle_type}|${asset.registration_number || asset.model}` === vehicleFilter)
      && (!query.trim() || `${asset.vehicle_type} ${asset.vehicle_equipment_id} ${asset.registration_number || ''} ${asset.model} ${asset.vendor} ${asset.project_name} ${asset.site_name}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
      && (statusFilter === 'all'
        || (statusFilter === 'Maintenance' && asset.condition === 'maintenance')
        || (statusFilter === 'Currently Hired' && (activeVehicleKeys.has(asset.id) || activeVehicleKeys.has(`${asset.vehicle_type}|${asset.registration_number || asset.model}`)))
        || (['Active', 'Return Due', 'Overdue'].includes(statusFilter) && (activeVehicleKeys.has(asset.id) || activeVehicleKeys.has(`${asset.vehicle_type}|${asset.registration_number || asset.model}`)))
        || (statusFilter === 'Available' && asset.condition === 'available' && !activeVehicleKeys.has(asset.id) && !activeVehicleKeys.has(`${asset.vehicle_type}|${asset.registration_number || asset.model}`))
        || (statusFilter === 'Returned' && legacyRentals.some(rental => rental.asset_id === asset.id && rental.out_date < getLocalDateString())));
  const filteredRegisteredVehicles = assets.filter(matchesVehicleFilters);
  const currentlyHiredVehicles = activeVehicleKeys.size;
  const availableVehicles = filteredRegisteredVehicles.filter(asset => asset.condition === 'available'
    && !activeVehicleKeys.has(asset.id)
    && !activeVehicleKeys.has(`${asset.vehicle_type}|${asset.registration_number || asset.model}`)).length;
  const legacyEstimatedCost = filteredLegacyRentals.reduce((sum, record) => {
    const replacedByFinal = hires.some(hire => {
      const sameVehicle = hire.asset_id === record.asset_id
        || Boolean(hire.registration_number && assets.find(asset => asset.id === record.asset_id)?.registration_number?.toLocaleLowerCase() === hire.registration_number.toLocaleLowerCase());
      return sameVehicle && hire.start_at.slice(0, 10) <= record.out_date && record.in_date <= hire.expected_return_at.slice(0, 10);
    });
    return sum + (replacedByFinal ? 0 : record.estimated_hire_cost);
  }, 0);
  const movementCandidates = movements.filter(record =>
    (projectFilter === 'all' || record.project_id === projectFilter)
      && (siteFilter === 'all' || record.site_name === siteFilter)
      && (dealerFilter === 'all' || (() => { const asset = assets.find(item => item.id === record.asset_id); return Boolean(asset && (asset.vendor.toLocaleLowerCase() === dealerName(dealerFilter).toLocaleLowerCase() || hires.some(hire => hire.asset_id === asset.id && hire.dealer_id === dealerFilter))); })())
      && (vehicleFilter === 'all' || vehicleFilter === `asset:${record.asset_id}` || (() => { const asset = assets.find(item => item.id === record.asset_id); return Boolean(asset && `${asset.vehicle_type}|${asset.registration_number || asset.model}` === vehicleFilter); })())
      && (!query.trim() || (() => { const asset = assets.find(item => item.id === record.asset_id); return `${asset?.vehicle_type || ''} ${asset?.registration_number || ''} ${record.operator_name} ${record.project_name} ${record.site_name}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()); })())
  ).map(record => ({ id: record.id, assetId: record.asset_id, workDate: record.work_date, totalWorkingMinutes: record.total_working_minutes, sessions: record.sessions.map(session => ({ startTime: session.start_time, stopTime: session.stop_time })) }));
  const legacyWorkCandidates = legacyVehicleLogs.filter(record => siteFilter === 'all'
    && (projectFilter === 'all' || record.project_id === projectFilter)
    && (dealerFilter === 'all' || record.vendor.toLocaleLowerCase() === dealerName(dealerFilter).toLocaleLowerCase())
    && (vehicleFilter === 'all' || vehicleFilter === `asset:${assets.find(asset => asset.vehicle_equipment_id === record.vehicle_identifier || asset.registration_number === record.vehicle_identifier)?.id}` || `contract:${record.vehicle_type}|${record.vehicle_identifier}` === vehicleFilter || `${record.vehicle_type}|${record.vehicle_identifier}` === vehicleFilter)
    && (!query.trim() || `${record.vehicle_type} ${record.vehicle_identifier} ${record.vendor} ${record.project_name}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  ).map(record => ({ id: record.id, workDate: record.hire_date, totalWorkingMinutes: Math.round(record.working_hours * 60), legacy: true }));
  const totalWorkingHours = sumValidVehicleMovementMinutes([...movementCandidates, ...legacyWorkCandidates], new Set(assets.map(asset => asset.id)), fromDate || undefined, toDate || undefined) / 60;
  const totalHireCost = completedCharges + legacyEstimatedCost;
  const totalPayments = visiblePayments.reduce((sum, record) => sum + signedVehicleDealerPaymentAmount(record), 0);
  const activeFuelEntries = fuel.filter(entry => entry.status !== 'voided');
  const activeVisibleFuel = visibleFuel.filter(entry => entry.status !== 'voided');
  const totalFuel = activeVisibleFuel.reduce((sum, record) => sum + record.total_amount, 0);
  const selectedDealers = dealerFilter === 'all' ? dealers : dealers.filter(dealer => dealer.id === dealerFilter);
  const scopeHireIds = new Set(filteredHires.map(hire => hire.id));
  const outstanding = selectedDealers.reduce((sum, dealer) => {
    const scopedHires = hires.filter(hire => hire.dealer_id === dealer.id && scopeHireIds.has(hire.id));
    const scopedReturns = returns.filter(record => scopedHires.some(hire => hire.id === record.hire_id)
      && (!fromDate || record.actual_return_at.slice(0, 10) >= fromDate)
      && (!toDate || record.actual_return_at.slice(0, 10) <= toDate));
    const scopedPayments = payments.filter(payment => payment.dealer_id === dealer.id
      && (!fromDate || payment.payment_date >= fromDate) && (!toDate || payment.payment_date <= toDate)
      && (payment.hire_ids.length === 0
        ? projectFilter === 'all' && siteFilter === 'all' && vehicleFilter === 'all' && statusFilter === 'all' && !query.trim()
        : payment.hire_ids.some(id => scopeHireIds.has(id))));
    const scopedFuel = visibleFuel.filter(entry => entry.dealer_id === dealer.id && entry.reimbursement_confirmed);
    return sum + calculateDealerOutstanding(dealer.id, scopedHires, scopedReturns, scopedPayments, scopedFuel);
  }, 0);
  const confirmedFuelCost = activeVisibleFuel.reduce((sum, record) => sum + (record.payer === 'dealer_paid' && record.reimbursement_confirmed ? record.total_amount : 0), 0);
  const unreconciledAdvances = fuelAdvances.filter(advance =>
    (projectFilter === 'all' || advance.project_id === projectFilter)
      && (siteFilter === 'all' || advance.site_name === siteFilter)
      && (!fromDate || advance.advance_date >= fromDate) && (!toDate || advance.advance_date <= toDate)
  ).reduce((sum, advance) => sum + Math.max(0, advance.amount - activeFuelEntries.filter(entry => entry.driver_advance_id === advance.id).reduce((subtotal, entry) => subtotal + entry.total_amount, 0)), 0);
  const availableFuelAdvances = fuelAdvances.filter(advance => advance.project_id === fuelDraft.project_id
    && (!fuelDraft.hire_id || !advance.hire_id || advance.hire_id === fuelDraft.hire_id)
    && advance.amount - activeFuelEntries.filter(entry => entry.driver_advance_id === advance.id && entry.id !== fuelDraft.id).reduce((sum, entry) => sum + entry.total_amount, 0) > 0.005);
  const advanceBalance = (advance: VehicleDriverFuelAdvanceRecord, omitEntryId?: string) => round(advance.amount - activeFuelEntries.filter(entry => entry.driver_advance_id === advance.id && entry.id !== omitEntryId).reduce((sum, entry) => sum + entry.total_amount, 0));
  const fuelAmountPreview = useMemo(() => {
    try { return calculateVehicleFuelAmount(Number(fuelDraft.quantity_litres), Number(fuelDraft.price_per_litre)); }
    catch { return null; }
  }, [fuelDraft.quantity_litres, fuelDraft.price_per_litre]);
  const stats = [
    { label: 'Active Hires', value: activeHires.length, detail: 'Open hire contracts', icon: Truck },
    { label: 'Returns Due', value: dueHires.length, detail: 'Due within 24 hours', icon: CalendarClock },
    { label: 'Overdue', value: overdueHires.length, detail: 'Past expected return', icon: AlertTriangle },
    { label: 'Total Registered Vehicles', value: filteredRegisteredVehicles.length, detail: 'Saved fleet records', icon: Truck },
    { label: 'Currently Hired Vehicles', value: currentlyHiredVehicles, detail: 'Distinct active vehicles', icon: Clock3 },
    { label: 'Available Vehicles', value: availableVehicles, detail: 'Registered and available', icon: CheckCircle2 },
    { label: 'Total Hire Cost', value: money(totalHireCost), detail: 'Final bills + legacy estimates', icon: CircleDollarSign },
    { label: 'Total Working Hours', value: totalWorkingHours.toFixed(2), detail: 'Validated movement records', icon: Clock3 },
    { label: 'Payments Recorded', value: money(totalPayments), detail: 'Dealer payments in range', icon: CheckCircle2 },
    { label: 'Fuel Expenses', value: money(totalFuel), detail: 'Actual purchase amounts', icon: Fuel },
    { label: 'Driver Advances Pending Reconciliation', value: money(unreconciledAdvances), detail: 'Advance less linked fuel', icon: Users },
    { label: 'Dealer Outstanding', value: money(outstanding), detail: 'Net payable in selected scope', icon: Users }
  ];
  const vehicleOptions = [...new Map([
    ...assets.map(asset => [`asset:${asset.id}`, `${asset.vehicle_type} · ${asset.registration_number || asset.vehicle_equipment_id}`] as const),
    ...hires.map(hire => [vehicleKeyForHire(hire), `${hire.vehicle_type}${hire.registration_number ? ` · ${hire.registration_number}` : ` · ${hire.vehicle_description}`}`] as const)
  ]).entries()];

  function showDialogError(message: unknown) { setDialogError(message instanceof Error ? message.message : 'Unable to save this Vehicle Hire record.'); }
  async function saveAction(event: FormEvent, action: () => Promise<void>, close: () => void) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setDialogError(null);
    setNotice(null);
    try {
      await action();
      await reload();
      close();
      setNotice('Vehicle Hire record saved.');
    } catch (saveError) {
      showDialogError(saveError);
    } finally {
      setSaving(false);
    }
  }

  const saveDealer = (event: FormEvent) => saveAction(event, async () => {
    await dataService.saveVehicleDealer({ ...dealerDraft, status: dealerDraft.status || 'active' });
  }, () => setDealerDialog(false));

  const openDealer = (dealer?: VehicleDealerRecord) => {
    setDialogError(null);
    const draft = dealer ? { ...dealer } : freshDealer();
    setDealerDraft(draft);
    setFormBaseline('dealer', draft);
    setDealerDialog(true);
  };
  const openHire = (hire?: VehicleHireContractRecord) => {
    setDialogError(null);
    const draft = freshHire(projects.find(project => project.id === hire?.project_id) || currentProject);
    const next = hire ? {
      ...draft, id: hire.id, dealer_id: hire.dealer_id, project_id: hire.project_id, site_id: hire.site_id,
      site_name: hire.site_name, asset_id: hire.asset_id, vehicle_type: hire.vehicle_type,
      registration_number: hire.registration_number || '', vehicle_description: hire.vehicle_description,
      driver_name: hire.driver_name || '', driver_phone: hire.driver_phone || '', start_at: hire.start_at,
      expected_return_at: hire.expected_return_at, billing_method: hire.billing_method,
      agreed_rate: String(hire.agreed_rate), initial_meter_reading: hire.initial_meter_reading === undefined ? '' : String(hire.initial_meter_reading),
      initial_engine_hours: hire.initial_engine_hours === undefined ? '' : String(hire.initial_engine_hours),
      advance_amount: String(hire.advance_amount), remarks: hire.remarks || '', attachments: hire.attachments || emptyTransactionAttachments()
    } : draft;
    setHireDraft(next);
    setFormBaseline('hire', next);
    setHireDialog(true);
  };
  const saveHire = (event: FormEvent) => saveAction(event, async () => {
    await dataService.saveVehicleHireContract({
      id: hireDraft.id, dealer_id: hireDraft.dealer_id, project_id: hireDraft.project_id,
      site_id: hireDraft.site_id, site_name: hireDraft.site_name, asset_id: hireDraft.asset_id || undefined,
      vehicle_type: hireDraft.vehicle_type, registration_number: hireDraft.registration_number,
      vehicle_description: hireDraft.vehicle_description, driver_name: hireDraft.driver_name,
      driver_phone: hireDraft.driver_phone, start_at: hireDraft.start_at,
      expected_return_at: hireDraft.expected_return_at, billing_method: hireDraft.billing_method,
      agreed_rate: Number(hireDraft.agreed_rate), initial_meter_reading: hireDraft.initial_meter_reading === '' ? undefined : Number(hireDraft.initial_meter_reading),
      initial_engine_hours: hireDraft.initial_engine_hours === '' ? undefined : Number(hireDraft.initial_engine_hours),
      advance_amount: Number(hireDraft.advance_amount || 0), advance_payment_method: hireDraft.advance_payment_method,
      advance_transaction_reference: hireDraft.advance_transaction_reference, remarks: hireDraft.remarks,
      attachments: hireDraft.attachments
    });
  }, () => setHireDialog(false));

  const openReturn = (hire: VehicleHireContractRecord) => {
    const existing = returnByHire.get(hire.id);
    setDialogError(null);
    const draft = existing ? {
      ...freshReturn(hire.id), actual_return_at: existing.actual_return_at,
      final_meter_reading: existing.final_meter_reading === undefined ? '' : String(existing.final_meter_reading),
      final_engine_hours: existing.final_engine_hours === undefined ? '' : String(existing.final_engine_hours),
      billable_usage: String(existing.billable_usage), return_condition: existing.return_condition,
      additional_charges: String(existing.additional_charges), discount: String(existing.discount),
      remarks: existing.remarks || '', attachments: existing.attachments || emptyTransactionAttachments()
    } : freshReturn(hire.id);
    setReturnDraft(draft);
    setFormBaseline('return', draft);
    setReturnDialog(true);
  };
  const selectedReturnHire = hires.find(hire => hire.id === returnDraft.hire_id);
  const returnBillPreview = useMemo(() => {
    if (!selectedReturnHire) return null;
    try {
      return calculateFinalVehicleHireBill({
        billingMethod: selectedReturnHire.billing_method, agreedRate: selectedReturnHire.agreed_rate,
        billableUsage: Number(returnDraft.billable_usage), additionalCharges: Number(returnDraft.additional_charges || 0),
        discount: Number(returnDraft.discount || 0)
      });
    } catch { return null; }
  }, [selectedReturnHire, returnDraft.billable_usage, returnDraft.additional_charges, returnDraft.discount]);
  const saveReturn = (event: FormEvent) => saveAction(event, async () => {
    const existing = returnByHire.get(returnDraft.hire_id);
    await dataService.finalizeVehicleHireReturn({
      id: existing?.id, hire_id: returnDraft.hire_id, actual_return_at: returnDraft.actual_return_at,
      final_meter_reading: returnDraft.final_meter_reading === '' ? undefined : Number(returnDraft.final_meter_reading),
      final_engine_hours: returnDraft.final_engine_hours === '' ? undefined : Number(returnDraft.final_engine_hours),
      billable_usage: Number(returnDraft.billable_usage || 0), return_condition: returnDraft.return_condition,
      additional_charges: Number(returnDraft.additional_charges || 0), discount: Number(returnDraft.discount || 0),
      correction_reason: returnDraft.correction_reason, remarks: returnDraft.remarks, attachments: returnDraft.attachments
    });
  }, () => setReturnDialog(false));

  const savePayment = (event: FormEvent) => saveAction(event, async () => {
    await dataService.recordVehicleDealerPayment({
      id: paymentDraft.id,
      dealer_id: paymentDraft.dealer_id, hire_ids: paymentDraft.hire_id ? [paymentDraft.hire_id] : [],
      payment_date: paymentDraft.payment_date, amount: Number(paymentDraft.amount),
      payment_type: paymentDraft.payment_type, method: paymentDraft.method,
      transaction_reference: paymentDraft.transaction_reference, receipt: paymentDraft.receipt,
      remarks: paymentDraft.remarks, idempotency_key: paymentDraft.idempotency_key,
      correction_reason: paymentDraft.correction_reason
    });
  }, () => setPaymentDialog(false));

  const openPayment = (dealerOrRecord: string | VehicleDealerPaymentRecord = '') => {
    const draft = typeof dealerOrRecord === 'string'
      ? { ...freshPayment(), dealer_id: dealerOrRecord }
      : {
        ...freshPayment(), id: dealerOrRecord.id, dealer_id: dealerOrRecord.dealer_id,
        hire_id: dealerOrRecord.hire_ids[0] || '', payment_date: dealerOrRecord.payment_date,
        amount: String(dealerOrRecord.amount), payment_type: dealerOrRecord.payment_type,
        method: dealerOrRecord.method, transaction_reference: dealerOrRecord.transaction_reference || '',
        remarks: dealerOrRecord.remarks || '', receipt: dealerOrRecord.receipt || emptyTransactionAttachments(),
        idempotency_key: dealerOrRecord.idempotency_key
      };
    setPaymentDraft(draft);
    setFormBaseline('payment', draft);
    setDialogError(null);
    setPaymentDialog(true);
  };
  const reversePayment = async (payment: VehicleDealerPaymentRecord) => {
    if (!canConfirmFuelReimbursement(currentUser.role) || payment.payment_type === 'reversal') return;
    if (!window.confirm(`Reverse payment ${payment.transaction_reference || payment.id} for ${money(payment.amount)}? The original payment will remain in the audit history.`)) return;
    const reason = window.prompt('Enter the reason for reversing this payment:')?.trim();
    if (!reason) return;
    try {
      await dataService.reverseVehicleDealerPayment(payment.id, reason);
      await reload();
      setNotice('Payment reversal recorded. The original payment was retained.');
    } catch (reverseError) {
      setError(reverseError instanceof Error ? reverseError.message : 'Unable to reverse this payment.');
    }
  };
  const openFuel = (entry?: VehicleFuelEntryRecord) => {
    const draft = entry ? {
      ...freshFuel(projects.find(project => project.id === entry.project_id) || currentProject),
      id: entry.id, hire_id: entry.hire_id || '', project_id: entry.project_id,
      site_id: entry.site_id, site_name: entry.site_name, asset_id: entry.asset_id || '',
      dealer_id: entry.dealer_id || '', driver_advance_id: entry.driver_advance_id || '',
      fuel_date: entry.fuel_date, fuel_type: entry.fuel_type, quantity_litres: String(entry.quantity_litres),
      price_per_litre: String(entry.price_per_litre), meter_reading: entry.meter_reading === undefined ? '' : String(entry.meter_reading),
      supplier: entry.supplier, payer: entry.payer, driver_advance_amount: String(entry.driver_advance_amount),
      confirm_dealer_reimbursement: entry.reimbursement_confirmed, notes: entry.notes || '',
      receipt: entry.receipt || emptyTransactionAttachments(), idempotency_key: entry.idempotency_key,
      correction_reason: ''
    } : freshFuel(currentProject);
    setFuelDraft(draft);
    setFormBaseline('fuel', draft);
    setDialogError(null);
    setFuelDialog(true);
  };
  const openAdvance = () => {
    const draft = freshAdvance(currentProject);
    setAdvanceDraft(draft);
    setFormBaseline('advance', draft);
    setDialogError(null);
    setAdvanceDialog(true);
  };
  const openVehicleType = () => {
    setVehicleTypeDraft('');
    setFormBaseline('vehicleType', '');
    setDialogError(null);
    setVehicleTypeDialog(true);
  };

  const saveFuel = (event: FormEvent) => saveAction(event, async () => {
    const originalFuel = fuelDraft.id ? fuel.find(entry => entry.id === fuelDraft.id) : undefined;
    if (fuelDraft.payer === 'dealer_paid' && fuelDraft.confirm_dealer_reimbursement && !originalFuel?.reimbursement_confirmed) {
      if (!canConfirmFuelReimbursement(currentUser.role)) throw new Error('Only a Company Administrator or Project Manager can confirm dealer fuel reimbursement.');
      if (!window.confirm('Apply this dealer-paid fuel expense to the dealer payable? This will increase the amount due in settlement.')) {
        throw new Error('Fuel was not saved because settlement reimbursement was not confirmed.');
      }
    }
    const relatedHire = hires.find(hire => hire.id === fuelDraft.hire_id);
    await dataService.recordVehicleFuelEntry({
      id: fuelDraft.id,
      hire_id: fuelDraft.hire_id || undefined, asset_id: fuelDraft.asset_id || relatedHire?.asset_id,
      dealer_id: fuelDraft.dealer_id || relatedHire?.dealer_id, project_id: fuelDraft.project_id,
      site_id: fuelDraft.site_id, site_name: fuelDraft.site_name, fuel_date: fuelDraft.fuel_date,
      fuel_type: fuelDraft.fuel_type, quantity_litres: Number(fuelDraft.quantity_litres),
      price_per_litre: Number(fuelDraft.price_per_litre), meter_reading: fuelDraft.meter_reading === '' ? undefined : Number(fuelDraft.meter_reading),
      supplier: fuelDraft.supplier, payer: fuelDraft.payer,
      driver_advance_id: fuelDraft.payer === 'driver_advance' ? fuelDraft.driver_advance_id || undefined : undefined,
      driver_advance_amount: 0,
      idempotency_key: fuelDraft.idempotency_key,
      reimbursement_confirmed: false, confirm_dealer_reimbursement: fuelDraft.confirm_dealer_reimbursement,
      receipt: fuelDraft.receipt, employee_id: currentUser.employee_id || currentUser.user_id || currentUser.id,
      employee_name: currentUser.full_name, notes: fuelDraft.notes,
      correction_reason: fuelDraft.correction_reason
    });
  }, () => setFuelDialog(false));

  const saveFuelAdvance = (event: FormEvent) => saveAction(event, async () => {
    const linkedHire = hires.find(hire => hire.id === advanceDraft.hire_id);
    await dataService.recordVehicleDriverFuelAdvance({
      hire_id: advanceDraft.hire_id || undefined,
      asset_id: linkedHire?.asset_id,
      project_id: advanceDraft.project_id,
      site_id: advanceDraft.site_id,
      site_name: advanceDraft.site_name,
      driver_name: advanceDraft.driver_name,
      advance_date: advanceDraft.advance_date,
      amount: Number(advanceDraft.amount),
      method: advanceDraft.method,
      transaction_reference: advanceDraft.transaction_reference,
      idempotency_key: advanceDraft.idempotency_key,
      employee_id: currentUser.employee_id || currentUser.user_id || currentUser.id,
      employee_name: currentUser.full_name
    });
  }, () => setAdvanceDialog(false));

  const confirmFuelReimbursement = async (entry: VehicleFuelEntryRecord) => {
    if (!canConfirmFuelReimbursement(currentUser.role)) return;
    if (!window.confirm(`Confirm ${money(entry.total_amount)} dealer fuel reimbursement? This will add the amount to the dealer payable.`)) return;
    const reason = window.prompt('Enter the authorization reason for applying this fuel cost:')?.trim();
    if (!reason) return;
    try {
      await dataService.confirmVehicleFuelReimbursement(entry.id, reason);
      await reload();
      setNotice('Dealer fuel reimbursement confirmed and included in the payable.');
    } catch (confirmationError) {
      setError(confirmationError instanceof Error ? confirmationError.message : 'Unable to confirm this reimbursement.');
    }
  };

  const hireHasDependencies = (hire: VehicleHireContractRecord) => returnByHire.has(hire.id)
    || payments.some(payment => payment.hire_ids.includes(hire.id))
    || fuel.some(entry => entry.hire_id === hire.id)
    || fuelAdvances.some(advance => advance.hire_id === hire.id);
  const deleteHire = async (hire: VehicleHireContractRecord) => {
    if (!window.confirm(`Delete hire ${hire.hire_reference} (${hire.vehicle_type}, ${dealerName(hire.dealer_id)})?`)) return;
    try {
      await dataService.deleteVehicleHireContractIfUnused(hire.id);
      await reload();
      setNotice(`Hire ${hire.hire_reference} deleted.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this hire.');
    }
  };

  const voidFuelEntry = async (entry: VehicleFuelEntryRecord) => {
    if (!canConfirmFuelReimbursement(currentUser.role)) return;
    if (!window.confirm(`Void fuel entry for ${money(entry.total_amount)} from ${entry.supplier}? The record will remain in the audit history.`)) return;
    const reason = window.prompt('Enter the reason for voiding this fuel entry:')?.trim();
    if (!reason) return;
    try {
      await dataService.voidVehicleFuelEntry(entry.id, reason);
      await reload();
      setNotice('Fuel entry was voided and retained in the audit history.');
    } catch (voidError) {
      setError(voidError instanceof Error ? voidError.message : 'Unable to void this fuel entry.');
    }
  };
  const fuelCanEdit = (entry: VehicleFuelEntryRecord) => entry.status !== 'voided'
    && manager
    && (!(entry.driver_advance_id || (entry.payer === 'dealer_paid' && entry.reimbursement_confirmed))
      || canConfirmFuelReimbursement(currentUser.role));
  const fuelCanVoid = (entry: VehicleFuelEntryRecord) => entry.status !== 'voided'
    && canConfirmFuelReimbursement(currentUser.role)
    && entry.payer === 'company_direct'
    && !entry.driver_advance_id
    && !entry.reimbursement_confirmed;

  const saveVehicleType = (event: FormEvent) => saveAction(event, async () => {
    const added = await dataService.addVehicleType(vehicleTypeDraft);
    setVehicleTypes(current => current.some(type => type.toLocaleLowerCase() === added.toLocaleLowerCase()) ? current : [...current, added]);
    setHireDraft(current => ({ ...current, vehicle_type: added }));
  }, () => { setVehicleTypeDialog(false); setVehicleTypeDraft(''); });

  const exportHires = () => downloadCsv([
    ['Hire Reference', 'Status', 'Dealer', 'Project', 'Site', 'Vehicle Type', 'Registration', 'Driver', 'Start', 'Expected Return', 'Billing Method', 'Rate', 'Final Bill', 'Payments', 'Outstanding'],
    ...filteredHires.map(hire => {
      const finalBill = returnByHire.get(hire.id)?.final_bill || 0;
      const paid = payments.filter(payment => payment.hire_ids.includes(hire.id)).reduce((sum, payment) => sum + signedVehicleDealerPaymentAmount(payment), 0);
      return [hire.hire_reference, statusForHire(hire), dealerName(hire.dealer_id), hire.project_name, hire.site_name, hire.vehicle_type, hire.registration_number, hire.driver_name, hire.start_at, hire.expected_return_at, hire.billing_method, hire.agreed_rate, finalBill, paid, round(finalBill - paid)];
    })
  ], 'vehicle-hire-report.csv');
  const exportProjectCosts = () => {
    const projectIds = [...new Set([...filteredHires.map(hire => hire.project_id), ...filteredLegacyRentals.map(record => record.project_id), ...visibleFuel.map(entry => entry.project_id)])];
    downloadCsv([
      ['Project', 'Site(s)', 'Vehicles / Hires', 'Confirmed Hire Charges (INR)', 'Payments (INR)', 'Fuel Expenses (INR)', 'Confirmed Fuel Reimbursements (INR)', 'Net Payable (INR)', 'Total Project Cost (INR)'],
      ...projectIds.map(projectId => {
        const projectHires = filteredHires.filter(hire => hire.project_id === projectId);
        const projectHireIds = new Set(projectHires.map(hire => hire.id));
        const projectReturns = visibleReturns.filter(record => projectHireIds.has(record.hire_id));
        const projectPayments = visiblePayments.filter(payment => payment.hire_ids.some(id => projectHireIds.has(id)));
        const projectFuel = visibleFuel.filter(entry => entry.project_id === projectId);
        const projectLegacyCost = filteredLegacyRentals.filter(record => record.project_id === projectId && !projectHires.some(hire =>
          (hire.asset_id === record.asset_id || Boolean(hire.registration_number && assets.find(asset => asset.id === record.asset_id)?.registration_number?.toLocaleLowerCase() === hire.registration_number.toLocaleLowerCase()))
            && hire.start_at.slice(0, 10) <= record.out_date && record.in_date <= hire.expected_return_at.slice(0, 10)
        )).reduce((sum, record) => sum + record.estimated_hire_cost, 0);
        const charges = projectReturns.reduce((sum, record) => sum + record.final_bill, projectLegacyCost);
        const paid = projectPayments.reduce((sum, record) => sum + signedVehicleDealerPaymentAmount(record), 0);
        const fuelCost = projectFuel.reduce((sum, record) => sum + record.total_amount, 0);
        const reimbursement = projectFuel.filter(record => record.payer === 'dealer_paid' && record.reimbursement_confirmed).reduce((sum, record) => sum + record.total_amount, 0);
        const legacyHireCount = filteredLegacyRentals.filter(record => record.project_id === projectId).length;
        return [projectNameForCsv(projectId), [...new Set([...projectHires.map(hire => hire.site_name), ...filteredLegacyRentals.filter(record => record.project_id === projectId).map(record => record.site_name), ...projectFuel.map(entry => entry.site_name)])].join('; '), projectHires.length + legacyHireCount, charges.toFixed(2), paid.toFixed(2), fuelCost.toFixed(2), reimbursement.toFixed(2), round(charges + reimbursement - paid).toFixed(2), round(charges + fuelCost).toFixed(2)];
      })
    ], 'vehicle-hire-project-costs.csv');
  };
  const exportVehicleCosts = () => {
    type VehicleGroup = { key: string; type: string; identifier: string; assetIds: Set<string>; hires: VehicleHireContractRecord[]; legacyRentals: VehicleRentalRecord[]; legacyLogs: VehicleHireRecord[] };
    const groups = new Map<string, VehicleGroup>();
    const ensureGroup = (key: string, type: string, identifier: string, assetId?: string) => {
      let group = groups.get(key);
      if (!group) {
        group = { key, type, identifier, assetIds: new Set<string>(), hires: [], legacyRentals: [], legacyLogs: [] };
        groups.set(key, group);
      }
      if (assetId) group.assetIds.add(assetId);
      return group;
    };
    const assetForHire = (hire: VehicleHireContractRecord) => assets.find(asset => asset.id === hire.asset_id
      || Boolean(hire.registration_number && asset.registration_number?.toLocaleLowerCase() === hire.registration_number.toLocaleLowerCase()));
    for (const asset of assets) {
      if (projectFilter !== 'all' && asset.project_id !== projectFilter) continue;
      if (vehicleFilter !== 'all' && vehicleFilter !== `asset:${asset.id}` && !filteredHires.some(hire => assetForHire(hire)?.id === asset.id)) continue;
      ensureGroup(`asset:${asset.id}`, asset.vehicle_type, asset.registration_number || asset.vehicle_equipment_id, asset.id);
    }
    for (const rental of filteredLegacyRentals) {
      const asset = assets.find(item => item.id === rental.asset_id);
      const group = asset
        ? ensureGroup(`asset:${asset.id}`, asset.vehicle_type, asset.registration_number || asset.vehicle_equipment_id, asset.id)
        : ensureGroup(`legacy-rental:${rental.asset_id}`, 'Legacy vehicle', rental.asset_id);
      group.legacyRentals.push(rental);
    }
    for (const hire of filteredHires) {
      const asset = assetForHire(hire);
      const group = asset
        ? ensureGroup(`asset:${asset.id}`, asset.vehicle_type, asset.registration_number || asset.vehicle_equipment_id, asset.id)
        : ensureGroup(`contract:${hireVehicleKey(hire)}`, hire.vehicle_type, hire.registration_number || hire.vehicle_description);
      group.hires.push(hire);
    }
    for (const log of legacyVehicleLogs) {
      if ((projectFilter !== 'all' && log.project_id !== projectFilter)
        || siteFilter !== 'all'
        || (fromDate && log.hire_date < fromDate) || (toDate && log.hire_date > toDate)) continue;
      const asset = assets.find(item => item.vehicle_equipment_id === log.vehicle_identifier || item.registration_number === log.vehicle_identifier);
      if (vehicleFilter !== 'all' && vehicleFilter !== `asset:${asset?.id}`
        && vehicleFilter !== `contract:${log.vehicle_type}|${log.vehicle_identifier}`
        && vehicleFilter !== `${log.vehicle_type}|${log.vehicle_identifier}`) continue;
      const group = asset
        ? ensureGroup(`asset:${asset.id}`, asset.vehicle_type, asset.registration_number || asset.vehicle_equipment_id, asset.id)
        : ensureGroup(`legacy:${log.vehicle_identifier}|${log.vendor}`, log.vehicle_type, log.vehicle_identifier);
      group.legacyLogs.push(log);
    }
    const registeredIds = new Set(assets.map(asset => asset.id));
    downloadCsv([
      ['Vehicle Type', 'Registration / Vehicle ID', 'Hire Records', 'Rental Period Days', 'Working Hours', 'Idle Hours', 'Hire Charges (INR)', 'Payments (INR)', 'Fuel Expenses (INR)'],
      ...[...groups.values()].map(group => {
        const related = group.hires;
        const ids = new Set(related.map(hire => hire.id));
        const bills = visibleReturns.filter(record => ids.has(record.hire_id));
        const paid = visiblePayments.filter(payment => payment.hire_ids.some(id => ids.has(id))).reduce((sum, record) => sum + signedVehicleDealerPaymentAmount(record), 0);
        const fuelCost = visibleFuel.filter(entry => ids.has(entry.hire_id || '') || Boolean(entry.asset_id && group.assetIds.has(entry.asset_id))).reduce((sum, entry) => sum + entry.total_amount, 0);
        const legacyNotReplaced = group.legacyRentals.filter(record => !related.some(hire =>
          (hire.asset_id === record.asset_id || Boolean(hire.registration_number && assets.find(asset => asset.id === record.asset_id)?.registration_number?.toLocaleLowerCase() === hire.registration_number.toLocaleLowerCase()))
            && hire.start_at.slice(0, 10) <= record.out_date && record.in_date <= hire.expected_return_at.slice(0, 10)));
        const groupLegacyCost = legacyNotReplaced.reduce((sum, record) => sum + record.estimated_hire_cost, 0);
        const groupMovements = movements.filter(record => group.assetIds.has(record.asset_id)
          && isDateInsideRange(record.work_date, fromDate || undefined, toDate || undefined)
          && (projectFilter === 'all' || record.project_id === projectFilter)
          && (siteFilter === 'all' || record.site_name === siteFilter));
        const validMovements = groupMovements.filter(record => {
          if (!registeredIds.has(record.asset_id) || !Number.isInteger(record.total_working_minutes) || record.total_working_minutes < 0 || !Number.isInteger(record.idle_minutes) || record.idle_minutes < 0) return false;
          try { return calculateWorkingSessions(record.sessions.map(session => ({ startTime: session.start_time, stopTime: session.stop_time })).filter(session => session.startTime || session.stopTime).map(session => ({ startTime: session.startTime, stopTime: session.stopTime }))).reduce((sum, session) => sum + session.durationMinutes, 0) === record.total_working_minutes; }
          catch { return false; }
        });
        const movementCandidates = validMovements.map(record => ({
          id: record.id, assetId: record.asset_id, workDate: record.work_date,
          totalWorkingMinutes: record.total_working_minutes,
          sessions: record.sessions.map(session => ({ startTime: session.start_time, stopTime: session.stop_time }))
        }));
        const legacyCandidates = group.legacyLogs.map(record => ({ id: record.id, workDate: record.hire_date, totalWorkingMinutes: Math.round(record.working_hours * 60), legacy: true }));
        const minutes = sumValidVehicleMovementMinutes([...movementCandidates, ...legacyCandidates], registeredIds, fromDate || undefined, toDate || undefined);
        const seenIdle = new Set<string>();
        const movementIdle = validMovements.reduce((sum, record) => {
          if (seenIdle.has(record.id)) return sum;
          seenIdle.add(record.id);
          return sum + record.idle_minutes;
        }, 0);
        const seenLegacyIdle = new Set<string>();
        const legacyIdle = group.legacyLogs.filter(record => {
          if (seenLegacyIdle.has(record.id)) return false;
          seenLegacyIdle.add(record.id);
          return isValidVehicleHireDate(record.hire_date)
          && isDateInsideRange(record.hire_date, fromDate || undefined, toDate || undefined)
          && Number.isFinite(record.working_hours) && record.working_hours >= 0
          && Number.isFinite(record.idle_minutes) && record.idle_minutes >= 0;
        })
          .reduce((sum, record) => sum + record.idle_minutes, 0);
        const actualDays = bills.reduce((sum, record) => {
          const hire = related.find(item => item.id === record.hire_id);
          if (!hire) return sum;
          const elapsed = new Date(record.actual_return_at).getTime() - new Date(hire.start_at).getTime();
          return sum + (Number.isFinite(elapsed) && elapsed > 0 ? elapsed / (24 * 60 * 60 * 1000) : 0);
        }, 0);
        const recordedDays = actualDays + legacyNotReplaced.reduce((sum, rental) => sum + rental.total_days, 0);
        return [group.type, group.identifier, related.length + legacyNotReplaced.length + group.legacyLogs.length, recordedDays.toFixed(2), (minutes / 60).toFixed(2), ((movementIdle + legacyIdle) / 60).toFixed(2), (bills.reduce((sum, record) => sum + record.final_bill, 0) + groupLegacyCost).toFixed(2), paid.toFixed(2), fuelCost.toFixed(2)];
      })
    ], 'vehicle-hire-vehicle-costs.csv');
  };
  const exportPayments = () => downloadCsv([
    ['Payment Date', 'Dealer', 'Hire References', 'Type', 'Amount (INR)', 'Method', 'Transaction Reference', 'Recorded By'],
    ...visiblePayments.map(payment => [payment.payment_date, dealerName(payment.dealer_id), payment.hire_ids.map(id => hires.find(hire => hire.id === id)?.hire_reference || id).join('; '), payment.payment_type, signedVehicleDealerPaymentAmount(payment).toFixed(2), payment.method, payment.transaction_reference, payment.created_by_name])
  ], 'vehicle-hire-payments.csv');
  const exportFuel = () => downloadCsv([
    ['Date', 'Hire Reference', 'Vehicle', 'Dealer', 'Project', 'Site', 'Fuel Type', 'Litres', 'Price / Litre', 'Fuel Cost', 'Payer', 'Driver Advance Reference', 'Driver Advance Amount', 'Unspent Advance Balance', 'Reimbursement Confirmed', 'Supplier', 'Recorded By'],
    ...visibleFuel.map(entry => [entry.fuel_date, hires.find(hire => hire.id === entry.hire_id)?.hire_reference, hires.find(hire => hire.id === entry.hire_id)?.vehicle_type, dealerName(entry.dealer_id || ''), entry.project_name, entry.site_name, entry.fuel_type, entry.quantity_litres, entry.price_per_litre, entry.total_amount, entry.payer, fuelAdvances.find(advance => advance.id === entry.driver_advance_id)?.transaction_reference, fuelAdvances.find(advance => advance.id === entry.driver_advance_id)?.amount, fuelAdvances.find(advance => advance.id === entry.driver_advance_id) ? advanceBalance(fuelAdvances.find(advance => advance.id === entry.driver_advance_id)!) : '', entry.reimbursement_confirmed ? 'Yes' : 'No', entry.supplier, entry.employee_name])
  ], 'vehicle-hire-fuel.csv');
  const exportDriverAdvances = () => downloadCsv([
    ['Advance Date', 'Driver', 'Hire Reference', 'Project', 'Site', 'Advance Amount (INR)', 'Fuel Reconciled (INR)', 'Remaining (INR)', 'Method', 'Reference', 'Recorded By'],
    ...fuelAdvances.filter(advance => (projectFilter === 'all' || advance.project_id === projectFilter)
      && (siteFilter === 'all' || advance.site_name === siteFilter)
      && (!fromDate || advance.advance_date >= fromDate) && (!toDate || advance.advance_date <= toDate)
    ).map(advance => {
      const reconciled = advance.amount - advanceBalance(advance);
      return [advance.advance_date, advance.driver_name, hires.find(hire => hire.id === advance.hire_id)?.hire_reference, advance.project_name, advance.site_name, advance.amount.toFixed(2), reconciled.toFixed(2), advanceBalance(advance).toFixed(2), advance.method, advance.transaction_reference, advance.employee_name];
    })
  ], 'vehicle-driver-fuel-advances.csv');
  const exportDealerBalances = () => downloadCsv([
    ['Dealer ID', 'Dealer', 'Status', 'Active Hires', 'Returned Hires', 'Hire Charges', 'Payments', 'Confirmed Fuel Reimbursement', 'Outstanding'],
    ...dealers.filter(dealer => dealerFilter === 'all' || dealer.id === dealerFilter).map(dealer => {
      const dealerHires = filteredHires.filter(hire => hire.dealer_id === dealer.id);
      const ids = new Set(dealerHires.map(hire => hire.id));
      const dealerReturns = visibleReturns.filter(record => ids.has(record.hire_id));
      const dealerPayments = visiblePayments.filter(payment => payment.dealer_id === dealer.id && (payment.hire_ids.length === 0 || payment.hire_ids.some(id => ids.has(id))));
      const dealerFuel = visibleFuel.filter(entry => entry.dealer_id === dealer.id);
      const reimbursements = dealerFuel.filter(entry => entry.reimbursement_confirmed).reduce((sum, entry) => sum + entry.total_amount, 0);
      return [dealer.dealer_id, dealer.name, dealer.status, dealerHires.filter(hire => ['Active', 'Return Due', 'Overdue'].includes(statusForHire(hire))).length, dealerReturns.length, dealerReturns.reduce((sum, row) => sum + row.final_bill, 0).toFixed(2), dealerPayments.reduce((sum, row) => sum + signedVehicleDealerPaymentAmount(row), 0).toFixed(2), reimbursements.toFixed(2), calculateDealerOutstanding(dealer.id, dealerHires, dealerReturns, dealerPayments, dealerFuel).toFixed(2)];
    })
  ], 'vehicle-hire-dealer-balances.csv');
  const exportReturns = () => downloadCsv([
    ['Hire Reference', 'Actual Return', 'Dealer', 'Project', 'Vehicle', 'Billable Usage', 'Condition', 'Additional Charges', 'Discount', 'Final Bill', 'Finalized By'],
    ...visibleReturns.map(record => {
      const hire = hires.find(item => item.id === record.hire_id);
      return [hire?.hire_reference, record.actual_return_at, dealerName(hire?.dealer_id || ''), hire?.project_name, `${hire?.vehicle_type || ''} ${hire?.registration_number || ''}`, record.billable_usage, record.return_condition, record.additional_charges, record.discount, record.final_bill, record.finalized_by_name];
    })
  ], 'vehicle-hire-returns.csv');

  const tabs: Array<[ViewTab, string]> = [
    ['overview', 'Overview'], ['dealers', `Dealers (${filteredDealers.length})`], ['hires', `Hires (${filteredHires.length})`],
    ['returns', `Returns (${visibleReturns.length})`], ['payments', `Payments (${visiblePayments.length})`],
    ['fuel', `Fuel (${visibleFuel.length})`], ['reports', 'Reports']
  ];

  return <div className="space-y-4 animate-in fade-in duration-150">
    <nav className="flex flex-wrap items-center gap-2 text-xs text-bp-muted">
      <button type="button" onClick={onNavigateHome} className="hover:text-bp-text">Company Home</button><span>/</span>
      <button type="button" onClick={onNavigateBack} className="hover:text-bp-text">{currentProject.name}</button><span>/</span>
      <span className="font-semibold text-bp-text">Vehicle Hire</span>
    </nav>
    <header className="flex flex-col gap-3 rounded-2xl border border-bp-border bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-bp-cyan-soft text-bp-navy"><Truck className="h-5 w-5" /></span><div><h1 className="text-xl font-bold tracking-tight text-bp-text sm:text-2xl">Vehicle Hire</h1><p className="mt-1 text-xs text-bp-muted">Dealers, hire contracts, returns, payments and fuel</p></div></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={onShowLegacy} className={`${buttonClass} border border-bp-border bg-white text-bp-text hover:bg-bp-background`}><Clock3 className="h-4 w-4" />Fleet & Movement History</button>{manager && <><button type="button" onClick={() => openDealer()} className={`${buttonClass} border border-bp-border bg-white text-bp-text hover:bg-bp-background`}><Plus className="h-4 w-4" />Add Dealer</button><button type="button" onClick={() => openHire()} disabled={!dealers.some(dealer => dealer.status === 'active')} className={`${buttonClass} bg-bp-navy text-white hover:bg-bp-blue`}><Plus className="h-4 w-4" />Add Hire</button><button type="button" onClick={() => { openFuel(); }} className={`${buttonClass} bg-bp-cyan text-bp-navy hover:bg-bp-cyan/80`}><Fuel className="h-4 w-4" />Add Fuel Entry</button></>}</div>
    </header>

    {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertTriangle className="h-4 w-4 shrink-0" />{error}<button className="ml-auto underline" onClick={() => void reload().catch(err => setError(err.message))}>Retry</button></div>}
    {notice && <div role="status" className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" />{notice}<button aria-label="Dismiss" className="ml-auto" onClick={() => setNotice(null)}><X className="h-4 w-4" /></button></div>}

    <section aria-label="Vehicle Hire filters" className="grid grid-cols-1 gap-2 rounded-2xl border border-bp-border bg-white p-3 shadow-xs sm:grid-cols-2 xl:grid-cols-8">
      <label className="relative sm:col-span-2"><span className="sr-only">Search hires and dealers</span><input value={query} onChange={event => setQuery(event.target.value)} className={fieldClass} /></label>
      <label><span className="sr-only">Dealer filter</span><select value={dealerFilter} onChange={event => setDealerFilter(event.target.value)} className={fieldClass}><option value="all">All dealers</option>{dealers.map(dealer => <option key={dealer.id} value={dealer.id}>{dealer.name}</option>)}</select></label>
      <label><span className="sr-only">Project filter</span><select value={projectFilter} onChange={event => setProjectFilter(event.target.value)} className={fieldClass}><option value="all">All projects</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
      <label><span className="sr-only">Site filter</span><select value={siteFilter} onChange={event => setSiteFilter(event.target.value)} className={fieldClass}><option value="all">All sites</option>{[...new Set(sites.map(site => site.name))].map(site => <option key={site}>{site}</option>)}</select></label>
      <label><span className="sr-only">Vehicle filter</span><select value={vehicleFilter} onChange={event => setVehicleFilter(event.target.value)} className={fieldClass}><option value="all">All vehicles</option>{vehicleOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label><span className="sr-only">Hire status filter</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className={fieldClass}><option value="all">All statuses</option>{(['Active', 'Return Due', 'Overdue', 'Returned', 'Cancelled'] as VehicleHireDisplayStatus[]).map(status => <option key={status}>{status}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-2"><label><span className="sr-only">From date</span><input type="date" aria-label="From date" value={fromDate} onChange={event => setFromDate(event.target.value)} className={fieldClass} /></label><label><span className="sr-only">To date</span><input type="date" aria-label="To date" value={toDate} onChange={event => setToDate(event.target.value)} className={fieldClass} /></label></div>
    </section>
    {fromDate && toDate && fromDate > toDate && <p role="alert" className="text-xs text-red-700">From Date must be on or before To Date.</p>}

    <nav aria-label="Vehicle Hire sections" className="flex gap-4 overflow-x-auto border-b border-bp-border">
      {tabs.map(([key, label]) => <button key={key} type="button" onClick={() => setTab(key)} className={`${tab === key ? 'border-b-2 border-bp-cyan text-bp-text' : 'border-b-2 border-transparent text-bp-muted'} min-h-11 whitespace-nowrap pb-2 text-xs font-semibold`}>{label}</button>)}
    </nav>

    {loading ? <div className="rounded-xl border border-bp-border bg-white p-10 text-center text-sm text-bp-muted">Loading Vehicle Hire records…</div> : <>
      {tab === 'overview' && <>
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {stats.map((item, index) => { const Icon = item.icon; return <article key={item.label} className={`${index === 0 ? 'border-bp-navy bg-bp-navy text-white' : 'border-bp-border bg-white text-bp-text'} min-w-0 rounded-xl border p-4 shadow-xs`}><div className="flex items-start justify-between gap-2"><p className={`${index === 0 ? 'text-slate-200' : 'text-bp-muted'} text-xs font-medium leading-4`}>{item.label}</p><Icon className={`${index === 0 ? 'text-bp-cyan' : 'text-bp-blue'} h-4 w-4 shrink-0`} /></div><div className="mt-2 break-words text-xl font-bold tabular-nums">{item.value}</div><p className={`${index === 0 ? 'text-slate-300' : 'text-bp-muted'} mt-1 text-[10px]`}>{item.detail}</p></article>; })}
        </section>
        <HireTable hires={filteredHires.slice(0, 8)} dealers={dealers} statusForHire={statusForHire} returns={returns} payments={payments} onView={setDetailHire} onReturn={openReturn} onEdit={openHire} manager={manager} canDelete={hire => !hireHasDependencies(hire)} onDelete={deleteHire} onCancel={async hire => { if (!window.confirm(`Cancel hire ${hire.hire_reference}?`)) return; try { await dataService.cancelVehicleHireContract(hire.id); await reload(); } catch (cancelError) { setError(cancelError instanceof Error ? cancelError.message : 'Unable to cancel hire.'); } }} />
        <div className="grid gap-3 lg:grid-cols-2"><UpcomingList title="Upcoming returns" hires={upcomingHires} /><UpcomingList title="Overdue returns" hires={overdueHires} danger /></div>
        <p className="text-xs text-bp-muted">Confirmed dealer fuel reimbursements in this view: {money(confirmedFuelCost)}. Driver advances are tracked separately from fuel purchased.</p>
      </>}

      {tab === 'dealers' && <section className="overflow-hidden rounded-xl border border-bp-border bg-white shadow-xs"><div className="flex items-center justify-between border-b border-bp-border p-4"><h2 className="font-semibold text-bp-text">Vehicle dealers</h2>{manager && <button onClick={() => openDealer()} className={`${buttonClass} bg-bp-navy text-white`}><Plus className="h-4 w-4" />Add Dealer</button>}</div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-bp-background text-[10px] uppercase text-bp-muted"><tr>{['Dealer', 'Contact', 'Status', 'Active hires', 'Returned hires', 'Hire charges', 'Payments', 'Outstanding', 'Actions'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-bp-border">{filteredDealers.length ? filteredDealers.map(dealer => {
        const related = hires.filter(hire => hire.dealer_id === dealer.id);
        const returned = returns.filter(record => related.some(hire => hire.id === record.hire_id));
        const paid = payments.filter(payment => payment.dealer_id === dealer.id).reduce((sum, row) => sum + signedVehicleDealerPaymentAmount(row), 0);
        const hasHistory = related.length > 0 || payments.some(payment => payment.dealer_id === dealer.id) || fuel.some(entry => entry.dealer_id === dealer.id);
        return <tr key={dealer.id} className="hover:bg-bp-background/60"><td className="px-3 py-3"><b>{dealer.name}</b><span className="block text-[10px] text-bp-muted">{dealer.dealer_id}</span></td><td className="px-3 py-3">{dealer.contact_person}<span className="block text-[10px] text-bp-muted">{dealer.phone}</span></td><td className="px-3 py-3"><StatusPill value={dealer.status === 'active' ? 'Active' : 'Archived'} /></td><td className="px-3 py-3 tabular-nums">{related.filter(hire => ['Active', 'Return Due', 'Overdue'].includes(statusForHire(hire))).length}</td><td className="px-3 py-3 tabular-nums">{returned.length}</td><td className="px-3 py-3 tabular-nums">{money(returned.reduce((sum, row) => sum + row.final_bill, 0))}</td><td className="px-3 py-3 tabular-nums">{money(paid)}</td><td className="px-3 py-3 font-semibold tabular-nums">{money(calculateDealerOutstanding(dealer.id, hires, returns, payments, fuel))}</td><td className="px-3 py-3"><div className="flex gap-1">{manager && <button className="rounded border px-2 py-1" onClick={() => { setTab('payments'); openPayment(dealer.id); }}>Payment</button>}{manager && <button className="rounded border px-2 py-1" onClick={() => openDealer(dealer)}>Edit</button>}{manager && !hasHistory && <button className="rounded border border-red-200 px-2 py-1 text-red-700" onClick={async () => { if (!window.confirm(`Delete dealer ${dealer.name} (${dealer.dealer_id})?`)) return; try { await dataService.deleteVehicleDealerIfUnused(dealer.id); await reload(); } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete dealer.'); } }}>Delete</button>}{manager && dealer.status === 'active' && hasHistory && <button className="rounded border px-2 py-1 text-amber-800" onClick={async () => { if (!window.confirm(`Archive ${dealer.name}? Its linked hire and payment history will be retained.`)) return; try { await dataService.archiveVehicleDealer(dealer.id); await reload(); } catch (archiveError) { setError(archiveError instanceof Error ? archiveError.message : 'Unable to archive dealer.'); } }}>Archive</button>}</div></td></tr>;
      }) : <EmptyRow colSpan={9} text="No vehicle dealers have been registered." />}</tbody></table></div></section>}

      {tab === 'hires' && <HireTable hires={filteredHires} dealers={dealers} statusForHire={statusForHire} returns={returns} payments={payments} onView={setDetailHire} onReturn={openReturn} onEdit={openHire} manager={manager} canDelete={hire => !hireHasDependencies(hire)} onDelete={deleteHire} onCancel={async hire => { if (!window.confirm(`Cancel hire ${hire.hire_reference}?`)) return; try { await dataService.cancelVehicleHireContract(hire.id); await reload(); } catch (cancelError) { setError(cancelError instanceof Error ? cancelError.message : 'Unable to cancel hire.'); } }} />}

      {tab === 'returns' && <section className="overflow-hidden rounded-xl border border-bp-border bg-white shadow-xs"><div className="flex items-center justify-between border-b border-bp-border p-4"><h2 className="font-semibold">Hire returns and final bills</h2>{manager && <button onClick={() => { const open = activeHires[0]; if (open) openReturn(open); }} disabled={!activeHires.length} className={`${buttonClass} bg-bp-navy text-white`}><Plus className="h-4 w-4" />Record Return</button>}</div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-bp-background text-[10px] uppercase text-bp-muted"><tr>{['Hire', 'Dealer', 'Actual Return', 'Usage', 'Condition', 'Final Bill', 'Advance', 'Paid', 'Balance', 'Action'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-bp-border">{visibleReturns.length ? visibleReturns.map(record => { const hire = hires.find(item => item.id === record.hire_id); const paid = payments.filter(payment => payment.hire_ids.includes(record.hire_id)).reduce((sum, payment) => sum + signedVehicleDealerPaymentAmount(payment), 0); return <tr key={record.id}><td className="px-3 py-3">{hire?.hire_reference || record.hire_id}<span className="block text-[10px] text-bp-muted">{hire?.vehicle_type}</span></td><td className="px-3 py-3">{dealerName(hire?.dealer_id || '')}</td><td className="px-3 py-3 tabular-nums">{formatDateTime(record.actual_return_at)}</td><td className="px-3 py-3 tabular-nums">{record.billable_usage} {hire?.billing_method === 'fixed_contract' ? 'fixed' : hire?.billing_method}</td><td className="px-3 py-3">{record.return_condition}</td><td className="px-3 py-3 font-semibold tabular-nums">{money(record.final_bill)}</td><td className="px-3 py-3 tabular-nums">{money(hire?.advance_amount || 0)}</td><td className="px-3 py-3 tabular-nums">{money(paid)}</td><td className="px-3 py-3 tabular-nums">{money(record.final_bill - paid)}</td><td className="px-3 py-3">{manager && <button className="rounded border px-2 py-1" onClick={() => hire && openReturn(hire)}>Correct</button>}</td></tr>; }) : <EmptyRow colSpan={10} text="No finalized vehicle returns match the selected filters." />}</tbody></table></div></section>}

      {tab === 'payments' && <section className="overflow-hidden rounded-xl border border-bp-border bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-bp-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-semibold">Dealer payments</h2><p className="mt-1 text-xs text-bp-muted">Payments are retained. Use an audited edit or reversal; payments cannot be deleted.</p></div>
          <div className="flex gap-2"><button onClick={exportPayments} className={`${buttonClass} border border-bp-border bg-white text-bp-text`}><Download className="h-4 w-4" />Export CSV</button>{manager && <button onClick={() => openPayment()} className={`${buttonClass} bg-bp-navy text-white`}><Plus className="h-4 w-4" />Record Payment</button>}</div>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-xs"><thead className="bg-bp-background text-[10px] uppercase text-bp-muted"><tr>{['Date', 'Dealer', 'Hire', 'Type', 'Method', 'Reference', 'Amount', 'Recorded By', 'Receipt', 'Actions'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-bp-border">{visiblePayments.length ? visiblePayments.map(payment => {
          const hasReversal = payments.some(record => record.reverses_payment_id === payment.id);
          const signedAmount = signedVehicleDealerPaymentAmount(payment);
          return <tr key={payment.id}>
            <td className="px-3 py-3 tabular-nums">{payment.payment_date}</td><td className="px-3 py-3">{dealerName(payment.dealer_id)}</td>
            <td className="px-3 py-3">{payment.hire_ids.map(id => hires.find(hire => hire.id === id)?.hire_reference || id).join(', ') || 'Dealer account'}</td>
            <td className="px-3 py-3 capitalize">{payment.payment_type}{hasReversal && <span className="block text-[10px] text-red-700">Reversed</span>}{payment.revision_history?.length ? <span className="block text-[10px] text-bp-muted">{payment.revision_history.length} audited correction(s)</span> : null}{payment.reversal_reason && <span className="block text-[10px] text-bp-muted">{payment.reversal_reason}</span>}</td>
            <td className="px-3 py-3">{payment.method.replace('_', ' ')}</td><td className="px-3 py-3">{payment.transaction_reference || '—'}</td>
            <td className={`px-3 py-3 font-semibold tabular-nums ${signedAmount < 0 ? 'text-red-700' : ''}`}>{money(signedAmount)}</td><td className="px-3 py-3">{payment.created_by_name}</td>
            <td className="px-3 py-3"><AttachmentLinks attachments={payment.receipt} /></td>
            <td className="px-3 py-3"><div className="flex gap-1">{canConfirmFuelReimbursement(currentUser.role) && payment.payment_type !== 'reversal' && !hasReversal && <><button type="button" onClick={() => openPayment(payment)} className="rounded border border-bp-border px-2 py-1 text-[10px] font-semibold">Edit</button><button type="button" onClick={() => void reversePayment(payment)} className="rounded border border-red-200 px-2 py-1 text-[10px] font-semibold text-red-700">Reverse</button></>}</div></td>
          </tr>;
        }) : <EmptyRow colSpan={10} text="No dealer payments match the selected filters." />}</tbody></table></div>
      </section>}
      {tab === 'fuel' && <div className="space-y-3"><section className="overflow-hidden rounded-xl border border-bp-border bg-white shadow-xs"><div className="flex flex-col gap-3 border-b border-bp-border p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Fuel expenses</h2><p className="mt-1 text-xs text-bp-muted">Fuel cost, driver advances and dealer reimbursements are tracked separately.</p></div><div className="flex flex-wrap gap-2"><button onClick={exportFuel} className={`${buttonClass} border border-bp-border bg-white text-bp-text`}><Download className="h-4 w-4" />Export CSV</button>{manager && <><button onClick={() => { openAdvance(); }} className={`${buttonClass} border border-bp-border bg-white text-bp-text`}><Plus className="h-4 w-4" />Give Driver Advance</button><button onClick={() => { openFuel(); }} className={`${buttonClass} bg-bp-navy text-white`}><Plus className="h-4 w-4" />Add Fuel Entry</button></>}</div></div><div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-xs"><thead className="bg-bp-background text-[10px] uppercase text-bp-muted"><tr>{['Date', 'Hire / Vehicle', 'Project / Site', 'Fuel', 'Quantity', 'Amount', 'Paid by', 'Advance', 'Settlement', 'Supplier', 'Receipt', 'Status', 'Actions'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-bp-border">{visibleFuel.length ? visibleFuel.map(entry => { const advance = fuelAdvances.find(item => item.id === entry.driver_advance_id); return <tr key={entry.id}><td className="px-3 py-3 tabular-nums">{entry.fuel_date}</td><td className="px-3 py-3">{hires.find(hire => hire.id === entry.hire_id)?.hire_reference || '—'}<span className="block text-[10px] text-bp-muted">{hires.find(hire => hire.id === entry.hire_id)?.vehicle_type || entry.asset_id || 'Unlinked'}</span></td><td className="px-3 py-3">{entry.project_name}<span className="block text-[10px] text-bp-muted">{entry.site_name}</span></td><td className="px-3 py-3 capitalize">{entry.fuel_type}</td><td className="px-3 py-3 tabular-nums">{entry.quantity_litres.toFixed(2)} L</td><td className={`px-3 py-3 font-semibold tabular-nums ${entry.status === 'voided' ? 'text-bp-muted line-through' : ''}`}>{money(entry.total_amount)}</td><td className="px-3 py-3">{entry.payer.replace('_', ' ')}</td><td className="px-3 py-3 tabular-nums">{advance ? `${advance.transaction_reference || advance.id.slice(-8)} · ${money(advance.amount)}` : '—'}</td><td className="px-3 py-3">{entry.payer === 'dealer_paid' ? entry.reimbursement_confirmed ? 'Reimbursable' : 'Not applied' : entry.payer === 'driver_advance' && advance ? `Remaining ${money(advanceBalance(advance, fuelDraft.id))}` : 'Direct expense'}</td><td className="px-3 py-3">{entry.supplier}</td><td className="px-3 py-3"><AttachmentLinks attachments={entry.receipt} /></td><td className="px-3 py-3">{entry.status === 'voided' ? <StatusPill value="Voided" /> : <StatusPill value="Active" />}</td><td className="px-3 py-3"><div className="flex flex-wrap gap-1">{fuelCanEdit(entry) && <button type="button" onClick={() => openFuel(entry)} className="rounded border border-bp-border px-2 py-1 text-[10px] font-semibold">Edit</button>}{fuelCanVoid(entry) && <button type="button" onClick={() => void voidFuelEntry(entry)} className="rounded border border-red-200 px-2 py-1 text-[10px] font-semibold text-red-700">Void</button>}{entry.status !== 'voided' && !fuelCanVoid(entry) && <button type="button" disabled title="This fuel record is linked to an advance or dealer settlement. Correct it with an authorized audited edit." className="rounded border border-bp-border px-2 py-1 text-[10px] text-bp-muted disabled:cursor-not-allowed">Delete unavailable</button>}{entry.payer === 'dealer_paid' && !entry.reimbursement_confirmed && canConfirmFuelReimbursement(currentUser.role) && <button type="button" onClick={() => void confirmFuelReimbursement(entry)} className="rounded border border-bp-cyan px-2 py-1 text-[10px] font-semibold">Confirm payable</button>}</div></td></tr>; }) : <EmptyRow colSpan={13} text="No fuel entries match the selected filters." />}</tbody></table></div></section><section className="overflow-hidden rounded-xl border border-bp-border bg-white shadow-xs"><div className="border-b border-bp-border p-4"><h3 className="font-semibold">Driver fuel advances</h3><p className="mt-1 text-xs text-bp-muted">Available balances can be linked to one or more actual fuel purchases.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="bg-bp-background text-[10px] uppercase text-bp-muted"><tr>{['Date', 'Driver', 'Hire / Project', 'Advanced', 'Fuel reconciled', 'Remaining', 'Reference'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-bp-border">{fuelAdvances.filter(advance => (projectFilter === 'all' || advance.project_id === projectFilter) && (siteFilter === 'all' || advance.site_name === siteFilter) && (!fromDate || advance.advance_date >= fromDate) && (!toDate || advance.advance_date <= toDate)).map(advance => { const used = advance.amount - advanceBalance(advance); return <tr key={advance.id}><td className="px-3 py-3 tabular-nums">{advance.advance_date}</td><td className="px-3 py-3">{advance.driver_name}</td><td className="px-3 py-3">{hires.find(hire => hire.id === advance.hire_id)?.hire_reference || advance.project_name}<span className="block text-[10px] text-bp-muted">{advance.site_name}</span></td><td className="px-3 py-3 tabular-nums">{money(advance.amount)}</td><td className="px-3 py-3 tabular-nums">{money(used)}</td><td className="px-3 py-3 font-semibold tabular-nums">{money(advanceBalance(advance, fuelDraft.id))}</td><td className="px-3 py-3">{advance.transaction_reference || '—'}</td></tr>; })}</tbody></table></div></section></div>}

      {tab === 'reports' && <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[
        ['Hire register', exportHires], ['Vehicle-wise costs and hour usage', exportVehicleCosts],
        ['Project-wise hire and fuel costs', exportProjectCosts], ['Returns and final settlements', exportReturns],
        ['Dealer payments', exportPayments], ['Fuel by vehicle, site, project and date', exportFuel],
        ['Driver advance reconciliation', exportDriverAdvances], ['Dealer balances', exportDealerBalances]
      ].map(([label, action]) => <button key={String(label)} onClick={action as () => void} className="flex min-h-24 items-center justify-between rounded-xl border border-bp-border bg-white p-4 text-left shadow-xs hover:border-bp-cyan"><span className="font-semibold text-bp-text">{label as string}</span><Download className="h-4 w-4 text-bp-blue" /></button>)}</section>}
    </>}

    {dealerDialog && <Modal title={dealerDraft.id ? 'Edit dealer' : 'Add vehicle dealer'} onClose={() => setDealerDialog(false)} error={dialogError} busy={saving} dirty={isFormDirty('dealer', dealerDraft)}>
      <form onSubmit={saveDealer} className="space-y-4 p-4 sm:p-5"><div className="grid gap-3 sm:grid-cols-2"><Field label="Dealer ID *"><input required value={dealerDraft.dealer_id} onChange={event => setDealerDraft({ ...dealerDraft, dealer_id: event.target.value })} className={fieldClass} /></Field><Field label="Dealer name *"><input required value={dealerDraft.name} onChange={event => setDealerDraft({ ...dealerDraft, name: event.target.value })} className={fieldClass} /></Field><Field label="Contact person *"><input required value={dealerDraft.contact_person} onChange={event => setDealerDraft({ ...dealerDraft, contact_person: event.target.value })} className={fieldClass} /></Field><Field label="Phone *"><input required value={dealerDraft.phone} onChange={event => setDealerDraft({ ...dealerDraft, phone: event.target.value })} className={fieldClass} /></Field><Field label="Email (optional)"><input type="email" value={dealerDraft.email || ''} onChange={event => setDealerDraft({ ...dealerDraft, email: event.target.value })} className={fieldClass} /></Field><Field label="Status"><output className={`${fieldClass} flex items-center font-semibold capitalize`}>{dealerDraft.status}</output></Field><Field label="Address *"><textarea required value={dealerDraft.address} onChange={event => setDealerDraft({ ...dealerDraft, address: event.target.value })} className={fieldClass} /></Field><Field label="Payment details"><textarea value={dealerDraft.payment_details || ''} onChange={event => setDealerDraft({ ...dealerDraft, payment_details: event.target.value })} className={fieldClass} /></Field><Field label="Remarks"><textarea value={dealerDraft.remarks || ''} onChange={event => setDealerDraft({ ...dealerDraft, remarks: event.target.value })} className={fieldClass} /></Field></div><DialogActions saving={saving} onCancel={() => setDealerDialog(false)} saveLabel="Save Dealer" /></form>
    </Modal>}

    {hireDialog && <Modal title={hireDraft.id ? 'Edit vehicle hire' : 'Create vehicle hire'} onClose={() => setHireDialog(false)} error={dialogError} wide busy={saving} dirty={isFormDirty('hire', hireDraft)}>
      <form onSubmit={saveHire} className="space-y-4 p-4 sm:p-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Field label="Dealer *"><select required value={hireDraft.dealer_id} onChange={event => setHireDraft({ ...hireDraft, dealer_id: event.target.value })} className={fieldClass}><option value="">Select dealer</option>{dealers.filter(dealer => dealer.status === 'active').map(dealer => <option key={dealer.id} value={dealer.id}>{dealer.name} ({dealer.dealer_id})</option>)}</select></Field><Field label="Project *"><select required value={hireDraft.project_id} onChange={event => { const project = projects.find(item => item.id === event.target.value); setHireDraft({ ...hireDraft, project_id: event.target.value, site_id: undefined, site_name: project?.location || project?.name || '' }); }} className={fieldClass}>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field><Field label="Site *"><select required value={hireDraft.site_id || '__project__'} onChange={event => { const site = sitesFor(hireDraft.project_id).find(item => item.id === event.target.value); const project = projects.find(item => item.id === hireDraft.project_id); setHireDraft({ ...hireDraft, site_id: site?.id, site_name: site?.name || project?.location || project?.name || '' }); }} className={fieldClass}><option value="__project__">{projects.find(item => item.id === hireDraft.project_id)?.location || projects.find(item => item.id === hireDraft.project_id)?.name}</option>{sitesFor(hireDraft.project_id).filter(site => site.id).map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</select></Field><Field label="Vehicle type *"><div className="flex gap-2"><select required value={hireDraft.vehicle_type} onChange={event => setHireDraft({ ...hireDraft, vehicle_type: event.target.value })} className={fieldClass}>{vehicleTypes.map(type => <option key={type}>{type}</option>)}</select>{manager && <button type="button" onClick={() => { openVehicleType(); }} className="mt-1 min-h-10 shrink-0 rounded-lg border border-bp-border px-3 text-xs font-semibold">+ Type</button>}</div></Field><Field label="Registered vehicle (optional)"><select value={hireDraft.asset_id || ''} onChange={event => { const asset = assets.find(item => item.id === event.target.value); setHireDraft(current => ({ ...current, asset_id: asset?.id, vehicle_type: asset?.vehicle_type || current.vehicle_type, registration_number: asset?.registration_number || current.registration_number, vehicle_description: asset ? `${asset.model} · ${asset.vehicle_equipment_id}` : current.vehicle_description })); }} className={fieldClass}><option value="">Vehicle hired outside fleet</option>{assets.map(asset => <option key={asset.id} value={asset.id}>{asset.vehicle_type} · {asset.registration_number || asset.vehicle_equipment_id}</option>)}</select></Field><Field label="Registration number"><input value={hireDraft.registration_number} onChange={event => setHireDraft({ ...hireDraft, registration_number: event.target.value })} className={fieldClass} /></Field><Field label="Vehicle description *"><input required value={hireDraft.vehicle_description} onChange={event => setHireDraft({ ...hireDraft, vehicle_description: event.target.value })} className={fieldClass} /></Field><Field label="Driver name"><input value={hireDraft.driver_name} onChange={event => setHireDraft({ ...hireDraft, driver_name: event.target.value })} className={fieldClass} /></Field><Field label="Driver phone"><input value={hireDraft.driver_phone} onChange={event => setHireDraft({ ...hireDraft, driver_phone: event.target.value })} className={fieldClass} /></Field><Field label="Start date and time *"><input required type="datetime-local" value={hireDraft.start_at} onChange={event => setHireDraft({ ...hireDraft, start_at: event.target.value })} className={fieldClass} /></Field><Field label="Expected return *"><input required type="datetime-local" value={hireDraft.expected_return_at} onChange={event => setHireDraft({ ...hireDraft, expected_return_at: event.target.value })} className={fieldClass} /></Field><Field label="Billing method *"><select value={hireDraft.billing_method} onChange={event => setHireDraft({ ...hireDraft, billing_method: event.target.value as VehicleHireBillingMethod })} className={fieldClass}>{billingMethods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label={hireDraft.billing_method === 'fixed_contract' ? 'Fixed contract amount (₹) *' : `Agreed rate / ${hireDraft.billing_method} (₹) *`}><input required type="number" min="0" step="0.01" value={hireDraft.agreed_rate} onChange={event => setHireDraft({ ...hireDraft, agreed_rate: event.target.value })} className={fieldClass} /></Field><Field label="Initial meter reading"><input type="number" min="0" step="0.01" value={hireDraft.initial_meter_reading} onChange={event => setHireDraft({ ...hireDraft, initial_meter_reading: event.target.value })} className={fieldClass} /></Field><Field label="Initial engine hours"><input type="number" min="0" step="0.01" value={hireDraft.initial_engine_hours} onChange={event => setHireDraft({ ...hireDraft, initial_engine_hours: event.target.value })} className={fieldClass} /></Field><Field label="Advance payment (₹)"><input type="number" min="0" step="0.01" value={hireDraft.advance_amount} onChange={event => setHireDraft({ ...hireDraft, advance_amount: event.target.value })} disabled={Boolean(hireDraft.id)} className={fieldClass} /></Field>{Number(hireDraft.advance_amount) > 0 && <><Field label="Advance method"><select value={hireDraft.advance_payment_method} onChange={event => setHireDraft({ ...hireDraft, advance_payment_method: event.target.value as VehicleDealerPaymentMethod })} className={fieldClass}>{paymentMethods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Advance transaction reference"><input value={hireDraft.advance_transaction_reference} onChange={event => setHireDraft({ ...hireDraft, advance_transaction_reference: event.target.value })} className={fieldClass} /></Field></>}<Field label="Remarks"><textarea value={hireDraft.remarks} onChange={event => setHireDraft({ ...hireDraft, remarks: event.target.value })} className={fieldClass} /></Field></div><AttachmentSections value={hireDraft.attachments} onChange={attachments => setHireDraft({ ...hireDraft, attachments })} onUploadFile={onUploadFile} disabled={saving} /><p className="rounded-lg bg-bp-background p-3 text-xs text-bp-muted">Final hire charges are calculated only when a return is finalized using confirmed billable usage. The entered rate is never multiplied by an assumed duration.</p><DialogActions saving={saving} onCancel={() => setHireDialog(false)} saveLabel={hireDraft.id ? 'Save Changes' : 'Save Hire'} /></form>
    </Modal>}

    {returnDialog && <Modal title="Record vehicle return" onClose={() => setReturnDialog(false)} error={dialogError} wide busy={saving} dirty={isFormDirty('return', returnDraft)}>
      <form onSubmit={saveReturn} className="space-y-4 p-4 sm:p-5"><Field label="Hire reference *"><select required value={returnDraft.hire_id} onChange={event => { setReturnDraft({ ...freshReturn(event.target.value), correction_reason: returnByHire.has(event.target.value) ? '' : '' }); }} className={fieldClass}><option value="">Select hire</option>{hires.filter(hire => hire.status === 'active').map(hire => <option key={hire.id} value={hire.id}>{hire.hire_reference} · {hire.vehicle_type} · {dealerName(hire.dealer_id)}{returnByHire.has(hire.id) ? ' (finalized)' : ''}</option>)}</select></Field>{selectedReturnHire && <div className="rounded-lg border border-bp-border bg-bp-background p-3 text-xs"><b>{selectedReturnHire.vehicle_type}</b> · {selectedReturnHire.vehicle_description}<span className="block text-bp-muted">Confirmed rate: {money(selectedReturnHire.agreed_rate)} / {selectedReturnHire.billing_method === 'fixed_contract' ? 'contract' : selectedReturnHire.billing_method}</span></div>}<div className="grid gap-3 sm:grid-cols-2"><Field label="Actual return date and time *"><input required type="datetime-local" value={returnDraft.actual_return_at} onChange={event => setReturnDraft({ ...returnDraft, actual_return_at: event.target.value })} className={fieldClass} /></Field><Field label={selectedReturnHire?.billing_method === 'fixed_contract' ? 'Confirmed usage (not billed)' : `Confirmed billable ${selectedReturnHire?.billing_method || 'usage'} units *`}><input required={!selectedReturnHire || selectedReturnHire.billing_method !== 'fixed_contract'} type="number" min="0" step="0.01" value={returnDraft.billable_usage} disabled={selectedReturnHire?.billing_method === 'fixed_contract'} onChange={event => setReturnDraft({ ...returnDraft, billable_usage: event.target.value })} className={fieldClass} /></Field><Field label="Final meter reading"><input type="number" min="0" step="0.01" value={returnDraft.final_meter_reading} onChange={event => setReturnDraft({ ...returnDraft, final_meter_reading: event.target.value })} className={fieldClass} /></Field><Field label="Final engine hours"><input type="number" min="0" step="0.01" value={returnDraft.final_engine_hours} onChange={event => setReturnDraft({ ...returnDraft, final_engine_hours: event.target.value })} className={fieldClass} /></Field><Field label="Return condition *"><select value={returnDraft.return_condition} onChange={event => setReturnDraft({ ...returnDraft, return_condition: event.target.value })} className={fieldClass}>{['Good', 'Needs repair', 'Damaged', 'Other'].map(value => <option key={value}>{value}</option>)}</select></Field><Field label="Additional charges (₹)"><input type="number" min="0" step="0.01" value={returnDraft.additional_charges} onChange={event => setReturnDraft({ ...returnDraft, additional_charges: event.target.value })} className={fieldClass} /></Field><Field label="Discount (₹)"><input type="number" min="0" step="0.01" value={returnDraft.discount} onChange={event => setReturnDraft({ ...returnDraft, discount: event.target.value })} className={fieldClass} /></Field><Field label="Remarks"><textarea value={returnDraft.remarks} onChange={event => setReturnDraft({ ...returnDraft, remarks: event.target.value })} className={fieldClass} /></Field>{returnByHire.has(returnDraft.hire_id) && <Field label="Correction reason *"><textarea required value={returnDraft.correction_reason} onChange={event => setReturnDraft({ ...returnDraft, correction_reason: event.target.value })} className={fieldClass} /></Field>}</div>{returnBillPreview !== null && <div className="rounded-lg bg-bp-cyan-soft p-3 text-sm font-semibold">Final hire bill: <span className="tabular-nums">{money(returnBillPreview)}</span></div>}<AttachmentSections value={returnDraft.attachments} onChange={attachments => setReturnDraft({ ...returnDraft, attachments })} onUploadFile={onUploadFile} disabled={saving} /><DialogActions saving={saving} onCancel={() => setReturnDialog(false)} saveLabel={returnByHire.has(returnDraft.hire_id) ? 'Save Audited Correction' : 'Finalize Return'} /></form>
    </Modal>}

    {paymentDialog && <Modal title={paymentDraft.id ? "Edit dealer payment" : "Record dealer payment"} onClose={() => setPaymentDialog(false)} error={dialogError} busy={saving} dirty={isFormDirty('payment', paymentDraft)}>
      <form onSubmit={savePayment} className="space-y-4 p-4 sm:p-5"><div className="grid gap-3 sm:grid-cols-2"><Field label="Dealer *"><select required value={paymentDraft.dealer_id} onChange={event => setPaymentDraft({ ...paymentDraft, dealer_id: event.target.value, hire_id: '' })} className={fieldClass}><option value="">Select dealer</option>{dealers.map(dealer => <option key={dealer.id} value={dealer.id}>{dealer.name}</option>)}</select></Field><Field label={currentUser.role === 'site_supervisor' ? "Related assigned hire *" : "Related hire"}><select required={currentUser.role === 'site_supervisor'} value={paymentDraft.hire_id} disabled={Boolean(paymentDraft.id && paymentDraft.payment_type === 'advance')} onChange={event => setPaymentDraft({ ...paymentDraft, hire_id: event.target.value })} className={fieldClass}>{currentUser.role !== 'site_supervisor' && <option value="">Dealer account / unallocated</option>}{hires.filter(hire => hire.dealer_id === paymentDraft.dealer_id).map(hire => <option key={hire.id} value={hire.id}>{hire.hire_reference}</option>)}</select></Field><Field label="Payment date *"><input required type="date" value={paymentDraft.payment_date} onChange={event => setPaymentDraft({ ...paymentDraft, payment_date: event.target.value })} className={fieldClass} /></Field><Field label="Amount (₹) *"><input required type="number" min="0.01" step="0.01" value={paymentDraft.amount} onChange={event => setPaymentDraft({ ...paymentDraft, amount: event.target.value })} className={fieldClass} /></Field><Field label="Payment type"><select value={paymentDraft.payment_type} disabled={Boolean(paymentDraft.id)} onChange={event => setPaymentDraft({ ...paymentDraft, payment_type: event.target.value as VehicleDealerPaymentType })} className={fieldClass}>{paymentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Payment method"><select value={paymentDraft.method} onChange={event => setPaymentDraft({ ...paymentDraft, method: event.target.value as VehicleDealerPaymentMethod })} className={fieldClass}>{paymentMethods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Transaction reference"><input value={paymentDraft.transaction_reference} onChange={event => setPaymentDraft({ ...paymentDraft, transaction_reference: event.target.value })} className={fieldClass} /></Field><Field label="Remarks"><textarea value={paymentDraft.remarks} onChange={event => setPaymentDraft({ ...paymentDraft, remarks: event.target.value })} className={fieldClass} /></Field>{paymentDraft.id && <Field label="Correction reason *"><textarea required value={paymentDraft.correction_reason} onChange={event => setPaymentDraft({ ...paymentDraft, correction_reason: event.target.value })} className={fieldClass} /></Field>}</div><AttachmentSections value={paymentDraft.receipt} onChange={receipt => setPaymentDraft({ ...paymentDraft, receipt })} onUploadFile={onUploadFile} disabled={saving} /><DialogActions saving={saving} onCancel={() => setPaymentDialog(false)} saveLabel={paymentDraft.id ? "Save Audited Correction" : "Save Payment"} /></form>
    </Modal>}

    {fuelDialog && <Modal title={fuelDraft.id ? "Edit fuel entry" : "Add fuel entry"} onClose={() => setFuelDialog(false)} error={dialogError} wide busy={saving} dirty={isFormDirty('fuel', fuelDraft)}>
      <form onSubmit={saveFuel} className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Hire record"><select value={fuelDraft.hire_id} onChange={event => { const hire = hires.find(item => item.id === event.target.value); setFuelDraft({ ...fuelDraft, hire_id: event.target.value, project_id: hire?.project_id || fuelDraft.project_id, dealer_id: hire?.dealer_id || fuelDraft.dealer_id, site_id: hire?.site_id, site_name: hire?.site_name || fuelDraft.site_name, asset_id: hire?.asset_id || '', driver_advance_id: '' }); }} className={fieldClass}><option value="">Unlinked fuel record</option>{hires.map(hire => <option key={hire.id} value={hire.id}>{hire.hire_reference} · {hire.vehicle_type}</option>)}</select></Field>
          <Field label="Dealer"><select value={fuelDraft.dealer_id} onChange={event => setFuelDraft({ ...fuelDraft, dealer_id: event.target.value })} className={fieldClass}><option value="">No dealer</option>{dealers.map(dealer => <option key={dealer.id} value={dealer.id}>{dealer.name}</option>)}</select></Field>
          <Field label="Project *"><select required value={fuelDraft.project_id} onChange={event => { const project = projects.find(item => item.id === event.target.value); setFuelDraft({ ...fuelDraft, project_id: event.target.value, site_id: undefined, site_name: project?.location || project?.name || '', driver_advance_id: '' }); }} className={fieldClass}>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
          <Field label="Site *"><select required value={fuelDraft.site_id || '__project__'} onChange={event => { const site = sitesFor(fuelDraft.project_id).find(item => item.id === event.target.value); const project = projects.find(item => item.id === fuelDraft.project_id); setFuelDraft({ ...fuelDraft, site_id: site?.id, site_name: site?.name || project?.location || project?.name || '' }); }} className={fieldClass}><option value="__project__">{projects.find(item => item.id === fuelDraft.project_id)?.location || projects.find(item => item.id === fuelDraft.project_id)?.name}</option>{sitesFor(fuelDraft.project_id).filter(site => site.id).map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</select></Field>
          <Field label="Fuel date *"><input required type="date" value={fuelDraft.fuel_date} onChange={event => setFuelDraft({ ...fuelDraft, fuel_date: event.target.value })} className={fieldClass} /></Field>
          <Field label="Fuel type"><select value={fuelDraft.fuel_type} onChange={event => setFuelDraft({ ...fuelDraft, fuel_type: event.target.value as VehicleFuelType })} className={fieldClass}>{(['diesel', 'petrol', 'electric', 'other'] as VehicleFuelType[]).map(type => <option key={type} value={type}>{type}</option>)}</select></Field>
          <Field label="Quantity (litres) *"><input required type="number" min="0.01" step="0.01" value={fuelDraft.quantity_litres} onChange={event => setFuelDraft({ ...fuelDraft, quantity_litres: event.target.value })} className={fieldClass} /></Field>
          <Field label="Price per litre (₹) *"><input required type="number" min="0" step="0.01" value={fuelDraft.price_per_litre} onChange={event => setFuelDraft({ ...fuelDraft, price_per_litre: event.target.value })} className={fieldClass} /></Field>
          <Field label="Fuel total"><output className={`${fieldClass} flex items-center font-semibold tabular-nums`}>{fuelAmountPreview === null ? '—' : money(fuelAmountPreview)}</output></Field>
          <Field label="Odometer / engine reading"><input type="number" min="0" step="0.01" value={fuelDraft.meter_reading} onChange={event => setFuelDraft({ ...fuelDraft, meter_reading: event.target.value })} className={fieldClass} /></Field>
          <Field label="Supplier / petrol pump *"><input required value={fuelDraft.supplier} onChange={event => setFuelDraft({ ...fuelDraft, supplier: event.target.value })} className={fieldClass} /></Field>
          <Field label="Paid by *"><select value={fuelDraft.payer} onChange={event => setFuelDraft({ ...fuelDraft, payer: event.target.value as VehicleFuelPayer, confirm_dealer_reimbursement: false, driver_advance_id: '' })} className={fieldClass}><option value="company_direct">Company pays supplier</option><option value="driver_advance">Driver advance</option><option value="dealer_paid">Dealer paid</option></select></Field>
          {fuelDraft.payer === 'driver_advance' && <Field label="Driver advance to reconcile *"><select required value={fuelDraft.driver_advance_id} onChange={event => setFuelDraft({ ...fuelDraft, driver_advance_id: event.target.value })} className={fieldClass}><option value="">Select available advance</option>{availableFuelAdvances.map(advance => <option key={advance.id} value={advance.id}>{advance.driver_name} · remaining {money(advanceBalance(advance, fuelDraft.id))}</option>)}</select></Field>}
          {fuelDraft.payer === 'driver_advance' && <p className="rounded-lg bg-bp-background p-3 text-xs text-bp-muted">Unreconciled advance balance: {availableFuelAdvances.find(advance => advance.id === fuelDraft.driver_advance_id) ? money(advanceBalance(availableFuelAdvances.find(advance => advance.id === fuelDraft.driver_advance_id)!, fuelDraft.id)) : money(0)}. The expense cannot exceed the selected advance.</p>}
          {fuelDraft.payer === 'dealer_paid' && canConfirmFuelReimbursement(currentUser.role) && <label className="flex min-h-10 items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={fuelDraft.confirm_dealer_reimbursement} onChange={event => setFuelDraft({ ...fuelDraft, confirm_dealer_reimbursement: event.target.checked })} />Confirm authorized dealer reimbursement in settlement</label>}
          <Field label="Notes"><textarea value={fuelDraft.notes} onChange={event => setFuelDraft({ ...fuelDraft, notes: event.target.value })} className={fieldClass} /></Field>{fuelDraft.id && <Field label="Correction reason *"><textarea required value={fuelDraft.correction_reason} onChange={event => setFuelDraft({ ...fuelDraft, correction_reason: event.target.value })} className={fieldClass} /></Field>}
        </div>
        <p className="text-xs text-bp-muted">Recorded by: {currentUser.full_name}</p>
        <AttachmentSections value={fuelDraft.receipt} onChange={receipt => setFuelDraft({ ...fuelDraft, receipt })} onUploadFile={onUploadFile} disabled={saving} />
        <DialogActions saving={saving} onCancel={() => setFuelDialog(false)} saveLabel={fuelDraft.id ? "Save Audited Correction" : "Save Fuel Entry"} />
      </form>
    </Modal>}

    {advanceDialog && <Modal title="Give driver a fuel advance" onClose={() => setAdvanceDialog(false)} error={dialogError} busy={saving} dirty={isFormDirty('advance', advanceDraft)}>
      <form onSubmit={saveFuelAdvance} className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Related hire"><select value={advanceDraft.hire_id} onChange={event => { const hire = hires.find(item => item.id === event.target.value); setAdvanceDraft({ ...advanceDraft, hire_id: event.target.value, project_id: hire?.project_id || advanceDraft.project_id, site_id: hire?.site_id, site_name: hire?.site_name || advanceDraft.site_name, driver_name: hire?.driver_name || advanceDraft.driver_name }); }} className={fieldClass}><option value="">Unlinked driver advance</option>{hires.filter(hire => hire.status === 'active').map(hire => <option key={hire.id} value={hire.id}>{hire.hire_reference} · {hire.vehicle_type}</option>)}</select></Field>
          <Field label="Project *"><select required value={advanceDraft.project_id} onChange={event => { const project = projects.find(item => item.id === event.target.value); setAdvanceDraft({ ...advanceDraft, project_id: event.target.value, site_id: undefined, site_name: project?.location || project?.name || '', hire_id: '' }); }} className={fieldClass}>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
          <Field label="Site *"><select required value={advanceDraft.site_id || '__project__'} onChange={event => { const site = sitesFor(advanceDraft.project_id).find(item => item.id === event.target.value); const project = projects.find(item => item.id === advanceDraft.project_id); setAdvanceDraft({ ...advanceDraft, site_id: site?.id, site_name: site?.name || project?.location || project?.name || '' }); }} className={fieldClass}><option value="__project__">{projects.find(item => item.id === advanceDraft.project_id)?.location || projects.find(item => item.id === advanceDraft.project_id)?.name}</option>{sitesFor(advanceDraft.project_id).filter(site => site.id).map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</select></Field>
          <Field label="Driver name *"><input required readOnly={Boolean(advanceDraft.hire_id)} value={advanceDraft.driver_name} onChange={event => setAdvanceDraft({ ...advanceDraft, driver_name: event.target.value })} className={`${fieldClass} read-only:bg-bp-background`} /></Field>
          <Field label="Advance date *"><input required type="date" value={advanceDraft.advance_date} onChange={event => setAdvanceDraft({ ...advanceDraft, advance_date: event.target.value })} className={fieldClass} /></Field>
          <Field label="Amount (₹) *"><input required type="number" min="0.01" step="0.01" value={advanceDraft.amount} onChange={event => setAdvanceDraft({ ...advanceDraft, amount: event.target.value })} className={fieldClass} /></Field>
          <Field label="Payment method"><select value={advanceDraft.method} onChange={event => setAdvanceDraft({ ...advanceDraft, method: event.target.value as VehicleDealerPaymentMethod })} className={fieldClass}>{paymentMethods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Transaction reference"><input value={advanceDraft.transaction_reference} onChange={event => setAdvanceDraft({ ...advanceDraft, transaction_reference: event.target.value })} className={fieldClass} /></Field>
        </div>
        <p className="text-xs text-bp-muted">Actual fuel receipts are recorded separately and linked to this advance to calculate the unspent balance.</p>
        <DialogActions saving={saving} onCancel={() => setAdvanceDialog(false)} saveLabel="Record Driver Advance" />
      </form>
    </Modal>}

    {vehicleTypeDialog && <Modal title="Add vehicle type" onClose={() => setVehicleTypeDialog(false)} error={dialogError} busy={saving} dirty={isFormDirty('vehicleType', vehicleTypeDraft)}>
      <form onSubmit={saveVehicleType} className="space-y-4 p-4 sm:p-5">
        <Field label="Vehicle type name *"><input required autoFocus value={vehicleTypeDraft} onChange={event => setVehicleTypeDraft(event.target.value)} className={fieldClass} /></Field>
        <DialogActions saving={saving} onCancel={() => setVehicleTypeDialog(false)} saveLabel="Add Vehicle Type" />
      </form>
    </Modal>}

    {detailHire && <Modal title={`Hire ${detailHire.hire_reference}`} onClose={() => setDetailHire(null)} wide>
      <div className="space-y-4 p-4 sm:p-5">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
          ['Dealer', dealerName(detailHire.dealer_id)], ['Project', detailHire.project_name], ['Site', detailHire.site_name],
          ['Vehicle', `${detailHire.vehicle_type} ${detailHire.registration_number || ''}`], ['Description', detailHire.vehicle_description],
          ['Driver', detailHire.driver_name || '—'], ['Driver phone', detailHire.driver_phone || '—'],
          ['Start', formatDateTime(detailHire.start_at)], ['Expected return', formatDateTime(detailHire.expected_return_at)],
          ['Billing', `${money(detailHire.agreed_rate)} / ${detailHire.billing_method === 'fixed_contract' ? 'contract' : detailHire.billing_method}`],
          ['Initial meter', detailHire.initial_meter_reading ?? '—'], ['Initial engine hours', detailHire.initial_engine_hours ?? '—'],
          ['Advance', money(detailHire.advance_amount)], ['Status', statusForHire(detailHire)], ['Remarks', detailHire.remarks || '—']
        ].map(([label, value]) => <div key={label} className="rounded-lg border border-bp-border bg-white p-3"><dt className="text-[10px] font-semibold uppercase text-bp-muted">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-bp-text">{value}</dd></div>)}</dl>
        <section><h3 className="mb-2 text-xs font-semibold">Documents</h3><AttachmentLinks attachments={detailHire.attachments} /></section>
        {returnByHire.get(detailHire.id) && <section className="rounded-lg bg-bp-background p-3 text-sm"><h3 className="font-semibold">Final return bill</h3><p className="mt-1">{money(returnByHire.get(detailHire.id)!.final_bill)} · {formatDateTime(returnByHire.get(detailHire.id)!.actual_return_at)}</p></section>}
        <section><h3 className="mb-2 text-xs font-semibold">Payments</h3><div className="space-y-1">{payments.filter(payment => payment.hire_ids.includes(detailHire.id)).map(payment => <div key={payment.id} className="flex justify-between gap-3 border-b border-bp-border py-2 text-xs"><span>{payment.payment_date} · {payment.payment_type} · {payment.method}</span><b className="tabular-nums">{money(payment.amount)}</b></div>)}{!payments.some(payment => payment.hire_ids.includes(detailHire.id)) && <p className="text-xs text-bp-muted">No payments are linked to this hire.</p>}</div></section>
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setDetailHire(null)} className={`${buttonClass} border border-bp-border bg-white text-bp-text`}>Close</button>{manager && !returnByHire.has(detailHire.id) && detailHire.status === 'active' && <button type="button" onClick={() => { openHire(detailHire); setDetailHire(null); }} className={`${buttonClass} bg-bp-navy text-white`}>Edit Hire</button>}</div>
      </div>
    </Modal>}
  </div>;
};

const HireTable: React.FC<{
  hires: VehicleHireContractRecord[]; dealers: VehicleDealerRecord[]; statusForHire: (hire: VehicleHireContractRecord) => VehicleHireDisplayStatus;
  returns: VehicleHireReturnRecord[]; payments: VehicleDealerPaymentRecord[]; manager: boolean;
  onView: (hire: VehicleHireContractRecord) => void; onReturn: (hire: VehicleHireContractRecord) => void; onEdit: (hire: VehicleHireContractRecord) => void;
  canDelete: (hire: VehicleHireContractRecord) => boolean;
  onDelete: (hire: VehicleHireContractRecord) => void;
  onCancel: (hire: VehicleHireContractRecord) => void;
}> = ({ hires, dealers, statusForHire, returns, payments, manager, canDelete, onView, onReturn, onEdit, onDelete, onCancel }) => <section className="overflow-hidden rounded-xl border border-bp-border bg-white shadow-xs"><div className="flex items-center justify-between border-b border-bp-border p-4"><h2 className="font-semibold">Hire records</h2><span className="text-xs text-bp-muted">Charges are finalized at return</span></div><div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-xs"><thead className="bg-bp-background text-[10px] uppercase text-bp-muted"><tr>{['Hire', 'Dealer', 'Project / Site', 'Vehicle', 'Period', 'Rate', 'Status', 'Bill / Paid', 'Actions'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-bp-border">{hires.length ? hires.map(hire => { const status = statusForHire(hire); const returned = returns.find(record => record.hire_id === hire.id); const paid = payments.filter(payment => payment.hire_ids.includes(hire.id)).reduce((sum, payment) => sum + signedVehicleDealerPaymentAmount(payment), 0); return <tr key={hire.id} className="hover:bg-bp-background/60"><td className="px-3 py-3 font-semibold">{hire.hire_reference}<span className="block text-[10px] font-normal text-bp-muted">{hire.project_name}</span></td><td className="px-3 py-3">{dealers.find(dealer => dealer.id === hire.dealer_id)?.name || 'Dealer unavailable'}</td><td className="px-3 py-3">{hire.project_name}<span className="block text-[10px] text-bp-muted">{hire.site_name}</span></td><td className="px-3 py-3">{hire.vehicle_type}<span className="block text-[10px] text-bp-muted">{hire.registration_number || hire.vehicle_description}</span></td><td className="px-3 py-3 tabular-nums">{formatDateTime(hire.start_at)}<span className="block text-[10px] text-bp-muted">Expected: {formatDateTime(hire.expected_return_at)}</span></td><td className="px-3 py-3 tabular-nums">{money(hire.agreed_rate)} / {hire.billing_method === 'fixed_contract' ? 'contract' : hire.billing_method}</td><td className="px-3 py-3"><StatusPill value={status} /></td><td className="px-3 py-3 tabular-nums">{returned ? money(returned.final_bill) : 'Not finalized'}<span className="block text-[10px] text-bp-muted">Paid {money(paid)}</span></td><td className="px-3 py-3"><div className="flex flex-wrap gap-1"><button className="rounded border px-2 py-1" onClick={() => onView(hire)}>View</button>{manager && !returned && hire.status === 'active' && <><button className="rounded border px-2 py-1" onClick={() => onReturn(hire)}>Return</button><button className="rounded border px-2 py-1" onClick={() => onEdit(hire)}>Edit</button><button className="rounded border px-2 py-1 text-red-700" onClick={() => onCancel(hire)}>Cancel</button></>}{manager && canDelete(hire) && <button className="rounded border border-red-200 px-2 py-1 text-red-700" onClick={() => onDelete(hire)}>Delete</button>}{manager && !canDelete(hire) && <button disabled title="This hire has dependent return, payment, or fuel records. Cancel it to preserve the audit trail." className="rounded border border-bp-border px-2 py-1 text-bp-muted disabled:cursor-not-allowed">Delete unavailable</button>}</div></td></tr>; }) : <EmptyRow colSpan={9} text="No vehicle hire records match the selected filters." />}</tbody></table></div></section>;

const UpcomingList: React.FC<{ title: string; hires: VehicleHireContractRecord[]; danger?: boolean }> = ({ title, hires, danger = false }) => <section className="rounded-xl border border-bp-border bg-white p-4 shadow-xs"><h3 className={`text-sm font-semibold ${danger ? 'text-red-700' : 'text-bp-text'}`}>{title}</h3>{hires.length ? <ul className="mt-3 divide-y divide-bp-border">{hires.slice(0, 5).map(hire => <li key={hire.id} className="flex justify-between gap-3 py-2 text-xs"><span><b>{hire.hire_reference}</b> · {hire.vehicle_type}<span className="block text-bp-muted">{hire.project_name} · {hire.site_name}</span></span><time className="shrink-0 tabular-nums text-bp-muted">{formatDateTime(hire.expected_return_at)}</time></li>)}</ul> : <p className="mt-3 text-xs text-bp-muted">No records.</p>}</section>;

const StatusPill: React.FC<{ value: string }> = ({ value }) => <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${value === 'Active' ? 'bg-emerald-50 text-emerald-800' : value === 'Return Due' ? 'bg-amber-50 text-amber-800' : value === 'Overdue' || value === 'Cancelled' || value === 'Archived' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}`}>{value}</span>;
const EmptyRow: React.FC<{ colSpan: number; text: string }> = ({ colSpan, text }) => <tr><td colSpan={colSpan} className="px-4 py-12 text-center text-bp-muted">{text}</td></tr>;
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label className="block min-w-0 text-xs font-semibold text-bp-text">{label}{children}</label>;
const DialogActions: React.FC<{ saving: boolean; onCancel: () => void; saveLabel: string }> = ({ saving, onCancel, saveLabel }) => <div className="flex flex-col-reverse gap-2 border-t border-bp-border pt-3 sm:flex-row sm:justify-end"><button type="button" disabled={saving} onClick={onCancel} className={`${buttonClass} border border-bp-border bg-white text-bp-text`}>Cancel</button><button disabled={saving} className={`${buttonClass} bg-bp-navy text-white hover:bg-bp-blue`} type="submit">{saving ? 'Saving…' : saveLabel}</button></div>;
const Modal: React.FC<{
  title: string;
  children: React.ReactNode;
  error?: string | null;
  onClose: () => void;
  wide?: boolean;
  dirty?: boolean;
  busy?: boolean;
}> = ({ title, children, error, onClose, wide, dirty = false, busy = false }) => {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const modalRootRef = useRef<HTMLDivElement>(null);
  const requestClose = () => {
    if (busy) return;
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || busy) return;
      const openModals = document.querySelectorAll('[data-vh-modal-root]');
      if (openModals.item(openModals.length - 1) !== modalRootRef.current) return;
      event.preventDefault();
      if (confirmDiscard) setConfirmDiscard(false);
      else requestClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, confirmDiscard, dirty, onClose]);

  return <>
    <div ref={modalRootRef} data-vh-modal-root className="fixed inset-0 z-[60] flex items-center justify-center bg-bp-navy-deep/60 p-3 backdrop-blur-sm sm:p-5" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) requestClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="vh-modal-title" className={`max-h-[94vh] w-full ${wide ? 'max-w-5xl' : 'max-w-3xl'} overflow-y-auto rounded-2xl border border-bp-border bg-white shadow-2xl`}>
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-bp-border bg-white px-4 py-3 sm:px-5">
          <h2 id="vh-modal-title" className="font-semibold text-bp-text">{title}</h2>
          <button type="button" aria-label="Close dialog" disabled={busy} onClick={requestClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-bp-muted hover:bg-bp-background disabled:opacity-50"><X className="h-5 w-5" /></button>
        </header>
        {error && <div role="alert" className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:mx-5">{error}</div>}
        {children}
      </section>
    </div>
    {confirmDiscard && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-bp-navy-deep/70 p-4" role="alertdialog" aria-modal="true" aria-labelledby="vh-discard-title" aria-describedby="vh-discard-description">
      <section className="w-full max-w-sm rounded-xl border border-bp-border bg-white p-5 shadow-2xl">
        <h3 id="vh-discard-title" className="font-semibold text-bp-text">Discard unsaved changes?</h3>
        <p id="vh-discard-description" className="mt-2 text-sm text-bp-muted">Your entered values and uploaded files will be discarded if you close this form.</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" autoFocus onClick={() => setConfirmDiscard(false)} className="min-h-10 rounded-lg border border-bp-border px-3 text-xs font-semibold text-bp-text">Keep Editing</button>
          <button type="button" onClick={() => { setConfirmDiscard(false); onClose(); }} className="min-h-10 rounded-lg bg-red-700 px-3 text-xs font-semibold text-white">Discard Changes</button>
        </div>
      </section>
    </div>}
  </>;
};

