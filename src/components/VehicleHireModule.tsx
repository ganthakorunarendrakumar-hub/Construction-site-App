import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, CalendarDays, ChevronDown, CircleDollarSign, Clock3, Download, Edit3,
  FileText, Fuel, History, MapPin, Plus, Search, Settings2, Trash2, Truck, X
} from 'lucide-react';
import {
  Project, TransactionAttachments, UserProfile, VehicleAssetRecord,
  VehicleAssetCondition, VehicleFuelType, VehicleHireBillingBasis,
  VehicleHireDateRule, VehicleHireRecord, VehicleMovementRecord,
  VehicleRentalRecord, VehicleWorkingSession
} from '../types';
import { dataService } from '../services/dataService';
import { VehicleHireOperations } from './VehicleHireOperations';
import { getLocalDateString } from '../utils/dateUtils';
import { AttachmentLinks, AttachmentSections, emptyTransactionAttachments } from './AttachmentSections';
import { VEHICLE_TYPES, vehicleCategoryForType } from '../utils/hireCatalog';
import {
  calculateVehicleRental, calculateWorkingSessions, formatIndianRupees,
  formatMinutesAsHours, isDateInsideRange, sumValidVehicleMovementMinutes
} from '../utils/vehicleHire';

interface VehicleHireModuleProps {
  project: Project;
  currentUser: UserProfile;
  onNavigateBack: () => void;
  onNavigateHome: () => void;
  onUploadFile: (file: File) => Promise<{ url: string; name: string; size: number }>;
}

type HireTab = 'vehicles' | 'periods' | 'movements' | 'reports';
type ReportTab = 'vehicle' | 'project' | 'vendor';
type SiteChoice = { id?: string; name: string };
type VehicleAssetDraft = Omit<VehicleAssetRecord, 'company_id' | 'project_name' | 'created_by' | 'created_by_name' | 'created_at' | 'updated_at'>;
type VehicleHireDraft = {
  asset_id: string;
  project_id: string;
  site_id?: string;
  site_name: string;
  in_date: string;
  out_date: string;
  billing_basis: VehicleHireBillingBasis;
  date_rule: VehicleHireDateRule;
  rent_per_month: string;
  rent_per_day: string;
  remarks: string;
  attachments: TransactionAttachments;
};
type VehicleHistoryRow = {
  id: string;
  asset_id?: string;
  vehicle_equipment_id: string;
  vehicle_type: string;
  vendor: string;
  project_id: string;
  project_name: string;
  site_name: string;
  operator_name: string;
  work_date: string;
  sessions: VehicleWorkingSession[];
  total_working_minutes: number;
  idle_minutes: number;
  scheduled_minutes: number;
  idle_reason?: string;
  legacy?: VehicleHireRecord;
  record?: VehicleMovementRecord;
};

const inputClass = 'mt-1 w-full min-h-10 rounded-xl border border-bp-border bg-white px-3 py-2 text-sm text-bp-text outline-none transition focus:border-bp-cyan focus:ring-2 focus:ring-bp-cyan/20 disabled:bg-bp-background disabled:text-bp-muted';
const canManage = (role: UserProfile['role']) => ['admin', 'project_manager', 'site_supervisor'].includes(role);
const newSession = (): VehicleWorkingSession => ({ id: `session-${crypto.randomUUID()}`, start_time: '', stop_time: '', duration_minutes: 0 });
const currency = (value: number) => formatIndianRupees(Number.isFinite(value) ? value : 0);
const textCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const emptyAsset = (project: Project): VehicleAssetDraft => ({
  id: dataService.createVehicleAssetId(),
  vehicle_equipment_id: dataService.createVehicleEquipmentId(),
  vehicle_type: VEHICLE_TYPES[0],
  vehicle_category: vehicleCategoryForType(VEHICLE_TYPES[0]),
  vendor: '',
  model: '',
  fuel_type: 'diesel',
  registration_number: '',
  project_id: project.id,
  site_name: project.location || project.name,
  condition: 'available',
  remarks: ''
});

const assetDraft = (asset: VehicleAssetRecord): VehicleAssetDraft => ({
  id: asset.id,
  vehicle_equipment_id: asset.vehicle_equipment_id,
  vehicle_type: asset.vehicle_type,
  vehicle_category: asset.vehicle_category,
  vendor: asset.vendor,
  model: asset.model,
  fuel_type: asset.fuel_type,
  registration_number: asset.registration_number || '',
  project_id: asset.project_id,
  site_id: asset.site_id,
  site_name: asset.site_name,
  condition: asset.condition,
  remarks: asset.remarks || ''
});

const emptyHire = (project: Project, assetId = ''): VehicleHireDraft => ({
  asset_id: assetId,
  project_id: project.id,
  site_name: project.location || project.name,
  in_date: getLocalDateString(),
  out_date: getLocalDateString(),
  billing_basis: 'daily',
  date_rule: 'inclusive',
  rent_per_month: '',
  rent_per_day: '',
  remarks: '',
  attachments: emptyTransactionAttachments()
});

const hireStatus = (record: VehicleRentalRecord, today: string): 'Upcoming' | 'Currently Hired' | 'Completed' => {
  if (today < record.in_date) return 'Upcoming';
  const within = record.date_rule === 'inclusive' ? today <= record.out_date : today < record.out_date;
  return within ? 'Currently Hired' : 'Completed';
};

const rangesOverlap = (record: VehicleRentalRecord, from?: string, to?: string): boolean =>
  (!from || record.out_date >= from) && (!to || record.in_date <= to);

const VehicleHireLegacyWorkspace: React.FC<VehicleHireModuleProps> = ({
  project: currentProject,
  currentUser,
  onNavigateBack,
  onNavigateHome,
  onUploadFile
}) => {
  const manager = canManage(currentUser.role);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([...VEHICLE_TYPES]);
  const [projects, setProjects] = useState<Project[]>([currentProject]);
  const [projectSites, setProjectSites] = useState<Array<{ project_id: string; id?: string; name: string }>>([]);
  const [assets, setAssets] = useState<VehicleAssetRecord[]>([]);
  const [rentals, setRentals] = useState<VehicleRentalRecord[]>([]);
  const [movements, setMovements] = useState<VehicleMovementRecord[]>([]);
  const [legacyLogs, setLegacyLogs] = useState<VehicleHireRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<HireTab>('vehicles');
  const [reportTab, setReportTab] = useState<ReportTab>('vehicle');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [assetModal, setAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(false);
  const [assetDraftState, setAssetDraftState] = useState<VehicleAssetDraft>(emptyAsset(currentProject));
  const [hireModal, setHireModal] = useState(false);
  const [editingRental, setEditingRental] = useState<VehicleRentalRecord | null>(null);
  const [hireDraft, setHireDraft] = useState<VehicleHireDraft>(emptyHire(currentProject));
  const [movementModal, setMovementModal] = useState(false);
  const [movementAssetId, setMovementAssetId] = useState('');
  const [movementProjectId, setMovementProjectId] = useState(currentProject.id);
  const [movementSite, setMovementSite] = useState<SiteChoice>({ name: currentProject.location || currentProject.name });
  const [movementOperator, setMovementOperator] = useState('');
  const [movementDate, setMovementDate] = useState(getLocalDateString());
  const [sessions, setSessions] = useState<VehicleWorkingSession[]>([newSession(), newSession(), newSession()]);
  const [idleMinutes, setIdleMinutes] = useState('0');
  const [idleReason, setIdleReason] = useState('');
  const [customIdleReason, setCustomIdleReason] = useState('');
  const [movementRemarks, setMovementRemarks] = useState('');
  const [movementKey, setMovementKey] = useState(() => `vehicle-movement-${crypto.randomUUID()}`);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [vehicleTypeModal, setVehicleTypeModal] = useState(false);
  const [vehicleTypeDraft, setVehicleTypeDraft] = useState('');
  const [vehicleTypeError, setVehicleTypeError] = useState<string | null>(null);
  const [savingVehicleType, setSavingVehicleType] = useState(false);
  const [detailAsset, setDetailAsset] = useState<VehicleAssetRecord | null>(null);
  const [detailRental, setDetailRental] = useState<VehicleRentalRecord | null>(null);
  const [detailMovement, setDetailMovement] = useState<VehicleHistoryRow | null>(null);
  const [locationsByProject, setLocationsByProject] = useState<Record<string, Awaited<ReturnType<typeof dataService.getMaterialLocations>>>>({});
  const saveLock = useRef(false);
  const today = getLocalDateString();

  const allowedProjects = useMemo(() => {
    if (currentUser.role !== 'site_supervisor' || !currentUser.assigned_projects?.length) return projects;
    const assigned = new Set(currentUser.assigned_projects);
    return projects.filter(item => assigned.has(item.id));
  }, [currentUser.assigned_projects, currentUser.role, projects]);

  useEffect(() => {
    let current = true;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const foundProjects = await dataService.getProjects();
        const permitted = currentUser.role === 'site_supervisor' && currentUser.assigned_projects?.length
          ? foundProjects.filter(item => currentUser.assigned_projects?.includes(item.id))
          : foundProjects;
        const accessible = permitted.some(item => item.id === currentProject.id) ? permitted : [currentProject, ...permitted];
        const ids = accessible.map(item => item.id);
        const [vehicleAssets, vehicleRentals, vehicleMovements, oldLogs, types] = await Promise.all([
          dataService.getVehicleAssets(ids),
          dataService.getVehicleRentalRecords(ids),
          dataService.getVehicleMovementRecords(ids),
          Promise.all(ids.map(id => dataService.getVehicleHireRecords(id))),
          dataService.getVehicleTypes()
        ]);
        const sites = (await Promise.all(accessible.map(async item => {
          try {
            const locations = await dataService.getMaterialLocations(item.id);
            return [{ project_id: item.id, name: item.location || item.name }, ...locations.map(location => ({ project_id: item.id, id: location.id, name: location.name }))];
          } catch {
            return [{ project_id: item.id, name: item.location || item.name }];
          }
        }))).flat();
        if (!current) return;
        setProjects(accessible);
        setProjectSites(sites);
        setAssets(vehicleAssets);
        setRentals(vehicleRentals);
        setMovements(vehicleMovements);
        setLegacyLogs(oldLogs.flat());
        setVehicleTypes(types);
      } catch (error) {
        if (current) setLoadError(error instanceof Error ? error.message : 'Unable to load vehicle hire records.');
      } finally {
        if (current) setLoading(false);
      }
    };
    void load();
    return () => { current = false; };
  }, [currentProject, currentUser.assigned_projects, currentUser.role]);

  const refresh = async () => {
    setLoadError(null);
    const [vehicleAssets, vehicleRentals, vehicleMovements, oldLogs, types] = await Promise.all([
      dataService.getVehicleAssets(allowedProjects.map(item => item.id)),
      dataService.getVehicleRentalRecords(allowedProjects.map(item => item.id)),
      dataService.getVehicleMovementRecords(allowedProjects.map(item => item.id)),
      Promise.all(allowedProjects.map(item => dataService.getVehicleHireRecords(item.id))),
      dataService.getVehicleTypes()
    ]);
    setAssets(vehicleAssets);
    setRentals(vehicleRentals);
    setMovements(vehicleMovements);
    setLegacyLogs(oldLogs.flat());
    setVehicleTypes(types);
  };

  const assetLocations = locationsByProject[assetDraftState.project_id] || [];
  const hireLocations = locationsByProject[hireDraft.project_id] || [];
  const movementLocations = locationsByProject[movementProjectId] || [];
  useEffect(() => {
    let active = true;
    const ids = [...new Set([
      ...(assetModal || hireModal ? [assetDraftState.project_id] : []),
      ...(hireModal ? [hireDraft.project_id] : []),
      ...(movementModal ? [movementProjectId] : [])
    ])];
    void Promise.all(ids.map(async id => [id, await dataService.getMaterialLocations(id)] as const))
      .then(results => { if (active) setLocationsByProject(current => ({ ...current, ...Object.fromEntries(results) })); })
      .catch(error => { if (active) setFormError(error instanceof Error ? error.message : 'Unable to load project sites.'); });
    return () => { active = false; };
  }, [assetModal, assetDraftState.project_id, hireModal, hireDraft.project_id, movementModal, movementProjectId]);

  const projectForId = (projectId: string) => allowedProjects.find(item => item.id === projectId) || currentProject;
  const inRentalRange = (record: VehicleRentalRecord) => rangesOverlap(record, fromDate || undefined, toDate || undefined);
  const statusForAsset = (asset: VehicleAssetRecord): 'Available' | 'Currently Hired' | 'Maintenance' => {
    if (asset.condition === 'maintenance') return 'Maintenance';
    return rentals.some(item => item.asset_id === asset.id && hireStatus(item, today) === 'Currently Hired')
      ? 'Currently Hired'
      : 'Available';
  };

  const legacyToRows = useMemo<VehicleHistoryRow[]>(() => legacyLogs.map(item => ({
    id: `legacy-${item.id}`,
    vehicle_equipment_id: item.vehicle_identifier,
    vehicle_type: item.vehicle_type,
    vendor: item.vendor,
    project_id: item.project_id,
    project_name: item.project_name,
    site_name: projectForId(item.project_id).location || item.project_name,
    operator_name: item.operator || '—',
    work_date: item.hire_date,
    sessions: [{ id: `legacy-session-${item.id}`, start_time: item.start_time, stop_time: item.stop_time, duration_minutes: Math.round(item.working_hours * 60) }],
    total_working_minutes: Math.round(item.working_hours * 60),
    idle_minutes: item.idle_minutes,
    scheduled_minutes: Math.round(item.working_hours * 60) + item.idle_minutes,
    idle_reason: item.idle_reason,
    legacy: item
  })), [legacyLogs, projects]);

  const movementRows = useMemo<VehicleHistoryRow[]>(() => {
    const newRows = movements.map(item => {
      const asset = assets.find(entry => entry.id === item.asset_id);
      return {
        id: item.id,
        asset_id: item.asset_id,
        vehicle_equipment_id: asset?.vehicle_equipment_id || item.asset_id,
        vehicle_type: asset ? (asset.vehicle_type || 'Vehicle type unavailable') : 'Vehicle not registered',
        vendor: asset?.vendor || '—',
        project_id: item.project_id,
        project_name: item.project_name,
        site_name: item.site_name,
        operator_name: item.operator_name,
        work_date: item.work_date,
        sessions: item.sessions,
        total_working_minutes: item.total_working_minutes,
        idle_minutes: item.idle_minutes,
        scheduled_minutes: item.scheduled_minutes,
        idle_reason: item.idle_reason,
        record: item
      } satisfies VehicleHistoryRow;
    });
    return [...newRows, ...legacyToRows].sort((a, b) => b.work_date.localeCompare(a.work_date));
  }, [assets, legacyToRows, movements]);

  const filterProjectMatch = (projectId: string) => projectFilter === 'all' || projectFilter === projectId;
  const filterVehicle = (asset: VehicleAssetRecord): boolean => {
    const term = query.trim().toLocaleLowerCase();
    const related = rentals.filter(item => item.asset_id === asset.id);
    const relatedMovement = movementRows.filter(item => item.asset_id === asset.id || item.vehicle_equipment_id === asset.vehicle_equipment_id);
    const projectMatches = filterProjectMatch(asset.project_id)
      || related.some(item => filterProjectMatch(item.project_id))
      || relatedMovement.some(item => filterProjectMatch(item.project_id));
    const siteMatches = siteFilter === 'all'
      || asset.site_name === siteFilter
      || related.some(item => item.site_name === siteFilter)
      || relatedMovement.some(item => item.site_name === siteFilter);
    const dateMatches = (!fromDate && !toDate)
      || related.some(inRentalRange)
      || relatedMovement.some(item => isDateInsideRange(item.work_date, fromDate || undefined, toDate || undefined));
    const status = statusForAsset(asset);
    const statusMatches = statusFilter === 'all'
      || status === statusFilter
      || ((statusFilter === 'Completed' || statusFilter === 'Upcoming') && related.some(item => hireStatus(item, today) === statusFilter));
    return projectMatches
      && siteMatches
      && dateMatches
      && (typeFilter === 'all' || asset.vehicle_type === typeFilter)
      && (vendorFilter === 'all' || asset.vendor === vendorFilter)
      && statusMatches
      && (!term || `${asset.vehicle_equipment_id} ${asset.registration_number || ''} ${asset.vehicle_type} ${asset.model} ${asset.vendor} ${asset.site_name} ${asset.project_name}`.toLocaleLowerCase().includes(term));
  };
  const filteredAssets = useMemo(() => assets.filter(filterVehicle), [assets, rentals, movements, legacyToRows, fromDate, toDate, projectFilter, siteFilter, query, statusFilter, typeFilter, vendorFilter, today]);
  const filteredRentals = useMemo(() => rentals.filter(record => {
    const asset = assets.find(item => item.id === record.asset_id);
    const term = query.trim().toLocaleLowerCase();
    const status = hireStatus(record, today);
    return inRentalRange(record)
      && filterProjectMatch(record.project_id)
      && (siteFilter === 'all' || record.site_name === siteFilter)
      && (typeFilter === 'all' || asset?.vehicle_type === typeFilter)
      && (vendorFilter === 'all' || asset?.vendor === vendorFilter)
      && (statusFilter === 'all' || status === statusFilter)
      && (!term || `${asset?.vehicle_equipment_id || ''} ${asset?.registration_number || ''} ${asset?.vehicle_type || ''} ${asset?.model || ''} ${asset?.vendor || ''} ${record.project_name} ${record.site_name}`.toLocaleLowerCase().includes(term));
  }), [rentals, assets, fromDate, toDate, projectFilter, siteFilter, typeFilter, vendorFilter, statusFilter, query, today]);
  const filteredMovementRows = useMemo(() => movementRows.filter(row => {
    const asset = assets.find(item => item.id === row.asset_id);
    const term = query.trim().toLocaleLowerCase();
    return isDateInsideRange(row.work_date, fromDate || undefined, toDate || undefined)
      && filterProjectMatch(row.project_id)
      && (siteFilter === 'all' || row.site_name === siteFilter)
      && (typeFilter === 'all' || row.vehicle_type === typeFilter)
      && (vendorFilter === 'all' || row.vendor === vendorFilter)
      && (statusFilter === 'all'
        || (statusFilter === 'Completed' && row.work_date < today)
        || (statusFilter === 'Upcoming' && row.work_date > today)
        || (statusFilter === 'Maintenance' && asset?.condition === 'maintenance')
        || (statusFilter === 'Currently Hired' && asset !== undefined && statusForAsset(asset) === 'Currently Hired')
        || (statusFilter === 'Available' && asset !== undefined && statusForAsset(asset) === 'Available'))
      && (!term || `${row.vehicle_equipment_id} ${row.vehicle_type} ${row.vendor} ${row.operator_name} ${row.project_name} ${row.site_name}`.toLocaleLowerCase().includes(term));
  }), [movementRows, assets, fromDate, toDate, projectFilter, siteFilter, typeFilter, vendorFilter, statusFilter, query, today]);

  const filteredWorkMinutes = sumValidVehicleMovementMinutes(
    filteredMovementRows.map(item => ({
      id: item.record?.id || item.legacy?.id || item.id,
      workDate: item.work_date,
      totalWorkingMinutes: item.total_working_minutes,
      assetId: item.asset_id,
      sessions: item.sessions.map(session => ({ startTime: session.start_time, stopTime: session.stop_time })),
      legacy: Boolean(item.legacy)
    })),
    new Set(assets.map(asset => asset.id)),
    fromDate || undefined,
    toDate || undefined
  );
  const filteredWorkHours = filteredWorkMinutes / 60;
  const activeAssetCount = new Set(filteredRentals.filter(item => hireStatus(item, today) === 'Currently Hired').map(item => item.asset_id)).size;
  const stats = [
    { label: 'Total Registered Vehicles', value: filteredAssets.length, unit: 'vehicles', icon: Truck },
    { label: 'Currently Hired Vehicles', value: activeAssetCount, unit: 'vehicles', icon: Clock3 },
    { label: 'Available Vehicles', value: filteredAssets.filter(asset => statusForAsset(asset) === 'Available').length, unit: 'vehicles', icon: Settings2 },
    { label: 'Total Hire Cost', value: currency(filteredRentals.reduce((sum, item) => sum + item.estimated_hire_cost, 0)), unit: 'filtered periods', icon: CircleDollarSign },
    { label: 'Total Working Hours', value: filteredWorkHours.toFixed(2), unit: 'hours', icon: History }
  ];

  const vendorOptions = useMemo(() => [...new Set(assets.map(item => item.vendor).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [assets]);
  const siteOptions = useMemo(() => [...new Set([
    ...projectSites.map(item => item.name),
    ...assets.map(item => item.site_name),
    ...rentals.map(item => item.site_name),
    ...movementRows.map(item => item.site_name)
  ].filter(Boolean))].sort((a, b) => a.localeCompare(b)), [projectSites, assets, rentals, movementRows]);
  const changeAssetDraft = (key: keyof VehicleAssetDraft, value: string) => setAssetDraftState(current => ({
    ...current,
    [key]: value,
    ...(key === 'vehicle_type' ? { vehicle_category: vehicleCategoryForType(value) } : {})
  }));
  const changeHireDraft = (key: keyof VehicleHireDraft, value: string | TransactionAttachments | undefined) => setHireDraft(current => ({ ...current, [key]: value }));

  const openRegister = (asset?: VehicleAssetRecord) => {
    setFormError(null);
    setEditingAsset(Boolean(asset));
    setAssetDraftState(asset ? assetDraft(asset) : emptyAsset(currentProject));
    setAssetModal(true);
  };

  const openHire = (asset?: VehicleAssetRecord, rental?: VehicleRentalRecord) => {
    setFormError(null);
    setEditingRental(rental || null);
    const assetRecord = asset || (rental ? assets.find(item => item.id === rental.asset_id) : undefined);
    const draft = assetRecord ? assetDraft(assetRecord) : emptyAsset(currentProject);
    setAssetDraftState(draft);
    setHireDraft({
      ...emptyHire(currentProject, draft.id),
      asset_id: draft.id,
      project_id: rental?.project_id || currentProject.id,
      site_id: rental?.site_id,
      site_name: rental?.site_name || currentProject.location || currentProject.name,
      in_date: rental?.in_date || getLocalDateString(),
      out_date: rental?.out_date || getLocalDateString(),
      billing_basis: rental?.billing_basis || 'daily',
      date_rule: rental?.date_rule || 'inclusive',
      rent_per_month: rental?.rent_per_month === undefined ? '' : String(rental.rent_per_month),
      rent_per_day: rental?.rent_per_day === undefined ? '' : String(rental.rent_per_day),
      remarks: rental?.remarks || '',
      attachments: rental?.attachments || emptyTransactionAttachments()
    });
    setHireModal(true);
  };

  const chooseHireVehicle = (value: string) => {
    if (value === 'new') {
      const fresh = emptyAsset(projectForId(hireDraft.project_id));
      setAssetDraftState(fresh);
      setHireDraft(current => ({ ...current, asset_id: fresh.id }));
      return;
    }
    const selected = assets.find(item => item.id === value);
    if (!selected) return;
    setAssetDraftState(assetDraft(selected));
    setHireDraft(current => ({ ...current, asset_id: selected.id }));
  };

  const saveAsset = async (event: FormEvent) => {
    event.preventDefault();
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setFormError(null);
    try {
      await dataService.saveVehicleAsset({
        ...assetDraftState,
        vehicle_type: assetDraftState.vehicle_type.trim(),
        vehicle_category: vehicleCategoryForType(assetDraftState.vehicle_type)
      });
      await refresh();
      setAssetModal(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save the vehicle.');
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  const saveVehicleType = async (event: FormEvent) => {
    event.preventDefault();
    if (savingVehicleType) return;
    setSavingVehicleType(true);
    setVehicleTypeError(null);
    try {
      const addedType = await dataService.addVehicleType(vehicleTypeDraft);
      setVehicleTypes(current => current.some(type => type.toLocaleLowerCase() === addedType.toLocaleLowerCase())
        ? current
        : [...current, addedType]);
      setAssetDraftState(current => ({
        ...current,
        vehicle_type: addedType,
        vehicle_category: vehicleCategoryForType(addedType)
      }));
      setVehicleTypeDraft('');
      setVehicleTypeModal(false);
    } catch (error) {
      setVehicleTypeError(error instanceof Error ? error.message : 'Unable to save the vehicle type.');
    } finally {
      setSavingVehicleType(false);
    }
  };

  const previewCalculation = useMemo(() => {
    try {
      const daily = hireDraft.rent_per_day === '' ? undefined : Number(hireDraft.rent_per_day);
      const monthly = hireDraft.rent_per_month === '' ? undefined : Number(hireDraft.rent_per_month);
      return calculateVehicleRental({
        inDate: hireDraft.in_date,
        outDate: hireDraft.out_date,
        billingBasis: hireDraft.billing_basis,
        dateRule: hireDraft.date_rule,
        rentPerDay: daily,
        rentPerMonth: monthly
      });
    } catch {
      return null;
    }
  }, [hireDraft.in_date, hireDraft.out_date, hireDraft.billing_basis, hireDraft.date_rule, hireDraft.rent_per_day, hireDraft.rent_per_month]);

  const saveHire = async (event: FormEvent) => {
    event.preventDefault();
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setFormError(null);
    try {
      const selectedRate = hireDraft.billing_basis === 'daily' ? hireDraft.rent_per_day : hireDraft.rent_per_month;
      if (!selectedRate.trim()) throw new Error(`Enter the ${hireDraft.billing_basis} rate used by this rental agreement.`);
      await dataService.saveVehicleHireWithAsset({
        ...assetDraftState,
        vehicle_category: vehicleCategoryForType(assetDraftState.vehicle_type)
      }, {
        id: editingRental?.id,
        asset_id: assetDraftState.id,
        project_id: hireDraft.project_id,
        site_id: hireDraft.site_id,
        site_name: hireDraft.site_name,
        in_date: hireDraft.in_date,
        out_date: hireDraft.out_date,
        billing_basis: hireDraft.billing_basis,
        date_rule: hireDraft.date_rule,
        rent_per_day: hireDraft.rent_per_day === '' ? undefined : Number(hireDraft.rent_per_day),
        rent_per_month: hireDraft.rent_per_month === '' ? undefined : Number(hireDraft.rent_per_month),
        remarks: hireDraft.remarks,
        attachments: hireDraft.attachments
      });
      await refresh();
      setHireModal(false);
      setEditingRental(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save the hire period.');
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  const movementCalculation = useMemo(() => {
    try {
      return calculateWorkingSessions(sessions.map(session => ({ startTime: session.start_time, stopTime: session.stop_time })));
    } catch {
      return null;
    }
  }, [sessions]);

  const openMovement = (asset?: VehicleAssetRecord) => {
    const chosen = asset || assets.find(item => item.condition === 'available') || assets[0];
    setMovementAssetId(chosen?.id || '');
    setMovementProjectId(currentProject.id);
    setMovementSite({ name: currentProject.location || currentProject.name });
    setMovementOperator('');
    setMovementDate(getLocalDateString());
    setSessions([newSession(), newSession(), newSession()]);
    setIdleMinutes('0');
    setIdleReason('');
    setCustomIdleReason('');
    setMovementRemarks('');
    setMovementKey(`vehicle-movement-${crypto.randomUUID()}`);
    setFormError(null);
    setMovementModal(true);
  };

  const saveMovement = async (event: FormEvent) => {
    event.preventDefault();
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setFormError(null);
    try {
      if (!movementAssetId) throw new Error('Register a vehicle before adding movement hours.');
      if (!movementOperator.trim()) throw new Error('Operator Name is required.');
      const parsedIdle = Number(idleMinutes);
      if (!Number.isInteger(parsedIdle) || parsedIdle < 0) throw new Error('Idle time must be a non-negative whole number of minutes.');
      const reason = idleReason === 'Other' ? customIdleReason.trim() : idleReason;
      await dataService.recordVehicleMovement({
        asset_id: movementAssetId,
        project_id: movementProjectId,
        site_id: movementSite.id,
        site_name: movementSite.name,
        operator_name: movementOperator,
        work_date: movementDate,
        sessions: sessions.map(session => ({ id: session.id, start_time: session.start_time, stop_time: session.stop_time })),
        idle_minutes: parsedIdle,
        idle_reason: reason || undefined,
        remarks: movementRemarks,
        idempotency_key: movementKey
      });
      await refresh();
      setMovementModal(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to record vehicle movement.');
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  const removeAsset = async (asset: VehicleAssetRecord) => {
    if (!window.confirm(`Delete vehicle ${asset.vehicle_equipment_id}? Vehicles with rental or movement history are retained for the audit trail.`)) return;
    try {
      await dataService.deleteVehicleAsset(asset.id);
      await refresh();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to delete this vehicle.');
    }
  };
  const removeRental = async (rental: VehicleRentalRecord) => {
    if (!window.confirm('Delete this hire period? This does not delete the vehicle or its movement history.')) return;
    try {
      await dataService.deleteVehicleRentalRecord(rental.id);
      await refresh();
      setDetailRental(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to delete this hire period.');
    }
  };
  const removeMovement = async (row: VehicleHistoryRow) => {
    if (!row.record) return;
    if (!window.confirm('Delete this vehicle movement record?')) return;
    try {
      await dataService.deleteVehicleMovementRecord(row.record.id);
      await refresh();
      setDetailMovement(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to delete this movement.');
    }
  };

  const exportCsv = (rows: unknown[][], name: string) => {
    const content = rows.map(row => row.map(textCsv).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportCurrent = () => {
    if (activeTab === 'vehicles') {
      exportCsv([
        ['Vehicle ID', 'Vehicle Type', 'Model', 'Vendor', 'Registration Number', 'Fuel Type', 'Registered Project', 'Site', 'Status'],
        ...filteredAssets.map(asset => [asset.vehicle_equipment_id, asset.vehicle_type, asset.model, asset.vendor, asset.registration_number, asset.fuel_type, asset.project_name, asset.site_name, statusForAsset(asset)])
      ], 'vehicle-fleet.csv');
    } else if (activeTab === 'periods') {
      exportCsv([
        ['Vehicle ID', 'Vehicle Type', 'Model', 'Vendor', 'Project', 'Site', 'In Date', 'Out Date', 'Date Rule', 'Billing Basis', 'Billable Days', 'Rent / Month', 'Rent / Day', 'Estimated Hire Cost'],
        ...filteredRentals.map(record => {
          const asset = assets.find(item => item.id === record.asset_id);
          return [asset?.vehicle_equipment_id, asset?.vehicle_type, asset?.model, asset?.vendor, record.project_name, record.site_name, record.in_date, record.out_date, record.date_rule, record.billing_basis, record.billable_days, record.rent_per_month, record.rent_per_day, record.estimated_hire_cost];
        })
      ], 'vehicle-hire-periods.csv');
    } else if (activeTab === 'movements') {
      exportCsv([
        ['Vehicle ID', 'Vehicle Type', 'Vendor', 'Project', 'Site', 'Operator', 'Date', 'Sessions', 'Working Hours', 'Idle Hours', 'Scheduled Hours', 'Idle Reason'],
        ...filteredMovementRows.map(row => [row.vehicle_equipment_id, row.vehicle_type, row.vendor, row.project_name, row.site_name, row.operator_name, row.work_date, row.sessions.map(session => `${session.start_time}-${session.stop_time}`).join('; '), (row.total_working_minutes / 60).toFixed(2), (row.idle_minutes / 60).toFixed(2), (row.scheduled_minutes / 60).toFixed(2), row.idle_reason])
      ], 'vehicle-movement-hours.csv');
    } else {
      exportReportCsv();
    }
  };

  const reportRows = useMemo(() => {
    if (reportTab === 'vehicle') {
      const registeredRows = filteredAssets.map(asset => {
        const hireRows = filteredRentals.filter(item => item.asset_id === asset.id);
        const workRows = filteredMovementRows.filter(item => item.asset_id === asset.id || item.vehicle_equipment_id === asset.vehicle_equipment_id || item.vehicle_equipment_id === asset.registration_number);
        return {
        key: asset.id,
        name: `${asset.vehicle_type} · ${asset.model}`,
        detail: `${asset.vehicle_equipment_id}${asset.registration_number ? ` · ${asset.registration_number}` : ''}`,
        vendor: asset.vendor,
        project: [...new Set(hireRows.map(item => item.project_name))].join(', ') || asset.project_name,
        period: hireRows.length ? `${hireRows.length} hire period${hireRows.length === 1 ? '' : 's'} · ${hireRows.reduce((sum, item) => sum + item.billable_days, 0)} days` : 'No hire period in range',
        hours: workRows.reduce((sum, item) => sum + item.total_working_minutes, 0) / 60,
        idle: workRows.reduce((sum, item) => sum + item.idle_minutes, 0) / 60,
        cost: hireRows.reduce((sum, item) => sum + item.estimated_hire_cost, 0)
      };
      });
      const unmatchedLegacy = filteredMovementRows.filter(row => row.legacy && !filteredAssets.some(asset =>
        asset.vehicle_equipment_id === row.vehicle_equipment_id || asset.registration_number === row.vehicle_equipment_id
      ));
      const legacyIdentifiers = [...new Set(unmatchedLegacy.map(row => `${row.vehicle_equipment_id}\u0000${row.vendor}`))];
      const legacyRows = legacyIdentifiers.map(identifier => {
        const workRows = unmatchedLegacy.filter(row => `${row.vehicle_equipment_id}\u0000${row.vendor}` === identifier);
        const first = workRows[0];
        return {
          key: `legacy-${identifier}`,
          name: `${first.vehicle_type} · legacy vehicle`,
          detail: first.vehicle_equipment_id,
          vendor: first.vendor,
          project: [...new Set(workRows.map(row => row.project_name))].join(', '),
          period: `${workRows.length} legacy work log${workRows.length === 1 ? '' : 's'}`,
          hours: workRows.reduce((sum, row) => sum + row.total_working_minutes, 0) / 60,
          idle: workRows.reduce((sum, row) => sum + row.idle_minutes, 0) / 60,
          cost: 0
        };
      });
      return [...registeredRows, ...legacyRows];
    }

    const dimensions = reportTab === 'project'
      ? [...new Set([...filteredRentals.map(item => item.project_id), ...filteredMovementRows.map(item => item.project_id)])]
      : [...new Set([...assets.map(item => item.vendor), ...filteredMovementRows.map(item => item.vendor)].filter(vendor => vendor && (vendorFilter === 'all' || vendor === vendorFilter)))];
    return dimensions.map((dimension, index) => {
      const matchingRentals = reportTab === 'project'
        ? filteredRentals.filter(item => item.project_id === dimension)
        : filteredRentals.filter(item => assets.find(asset => asset.id === item.asset_id)?.vendor === dimension);
      const matchingWork = reportTab === 'project'
        ? filteredMovementRows.filter(item => item.project_id === dimension)
        : filteredMovementRows.filter(item => item.vendor === dimension);
      const projectName = projects.find(item => item.id === dimension)?.name;
      const matchedAssets = reportTab === 'project'
        ? filteredAssets.filter(item => item.project_id === dimension || matchingRentals.some(rental => rental.asset_id === item.id))
        : filteredAssets.filter(item => item.vendor === dimension);
      return {
        key: `${reportTab}-${String(dimension)}-${index}`,
        name: reportTab === 'project' ? projectName || matchingRentals[0]?.project_name || 'Project' : String(dimension),
        detail: `${new Set([...matchingRentals.map(item => item.asset_id), ...matchingWork.map(item => item.vehicle_equipment_id)]).size || matchedAssets.length} vehicle(s)`,
        vendor: reportTab === 'project' ? '—' : String(dimension),
        project: reportTab === 'project' ? projectName || matchingRentals[0]?.project_name || 'Project' : [...new Set(matchingRentals.map(item => item.project_name))].join(', '),
        period: `${matchingRentals.length} hire period${matchingRentals.length === 1 ? '' : 's'}`,
        hours: matchingWork.reduce((sum, item) => sum + item.total_working_minutes, 0) / 60,
        idle: matchingWork.reduce((sum, item) => sum + item.idle_minutes, 0) / 60,
        cost: matchingRentals.reduce((sum, item) => sum + item.estimated_hire_cost, 0)
      };
    });
  }, [reportTab, filteredAssets, filteredRentals, filteredMovementRows, assets, projects, vendorFilter]);

  const exportReportCsv = () => exportCsv([
    [reportTab === 'vehicle' ? 'Vehicle' : reportTab === 'project' ? 'Project' : 'Vendor', 'Details', 'Vendor', 'Project(s)', 'Hire Periods / Days', 'Working Hours', 'Idle Hours', 'Hire Cost (INR)'],
    ...reportRows.map(row => [row.name, row.detail, row.vendor, row.project, row.period, row.hours.toFixed(2), row.idle.toFixed(2), row.cost.toFixed(2)])
  ], `vehicle-${reportTab}-report.csv`);

  const changeSession = (sessionId: string, key: 'start_time' | 'stop_time', value: string) => setSessions(current => current.map(session => session.id === sessionId ? { ...session, [key]: value } : session));
  const totalWorkingPreview = movementCalculation?.reduce((sum, item) => sum + item.durationMinutes, 0) || 0;
  const parsedIdleMinutes = Number(idleMinutes);

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-bp-muted">
        <button type="button" onClick={onNavigateHome} className="hover:text-bp-text">Company Home</button><span>/</span>
        <button type="button" onClick={onNavigateBack} className="hover:text-bp-text">{currentProject.name}</button><span>/</span>
        <span className="font-semibold text-bp-text">Vehicle Hire</span>
      </nav>

      <header className="flex flex-col gap-3 rounded-2xl border border-bp-border bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-bp-cyan-soft text-bp-navy"><Truck className="h-5 w-5" /></span>
          <div><h1 className="text-xl font-bold tracking-tight text-bp-text sm:text-2xl">Vehicle Hire</h1><p className="mt-0.5 text-xs text-bp-muted">Registered fleet, historic hire periods and movement hours</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportCurrent} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-bp-border bg-white px-3 text-xs font-semibold text-bp-text hover:bg-bp-background"><Download className="h-4 w-4" />Export CSV</button>
          {manager && <>
            <button type="button" onClick={() => openRegister()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-bp-border bg-white px-3 text-xs font-semibold text-bp-text hover:bg-bp-background"><Plus className="h-4 w-4" />Register Vehicle</button>
            <button type="button" onClick={() => openHire()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-bp-navy px-3.5 text-xs font-bold text-white shadow-xs transition hover:bg-bp-blue"><CircleDollarSign className="h-4 w-4" />Add Vehicle Hire</button>
            <button type="button" onClick={() => openMovement()} disabled={!assets.length} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-bp-cyan px-3.5 text-xs font-bold text-bp-text shadow-xs transition hover:bg-bp-cyan/80 disabled:cursor-not-allowed disabled:opacity-50"><Clock3 className="h-4 w-4" />Record Movement</button>
          </>}
        </div>
      </header>

      {loadError && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{loadError}<button type="button" onClick={() => { void refresh().catch(error => setLoadError(error.message)); }} className="ml-auto font-semibold underline">Retry</button></div>}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {stats.map((item, index) => {
          const Icon = item.icon;
          return <article key={item.label} className={`${index === 0 ? 'border-bp-navy bg-bp-navy text-white' : 'border-bp-border bg-white text-bp-text'} min-w-0 rounded-2xl border p-4 shadow-xs`}>
            <div className="flex items-start justify-between gap-2"><p className={`${index === 0 ? 'text-slate-200' : 'text-bp-muted'} text-xs font-medium leading-4`}>{item.label}</p><Icon className={`${index === 0 ? 'text-bp-cyan' : 'text-bp-blue'} h-4 w-4 shrink-0`} /></div>
            <div className="mt-2 truncate text-xl font-bold tabular-nums sm:text-2xl" title={String(item.value)}>{item.value}</div>
            <p className={`${index === 0 ? 'text-slate-300' : 'text-bp-muted'} mt-1 text-[10px]`}>{item.unit}</p>
          </article>;
        })}
      </section>

      <section aria-label="Vehicle filters" className="grid grid-cols-1 gap-2 rounded-2xl border border-bp-border bg-white p-3 shadow-xs sm:grid-cols-2 xl:grid-cols-8">
        <label className="relative sm:col-span-2 xl:col-span-2"><span className="sr-only">Search vehicles</span><Search className="absolute left-3 top-3 h-4 w-4 text-bp-muted" /><input value={query} onChange={event => setQuery(event.target.value)} className={`${inputClass} pl-9`} /></label>
        <label><span className="sr-only">Filter vehicle type</span><select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} className={inputClass}><option value="all">All vehicle types</option>{vehicleTypes.map(type => <option key={type}>{type}</option>)}</select></label>
        <label><span className="sr-only">Filter project</span><select value={projectFilter} onChange={event => setProjectFilter(event.target.value)} className={inputClass}><option value="all">All projects</option>{allowedProjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span className="sr-only">Filter site</span><select value={siteFilter} onChange={event => setSiteFilter(event.target.value)} className={inputClass}><option value="all">All sites</option>{siteOptions.map(site => <option key={site}>{site}</option>)}</select></label>
        <label><span className="sr-only">Filter vendor</span><select value={vendorFilter} onChange={event => setVendorFilter(event.target.value)} className={inputClass}><option value="all">All vendors</option>{vendorOptions.map(vendor => <option key={vendor}>{vendor}</option>)}</select></label>
        <label><span className="sr-only">Filter hire status</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className={inputClass}><option value="all">All statuses</option><option>Available</option><option>Currently Hired</option><option>Completed</option><option>Maintenance</option><option>Upcoming</option></select></label>
        <div className="grid grid-cols-2 gap-2 xl:col-span-1"><label><span className="sr-only">From date</span><input aria-label="From date" type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} className={inputClass} /></label><label><span className="sr-only">To date</span><input aria-label="To date" type="date" value={toDate} onChange={event => setToDate(event.target.value)} className={inputClass} /></label></div>
      </section>
      {fromDate && toDate && fromDate > toDate && <p role="alert" className="-mt-3 text-xs text-red-700">From Date must be on or before To Date.</p>}

      <nav aria-label="Vehicle hire sections" className="flex gap-5 overflow-x-auto border-b border-bp-border">
        {([
          ['vehicles', `Vehicles (${filteredAssets.length})`],
          ['periods', `Hire Periods (${filteredRentals.length})`],
          ['movements', `Movement & Hours (${filteredMovementRows.length})`],
          ['reports', 'Reports']
        ] as Array<[HireTab, string]>).map(([tab, label]) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`${activeTab === tab ? 'border-b-2 border-bp-cyan text-bp-text' : 'border-b-2 border-transparent text-bp-muted'} min-h-11 whitespace-nowrap pb-2 text-xs font-semibold`}>{label}</button>)}
      </nav>

      {loading ? <div className="rounded-2xl border border-bp-border bg-white p-10 text-center text-sm text-bp-muted">Loading vehicle records…</div> : <>
        {activeTab === 'vehicles' && <VehicleTable assets={filteredAssets} statusForAsset={statusForAsset} manager={manager} onView={setDetailAsset} onHire={openHire} onMovement={openMovement} onEdit={openRegister} onDelete={removeAsset} />}
        {activeTab === 'periods' && <HirePeriodsTable records={filteredRentals} assets={assets} manager={manager} onView={setDetailRental} onEdit={(record) => openHire(assets.find(item => item.id === record.asset_id), record)} onDelete={removeRental} />}
        {activeTab === 'movements' && <MovementTable rows={filteredMovementRows} manager={manager} onView={setDetailMovement} onDelete={removeMovement} />}
        {activeTab === 'reports' && <ReportsPanel reportTab={reportTab} setReportTab={setReportTab} rows={reportRows} onExport={exportReportCsv} fromDate={fromDate} toDate={toDate} />}
      </>}

      {assetModal && <VehicleAssetModal
        open editing={editingAsset} value={assetDraftState} projects={allowedProjects} locations={assetLocations} vehicleTypes={vehicleTypes}
        canAddVehicleType={manager} onAddVehicleType={() => { setVehicleTypeDraft(''); setVehicleTypeError(null); setVehicleTypeModal(true); }}
        loading={saving} error={formError} onChange={setAssetDraftState} onSave={saveAsset} onClose={() => setAssetModal(false)}
      />}
      {hireModal && <VehicleHireModal
        value={hireDraft} asset={assetDraftState} assets={assets} projects={allowedProjects} locations={hireLocations} assetLocations={assetLocations} vehicleTypes={vehicleTypes}
        editing={editingRental} preview={previewCalculation} loading={saving} error={formError}
        canAddVehicleType={manager} onAddVehicleType={() => { setVehicleTypeDraft(''); setVehicleTypeError(null); setVehicleTypeModal(true); }}
        onChangeHire={changeHireDraft} onChangeAsset={setAssetDraftState} onChooseAsset={chooseHireVehicle}
        onSave={saveHire} onClose={() => { if (!saving) setHireModal(false); }} onUploadFile={onUploadFile}
      />}
      {vehicleTypeModal && <VehicleTypeModal
        value={vehicleTypeDraft} error={vehicleTypeError} saving={savingVehicleType}
        onChange={setVehicleTypeDraft} onSave={saveVehicleType}
        onClose={() => { if (!savingVehicleType) { setVehicleTypeModal(false); setVehicleTypeDraft(''); setVehicleTypeError(null); } }}
      />}
      {movementModal && <VehicleMovementModal
        assets={assets} projects={allowedProjects} locations={movementLocations} assetId={movementAssetId}
        projectId={movementProjectId} site={movementSite} operator={movementOperator} date={movementDate}
        sessions={sessions} idleMinutes={idleMinutes} idleReason={idleReason} customIdleReason={customIdleReason}
        remarks={movementRemarks} calculation={movementCalculation} totalWorking={totalWorkingPreview}
        parsedIdle={parsedIdleMinutes} error={formError} saving={saving}
        onAsset={setMovementAssetId} onProject={setMovementProjectId} onSite={setMovementSite}
        onOperator={setMovementOperator} onDate={setMovementDate} onSession={changeSession}
        onAddSession={() => setSessions(current => [...current, newSession()])}
        onRemoveSession={id => setSessions(current => current.length > 1 ? current.filter(item => item.id !== id) : current)}
        onIdle={setIdleMinutes} onIdleReason={setIdleReason} onCustomIdleReason={setCustomIdleReason}
        onRemarks={setMovementRemarks} onSave={saveMovement} onClose={() => { if (!saving) setMovementModal(false); }}
      />}

      {detailAsset && <AssetDetailsModal asset={detailAsset} rentals={rentals.filter(item => item.asset_id === detailAsset.id)} movements={movementRows.filter(item => item.asset_id === detailAsset.id || item.vehicle_equipment_id === detailAsset.vehicle_equipment_id)} status={statusForAsset(detailAsset)} manager={manager} onClose={() => setDetailAsset(null)} onEdit={() => { openRegister(detailAsset); setDetailAsset(null); }} onHire={() => { openHire(detailAsset); setDetailAsset(null); }} />}
      {detailRental && <RentalDetailsModal record={detailRental} asset={assets.find(item => item.id === detailRental.asset_id)} manager={manager} onClose={() => setDetailRental(null)} onEdit={() => { openHire(assets.find(item => item.id === detailRental.asset_id), detailRental); setDetailRental(null); }} onDelete={() => void removeRental(detailRental)} />}
      {detailMovement && <MovementDetailsModal row={detailMovement} manager={manager} onClose={() => setDetailMovement(null)} onDelete={() => void removeMovement(detailMovement)} />}
    </div>
  );
};

export const VehicleHireModule: React.FC<VehicleHireModuleProps> = props => {
  const [showLegacy, setShowLegacy] = useState(false);
  if (showLegacy) {
    return <div className="space-y-3">
      <button type="button" onClick={() => setShowLegacy(false)} className="min-h-10 rounded-lg border border-bp-border bg-white px-3 text-xs font-semibold text-bp-text hover:bg-bp-background">
        ← Back to Vehicle Hire
      </button>
      <VehicleHireLegacyWorkspace {...props} />
    </div>;
  }
  return <VehicleHireOperations
    currentProject={props.project}
    currentUser={props.currentUser}
    onNavigateBack={props.onNavigateBack}
    onNavigateHome={props.onNavigateHome}
    onShowLegacy={() => setShowLegacy(true)}
    onUploadFile={props.onUploadFile}
  />;
};

interface VehicleTableProps {
  assets: VehicleAssetRecord[];
  statusForAsset: (asset: VehicleAssetRecord) => string;
  manager: boolean;
  onView: (asset: VehicleAssetRecord) => void;
  onHire: (asset: VehicleAssetRecord) => void;
  onMovement: (asset: VehicleAssetRecord) => void;
  onEdit: (asset: VehicleAssetRecord) => void;
  onDelete: (asset: VehicleAssetRecord) => void;
}

const VehicleTable: React.FC<VehicleTableProps> = ({ assets, statusForAsset, manager, onView, onHire, onMovement, onEdit, onDelete }) => <div className="overflow-hidden rounded-2xl border border-bp-border bg-white shadow-xs"><div className="overflow-x-auto"><table className="min-w-[880px] w-full border-collapse text-left text-xs"><thead><tr className="border-b border-bp-border bg-bp-background text-[10px] font-semibold uppercase tracking-wider text-bp-muted"><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">ID / Registration</th><th className="px-4 py-3">Vendor</th><th className="px-4 py-3">Project / Site</th><th className="px-4 py-3">Fuel</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-bp-border">{assets.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-bp-muted">No registered vehicles match these filters.</td></tr> : assets.map(asset => <tr key={asset.id} className="transition-colors hover:bg-bp-background/70"><td className="px-4 py-3"><span className="font-semibold text-bp-text">{asset.vehicle_type}</span><span className="mt-0.5 block text-[11px] text-bp-muted">{asset.model}</span></td><td className="px-4 py-3 tabular-nums"><span className="font-semibold text-bp-text">{asset.vehicle_equipment_id}</span><span className="mt-0.5 block text-[11px] text-bp-muted">{asset.registration_number || 'No registration number'}</span></td><td className="px-4 py-3">{asset.vendor}</td><td className="px-4 py-3"><span className="font-medium">{asset.project_name}</span><span className="mt-0.5 block text-[11px] text-bp-muted">{asset.site_name}</span></td><td className="px-4 py-3 capitalize">{asset.fuel_type}</td><td className="px-4 py-3"><StatusBadge status={statusForAsset(asset)} /></td><td className="px-4 py-3"><div className="flex justify-end gap-1"><SmallAction onClick={() => onView(asset)} label="View vehicle" icon={<FileText className="h-3.5 w-3.5" />} />{manager && <><SmallAction onClick={() => onEdit(asset)} label="Edit vehicle" icon={<Edit3 className="h-3.5 w-3.5" />} /><SmallAction onClick={() => onHire(asset)} label="Add hire period" icon={<CircleDollarSign className="h-3.5 w-3.5" />} /><SmallAction onClick={() => onMovement(asset)} label="Record movement" icon={<Clock3 className="h-3.5 w-3.5" />} /><SmallAction onClick={() => onDelete(asset)} label="Delete vehicle" icon={<Trash2 className="h-3.5 w-3.5" />} /></>}</div></td></tr>)}</tbody></table></div></div>;

interface HirePeriodsTableProps {
  records: VehicleRentalRecord[];
  assets: VehicleAssetRecord[];
  manager: boolean;
  onView: (record: VehicleRentalRecord) => void;
  onEdit: (record: VehicleRentalRecord) => void;
  onDelete: (record: VehicleRentalRecord) => void;
}

const HirePeriodsTable: React.FC<HirePeriodsTableProps> = ({ records, assets, manager, onView, onEdit, onDelete }) => <div className="overflow-hidden rounded-2xl border border-bp-border bg-white shadow-xs"><div className="overflow-x-auto"><table className="min-w-[1000px] w-full border-collapse text-left text-xs"><thead><tr className="border-b border-bp-border bg-bp-background text-[10px] font-semibold uppercase tracking-wider text-bp-muted"><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Vendor</th><th className="px-4 py-3">Project / Site</th><th className="px-4 py-3">Rental Period</th><th className="px-4 py-3 text-right">Billable Days</th><th className="px-4 py-3">Billing Basis</th><th className="px-4 py-3 text-right">Estimated Cost</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-bp-border">{records.length === 0 ? <tr><td colSpan={9} className="px-4 py-12 text-center text-bp-muted">No hire periods match these filters.</td></tr> : records.map(record => { const asset = assets.find(item => item.id === record.asset_id); const status = hireStatus(record, getLocalDateString()); return <tr key={record.id} className="transition-colors hover:bg-bp-background/70"><td className="px-4 py-3"><span className="font-semibold">{asset?.vehicle_type || 'Vehicle'}</span><span className="mt-0.5 block text-[11px] text-bp-muted">{asset?.vehicle_equipment_id || record.asset_id}</span></td><td className="px-4 py-3">{asset?.vendor || '—'}</td><td className="px-4 py-3">{record.project_name}<span className="mt-0.5 block text-[11px] text-bp-muted">{record.site_name}</span></td><td className="px-4 py-3 tabular-nums">{record.in_date} – {record.out_date}<span className="mt-0.5 block text-[10px] text-bp-muted">Out date {record.date_rule}</span></td><td className="px-4 py-3 text-right font-semibold tabular-nums">{record.billable_days}</td><td className="px-4 py-3 capitalize">{record.billing_basis}<span className="mt-0.5 block text-[10px] text-bp-muted">{record.billing_basis === 'daily' ? currency(record.rent_per_day || 0) + ' / day' : currency(record.rent_per_month || 0) + ' / month'}</span></td><td className="px-4 py-3 text-right font-semibold tabular-nums">{currency(record.estimated_hire_cost)}</td><td className="px-4 py-3"><StatusBadge status={status} /></td><td className="px-4 py-3"><div className="flex justify-end gap-1"><SmallAction onClick={() => onView(record)} label="View hire details" icon={<FileText className="h-3.5 w-3.5" />} />{manager && <><SmallAction onClick={() => onEdit(record)} label="Edit hire period" icon={<Edit3 className="h-3.5 w-3.5" />} /><SmallAction onClick={() => onDelete(record)} label="Delete hire period" icon={<Trash2 className="h-3.5 w-3.5" />} /></>}</div></td></tr>; })}</tbody></table></div></div>;

const MovementTable: React.FC<{ rows: VehicleHistoryRow[]; manager: boolean; onView: (row: VehicleHistoryRow) => void; onDelete: (row: VehicleHistoryRow) => void }> = ({ rows, manager, onView, onDelete }) => <div className="overflow-hidden rounded-2xl border border-bp-border bg-white shadow-xs"><div className="overflow-x-auto"><table className="min-w-[1000px] w-full border-collapse text-left text-xs"><thead><tr className="border-b border-bp-border bg-bp-background text-[10px] font-semibold uppercase tracking-wider text-bp-muted"><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Date / Site</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Operator</th><th className="px-4 py-3">Sessions</th><th className="px-4 py-3 text-right">Working</th><th className="px-4 py-3 text-right">Idle</th><th className="px-4 py-3 text-right">Scheduled</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-bp-border">{rows.length === 0 ? <tr><td colSpan={9} className="px-4 py-12 text-center text-bp-muted">No movement or working-hour records match these filters.</td></tr> : rows.map(row => <tr key={row.id} className="transition-colors hover:bg-bp-background/70"><td className="px-4 py-3"><span className="font-semibold">{row.vehicle_type}</span><span className="mt-0.5 block text-[11px] text-bp-muted">{row.vehicle_equipment_id}{row.legacy ? ' · legacy log' : ''}</span></td><td className="px-4 py-3 tabular-nums">{row.work_date}<span className="mt-0.5 block text-[11px] text-bp-muted">{row.site_name}</span></td><td className="px-4 py-3">{row.project_name}</td><td className="px-4 py-3">{row.operator_name}</td><td className="max-w-[220px] px-4 py-3">{row.sessions.map(session => `${session.start_time}–${session.stop_time}`).join(', ')}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{formatMinutesAsHours(row.total_working_minutes)}</td><td className="px-4 py-3 text-right tabular-nums">{formatMinutesAsHours(row.idle_minutes)}</td><td className="px-4 py-3 text-right tabular-nums">{formatMinutesAsHours(row.scheduled_minutes)}</td><td className="px-4 py-3"><div className="flex justify-end gap-1"><SmallAction onClick={() => onView(row)} label="View movement" icon={<FileText className="h-3.5 w-3.5" />} />{manager && !row.legacy && <SmallAction onClick={() => onDelete(row)} label="Delete movement" icon={<Trash2 className="h-3.5 w-3.5" />} />}</div></td></tr>)}</tbody></table></div></div>;

const StatusBadge: React.FC<{ status: string }> = ({ status }) => <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold ${status === 'Available' ? 'bg-emerald-50 text-emerald-800' : status === 'Currently Hired' ? 'bg-amber-50 text-amber-800' : status === 'Maintenance' ? 'bg-red-50 text-red-700' : status === 'Completed' ? 'bg-slate-100 text-slate-700' : 'bg-blue-50 text-blue-800'}`}>{status}</span>;

const SmallAction: React.FC<{ onClick: () => void; label: string; icon: React.ReactNode; disabled?: boolean }> = ({ onClick, label, icon, disabled = false }) => <button type="button" onClick={onClick} disabled={disabled} title={label} aria-label={label} className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-bp-muted transition hover:border-bp-border hover:bg-white hover:text-bp-blue disabled:cursor-not-allowed disabled:opacity-40">{icon}</button>;

const ModalShell: React.FC<{ title: string; subtitle?: string; error?: string | null; busy?: boolean; onClose: () => void; children: React.ReactNode; wide?: boolean; layerClassName?: string }> = ({ title, subtitle, error, busy = false, onClose, children, wide = false, layerClassName = 'z-50' }) => <div className={`fixed inset-0 ${layerClassName} flex items-center justify-center bg-bp-navy-deep/60 p-3 backdrop-blur-[2px] sm:p-5`}><section aria-busy={busy} className={`${wide ? 'max-w-4xl' : 'max-w-2xl'} max-h-[94vh] w-full overflow-y-auto rounded-2xl border border-bp-border bg-white shadow-2xl`}><header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-bp-border bg-white px-4 py-4 sm:px-6"><div><h2 className="text-base font-bold text-bp-text sm:text-lg">{title}</h2>{subtitle && <p className="mt-1 text-xs text-bp-muted">{subtitle}</p>}</div><button type="button" aria-label="Close dialog" data-bp-dismiss onClick={onClose} disabled={busy} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-bp-muted hover:bg-bp-background disabled:opacity-50"><X className="h-5 w-5" /></button></header>{error && <div role="alert" className="mx-4 mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:mx-6"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}{children}</section></div>;

const VehicleAssetFields: React.FC<{ value: VehicleAssetDraft; projects: Project[]; locations: Array<{ id: string; name: string }>; vehicleTypes: string[]; canAddVehicleType: boolean; onAddVehicleType: () => void; onChange: (value: VehicleAssetDraft) => void; disabled?: boolean }> = ({ value, projects, locations, vehicleTypes, canAddVehicleType, onAddVehicleType, onChange, disabled = false }) => {
  const currentProject = projects.find(item => item.id === value.project_id);
  const mainSite = currentProject?.location || currentProject?.name || 'Project Site';
  const update = <K extends keyof VehicleAssetDraft>(key: K, next: VehicleAssetDraft[K]) => onChange({ ...value, [key]: next, ...(key === 'vehicle_type' ? { vehicle_category: vehicleCategoryForType(String(next)) } : {}) });
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <label className="text-xs font-semibold text-bp-text">Vehicle Type *<VehicleTypePicker value={value.vehicle_type} types={vehicleTypes} disabled={disabled} canAdd={canAddVehicleType} onChange={type => update('vehicle_type', type)} onAddNew={onAddVehicleType} /></label>
    <label className="text-xs font-semibold text-bp-text">Vendor Name *<input required value={value.vendor} disabled={disabled} onChange={event => update('vendor', event.target.value)} className={inputClass} /></label>
    <label className="text-xs font-semibold text-bp-text">Model *<input required value={value.model} disabled={disabled} onChange={event => update('model', event.target.value)} className={inputClass} /></label>
    <label className="text-xs font-semibold text-bp-text">Fuel Type<select value={value.fuel_type} disabled={disabled} onChange={event => update('fuel_type', event.target.value as VehicleFuelType)} className={inputClass}><option value="diesel">Diesel</option><option value="petrol">Petrol</option><option value="electric">Electric</option><option value="other">Other</option></select></label>
    <label className="text-xs font-semibold text-bp-text">Vehicle Registration Number <span className="font-normal text-bp-muted">(optional)</span><input value={value.registration_number || ''} disabled={disabled} onChange={event => update('registration_number', event.target.value)} className={inputClass} /></label>
    <label className="text-xs font-semibold text-bp-text">Vehicle / Equipment ID<input readOnly value={value.vehicle_equipment_id} className={`${inputClass} bg-bp-background font-mono`} /></label>
    <label className="text-xs font-semibold text-bp-text">Registered Project *<select required value={value.project_id} disabled={disabled} onChange={event => { const item = projects.find(project => project.id === event.target.value); onChange({ ...value, project_id: event.target.value, site_id: undefined, site_name: item?.location || item?.name || 'Project Site' }); }} className={inputClass}>{projects.map(item => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}</select></label>
    <label className="text-xs font-semibold text-bp-text">Registered Site / Location<select value={value.site_id || '__project_site__'} disabled={disabled} onChange={event => { if (event.target.value === '__project_site__') { update('site_id', undefined); update('site_name', mainSite); } else { const location = locations.find(item => item.id === event.target.value); update('site_id', location?.id); update('site_name', location?.name || mainSite); } }} className={inputClass}><option value="__project_site__">{mainSite} (project location)</option>{locations.filter(item => item.id !== value.site_id).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}{value.site_id && locations.some(item => item.id === value.site_id) && <option value={value.site_id}>{locations.find(item => item.id === value.site_id)?.name}</option>}</select></label>
    <label className="text-xs font-semibold text-bp-text sm:col-span-2">Fleet Status<select value={value.condition} disabled={disabled} onChange={event => update('condition', event.target.value as VehicleAssetCondition)} className={inputClass}><option value="available">Available</option><option value="maintenance">Maintenance</option></select></label>
  </div>;
};

const VehicleTypePicker: React.FC<{ value: string; types: string[]; disabled: boolean; canAdd: boolean; onChange: (type: string) => void; onAddNew: () => void }> = ({ value, types, disabled, canAdd, onChange, onAddNew }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const filtered = types.filter(type => type.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));

  useEffect(() => {
    if (open) searchRef.current?.focus();
    else setQuery('');
  }, [open]);

  return <div className="relative mt-1">
    <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-required="true" disabled={disabled} data-bp-panel-trigger="vehicle-type-picker" onClick={() => setOpen(current => !current)} className={`${inputClass} flex items-center justify-between gap-2 text-left`}>
      <span className={value ? 'truncate text-bp-text' : 'text-bp-muted'}>{value || 'Select a vehicle type'}</span><ChevronDown className="h-4 w-4 shrink-0 text-bp-muted" />
    </button>
    {open && <div data-bp-dismissable-panel="vehicle-type-picker" className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-bp-border bg-white shadow-xl">
      <button type="button" data-bp-dismiss className="sr-only" aria-label="Close vehicle type options" onClick={() => setOpen(false)}>Close</button>
      <div className="border-b border-bp-border p-2"><input ref={searchRef} data-bp-ignore-unsaved aria-label="Search vehicle types" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); } }} className="min-h-9 w-full rounded-lg border border-bp-border bg-bp-background px-3 text-xs outline-none focus:border-bp-cyan focus:ring-2 focus:ring-bp-cyan/20" /></div>
      <div role="listbox" aria-label="Vehicle types" className="max-h-52 overflow-y-auto p-1">
        {filtered.map(type => <button key={type} type="button" role="option" aria-selected={type === value} onMouseDown={event => event.preventDefault()} onClick={() => { onChange(type); setOpen(false); }} className={`flex min-h-9 w-full items-center rounded-lg px-3 text-left text-xs transition hover:bg-bp-cyan-soft ${type === value ? 'bg-bp-cyan-soft font-semibold text-bp-navy' : 'text-bp-text'}`}>{type}</button>)}
        {!filtered.length && <p className="px-3 py-3 text-xs text-bp-muted">No vehicle types found.</p>}
      </div>
      {canAdd && <div className="border-t border-bp-border p-1"><button type="button" onMouseDown={event => event.preventDefault()} onClick={() => { setOpen(false); onAddNew(); }} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold text-bp-blue transition hover:bg-bp-cyan-soft"><Plus className="h-4 w-4" />Add New Vehicle Type</button></div>}
    </div>}
  </div>;
};

const VehicleTypeModal: React.FC<{ value: string; error: string | null; saving: boolean; onChange: (value: string) => void; onSave: (event: FormEvent) => void; onClose: () => void }> = ({ value, error, saving, onChange, onSave, onClose }) => <ModalShell title="Add New Vehicle Type" error={error} busy={saving} onClose={onClose} layerClassName="z-[60]">
  <form onSubmit={onSave} className="space-y-4 p-4 sm:p-5">
    <label className="block text-xs font-semibold text-bp-text">Vehicle Type Name *<input autoFocus required value={value} onChange={event => onChange(event.target.value)} className={inputClass} /></label>
    <div className="flex flex-col-reverse gap-2 border-t border-bp-border pt-3 sm:flex-row sm:justify-end"><button type="button" data-bp-dismiss onClick={onClose} disabled={saving} className="min-h-10 rounded-xl border border-bp-border px-4 text-xs font-semibold text-bp-text">Cancel</button><button type="submit" disabled={saving} className="min-h-10 rounded-xl bg-bp-navy px-4 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Adding…' : 'Add Vehicle Type'}</button></div>
  </form>
</ModalShell>;

const VehicleAssetModal: React.FC<{ open: boolean; editing: boolean; value: VehicleAssetDraft; projects: Project[]; locations: Array<{ id: string; name: string }>; vehicleTypes: string[]; canAddVehicleType: boolean; onAddVehicleType: () => void; loading: boolean; error: string | null; onChange: (value: VehicleAssetDraft) => void; onSave: (event: FormEvent) => void; onClose: () => void }> = ({ open, editing, value, projects, locations, vehicleTypes, canAddVehicleType, onAddVehicleType, loading, error, onChange, onSave, onClose }) => {
  if (!open) return null;
  return <ModalShell title={editing ? 'Edit Vehicle Details' : 'Register Vehicle'} subtitle="Registration is saved to the company fleet and remains available after reload." error={error} busy={loading} onClose={onClose}>
    <form onSubmit={onSave} className="space-y-5 p-4 sm:p-6">
      <section className="space-y-3"><SectionTitle icon={<Truck className="h-4 w-4" />} title="Vehicle Information" /><VehicleAssetFields value={value} projects={projects} locations={locations} vehicleTypes={vehicleTypes} canAddVehicleType={canAddVehicleType} onAddVehicleType={onAddVehicleType} onChange={onChange} /></section>
      <label className="block text-xs font-semibold text-bp-text">Remarks <span className="font-normal text-bp-muted">(optional)</span><textarea rows={2} value={value.remarks || ''} onChange={event => onChange({ ...value, remarks: event.target.value })} className={inputClass} /></label>
      <div className="flex flex-col-reverse gap-2 border-t border-bp-border pt-4 sm:flex-row sm:justify-end"><button type="button" data-bp-dismiss onClick={onClose} disabled={loading} className="min-h-10 rounded-xl border border-bp-border px-4 text-xs font-semibold text-bp-text">Cancel</button><button type="submit" disabled={loading} className="min-h-10 rounded-xl bg-bp-navy px-5 text-xs font-bold text-white disabled:opacity-50">{loading ? 'Saving…' : editing ? 'Save Vehicle' : 'Register Vehicle'}</button></div>
    </form>
  </ModalShell>;
};

const VehicleHireModal: React.FC<{
  value: VehicleHireDraft; asset: VehicleAssetDraft; assets: VehicleAssetRecord[]; projects: Project[]; locations: Array<{ id: string; name: string }>; assetLocations: Array<{ id: string; name: string }>; vehicleTypes: string[];
  canAddVehicleType: boolean; onAddVehicleType: () => void;
  editing: VehicleRentalRecord | null; preview: ReturnType<typeof calculateVehicleRental> | null; loading: boolean; error: string | null;
  onChangeHire: (key: keyof VehicleHireDraft, value: string | TransactionAttachments | undefined) => void;
  onChangeAsset: (value: VehicleAssetDraft) => void; onChooseAsset: (value: string) => void;
  onSave: (event: FormEvent) => void; onClose: () => void; onUploadFile: (file: File) => Promise<{ url: string; name: string; size: number }>;
}> = ({ value, asset, assets, projects, locations, assetLocations, vehicleTypes, canAddVehicleType, onAddVehicleType, editing, preview, loading, error, onChangeHire, onChangeAsset, onChooseAsset, onSave, onClose, onUploadFile }) => {
  const newVehicle = !assets.some(item => item.id === value.asset_id);
  const selectedProject = projects.find(item => item.id === value.project_id);
  const mainSite = selectedProject?.location || selectedProject?.name || 'Project Site';
  const setSite = (selection: string) => {
    if (selection === '__project_site__') { onChangeHire('site_id', undefined); onChangeHire('site_name', mainSite); }
    else { const site = locations.find(item => item.id === selection); onChangeHire('site_id', site?.id); onChangeHire('site_name', site?.name || mainSite); }
  };
  return <ModalShell title={editing ? 'Edit Vehicle Hire Period' : 'Add Vehicle Hire'} subtitle="Choose an existing fleet vehicle or register a new vehicle with this hire." error={error} busy={loading} onClose={onClose} wide>
    <form onSubmit={onSave} className="space-y-5 p-4 sm:p-6">
      <section className="space-y-3"><SectionTitle icon={<Truck className="h-4 w-4" />} title="Vehicle Information" />
        <label className="block text-xs font-semibold text-bp-text">Select Vehicle<select aria-label="Select Vehicle" value={value.asset_id === asset.id && !assets.some(item => item.id === asset.id) ? 'new' : value.asset_id} disabled={Boolean(editing)} onChange={event => onChooseAsset(event.target.value)} className={inputClass}><option value="new">Register a new vehicle</option>{assets.map(item => <option key={item.id} value={item.id}>{item.vehicle_equipment_id} · {item.vehicle_type} · {item.model} · {item.vendor}</option>)}</select></label>
        {newVehicle && <p className="rounded-lg bg-bp-cyan-soft/50 px-3 py-2 text-xs text-bp-text">This hire will also register the new vehicle in the fleet.</p>}
        <VehicleAssetFields value={asset} projects={projects} locations={assetLocations} vehicleTypes={vehicleTypes} canAddVehicleType={canAddVehicleType} onAddVehicleType={onAddVehicleType} onChange={onChangeAsset} />
      </section>
      <section className="space-y-3 border-t border-bp-border pt-4"><SectionTitle icon={<CalendarDays className="h-4 w-4" />} title="Hire Period" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-bp-text">Project *<select required value={value.project_id} onChange={event => { const p = projects.find(item => item.id === event.target.value); onChangeHire('project_id', event.target.value); onChangeHire('site_id', undefined); onChangeHire('site_name', p?.location || p?.name || 'Project Site'); }} className={inputClass}>{projects.map(item => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}</select></label>
          <label className="text-xs font-semibold text-bp-text">Site / Location *<select required value={value.site_id || '__project_site__'} onChange={event => setSite(event.target.value)} className={inputClass}><option value="__project_site__">{mainSite} (project location)</option>{locations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-xs font-semibold text-bp-text">In Date *<input required type="date" value={value.in_date} onChange={event => onChangeHire('in_date', event.target.value)} className={inputClass} /></label>
          <label className="text-xs font-semibold text-bp-text">Out Date *<input required type="date" min={value.in_date} value={value.out_date} onChange={event => onChangeHire('out_date', event.target.value)} className={inputClass} /></label>
          <label className="text-xs font-semibold text-bp-text">Rent / Month (₹)<input type="number" min="0" step="0.01" required={value.billing_basis === 'monthly'} value={value.rent_per_month} onChange={event => onChangeHire('rent_per_month', event.target.value)} className={inputClass} /></label>
          <label className="text-xs font-semibold text-bp-text">Rent / Day (₹)<input type="number" min="0" step="0.01" required={value.billing_basis === 'daily'} value={value.rent_per_day} onChange={event => onChangeHire('rent_per_day', event.target.value)} className={inputClass} /></label>
          <label className="text-xs font-semibold text-bp-text">Billing Basis<select value={value.billing_basis} onChange={event => onChangeHire('billing_basis', event.target.value as VehicleHireBillingBasis)} className={inputClass}><option value="daily">Daily rate only</option><option value="monthly">Monthly rate only (30-day prorating)</option></select></label>
          <label className="text-xs font-semibold text-bp-text">Billable Date Rule<select value={value.date_rule} onChange={event => onChangeHire('date_rule', event.target.value as VehicleHireDateRule)} className={inputClass}><option value="inclusive">Include both In Date and Out Date</option><option value="exclusive">Include In Date; Out Date is exclusive</option></select></label>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><ComputedValue label="Total Months" value={preview ? String(preview.totalMonths) : '—'} /><ComputedValue label="Total Days" value={preview ? String(preview.totalDays) : '—'} /><ComputedValue label="Billable Days" value={preview ? String(preview.billableDays) : '—'} /><ComputedValue label="Estimated Hire Cost" value={preview ? currency(preview.estimatedHireCost) : 'Enter valid dates and selected rate'} emphasize /></div>
        {!preview && <p role="alert" className="text-xs text-amber-800">Enter a valid date range and a non-negative rate for the selected billing basis to enable saving.</p>}
        <p className="rounded-lg border border-bp-border bg-bp-background p-3 text-[11px] leading-5 text-bp-muted">Total Months and Total Days describe the calendar rental period from In Date through Out Date. The billable rule is separate: {value.date_rule === 'inclusive' ? 'both dates are charged.' : 'the Out Date is excluded from charges.'} Daily billing uses billable days × daily rate. Monthly billing prorates the monthly rate over 30 days; the daily rate is not added.</p>
      </section>
      <section className="space-y-3 border-t border-bp-border pt-4"><SectionTitle icon={<FileText className="h-4 w-4" />} title="Documents & Notes" /><label className="block text-xs font-semibold text-bp-text">Remarks <span className="font-normal text-bp-muted">(optional)</span><textarea rows={2} value={value.remarks} onChange={event => onChangeHire('remarks', event.target.value)} className={inputClass} /></label><AttachmentSections value={value.attachments} onChange={attachments => onChangeHire('attachments', attachments)} onUploadFile={onUploadFile} disabled={loading} /></section>
      <div className="flex flex-col-reverse gap-2 border-t border-bp-border pt-4 sm:flex-row sm:justify-end"><button type="button" data-bp-dismiss onClick={onClose} disabled={loading} className="min-h-10 rounded-xl border border-bp-border px-4 text-xs font-semibold text-bp-text">Cancel</button><button type="submit" disabled={loading || !preview} className="min-h-10 rounded-xl bg-bp-navy px-5 text-xs font-bold text-white disabled:opacity-50">{loading ? 'Saving…' : editing ? 'Save Hire Period' : 'Save Vehicle Hire'}</button></div>
    </form>
  </ModalShell>;
};

const VehicleMovementModal: React.FC<{
  assets: VehicleAssetRecord[]; projects: Project[]; locations: Array<{ id: string; name: string }>;
  assetId: string; projectId: string; site: SiteChoice; operator: string; date: string; sessions: VehicleWorkingSession[];
  idleMinutes: string; idleReason: string; customIdleReason: string; remarks: string;
  calculation: ReturnType<typeof calculateWorkingSessions> | null; totalWorking: number; parsedIdle: number;
  error: string | null; saving: boolean;
  onAsset: (value: string) => void; onProject: (value: string) => void; onSite: (value: SiteChoice) => void;
  onOperator: (value: string) => void; onDate: (value: string) => void;
  onSession: (id: string, key: 'start_time' | 'stop_time', value: string) => void;
  onAddSession: () => void; onRemoveSession: (id: string) => void; onIdle: (value: string) => void;
  onIdleReason: (value: string) => void; onCustomIdleReason: (value: string) => void;
  onRemarks: (value: string) => void; onSave: (event: FormEvent) => void; onClose: () => void;
}> = ({ assets, projects, locations, assetId, projectId, site, operator, date, sessions, idleMinutes, idleReason, customIdleReason, remarks, calculation, totalWorking, parsedIdle, error, saving, onAsset, onProject, onSite, onOperator, onDate, onSession, onAddSession, onRemoveSession, onIdle, onIdleReason, onCustomIdleReason, onRemarks, onSave, onClose }) => {
  const project = projects.find(item => item.id === projectId) || projects[0];
  const mainSite = project?.location || project?.name || 'Project Site';
  const updateSite = (value: string) => {
    if (value === '__project_site__') onSite({ name: mainSite });
    else { const location = locations.find(item => item.id === value); if (location) onSite({ id: location.id, name: location.name }); }
  };
  return <ModalShell title="Vehicle Movement & Working Hours" subtitle="Working sessions are actual productive time. Idle time is tracked separately and is not subtracted again." error={error} busy={saving} onClose={onClose} wide>
    <form onSubmit={onSave} className="space-y-5 p-4 sm:p-6">
      <section className="space-y-3"><SectionTitle icon={<Truck className="h-4 w-4" />} title="Vehicle & Site" /><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold">Select Vehicle *<select required value={assetId} onChange={event => onAsset(event.target.value)} className={inputClass}><option value="">Choose a registered vehicle</option>{assets.map(asset => <option key={asset.id} value={asset.id}>{asset.vehicle_equipment_id} · {asset.vehicle_type} · {asset.model}</option>)}</select></label>
        <label className="text-xs font-semibold">Operator Name *<input required value={operator} onChange={event => onOperator(event.target.value)} className={inputClass} /></label>
        <label className="text-xs font-semibold">Project *<select required value={projectId} onChange={event => { const selected = projects.find(item => item.id === event.target.value); onProject(event.target.value); onSite({ name: selected?.location || selected?.name || 'Project Site' }); }} className={inputClass}>{projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-xs font-semibold">Site / Location *<select required value={site.id || '__project_site__'} onChange={event => updateSite(event.target.value)} className={inputClass}><option value="__project_site__">{mainSite} (project location)</option>{locations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-xs font-semibold sm:col-span-2">Date *<input required type="date" value={date} onChange={event => onDate(event.target.value)} className={inputClass} /></label>
      </div></section>
      <section className="space-y-3 border-t border-bp-border pt-4"><div className="flex flex-wrap items-center justify-between gap-2"><SectionTitle icon={<Clock3 className="h-4 w-4" />} title="Working Sessions" /><button type="button" onClick={onAddSession} className="min-h-9 rounded-xl border border-bp-border px-3 text-xs font-semibold text-bp-text hover:bg-bp-background"><Plus className="mr-1 inline h-3.5 w-3.5" />Add Session</button></div>
        <div className="space-y-2">{sessions.map((session, index) => {
          const isFilled = Boolean(session.start_time || session.stop_time);
          const calculationIndex = sessions.slice(0, index).filter(item => item.start_time || item.stop_time).length;
          const duration = isFilled ? calculation?.[calculationIndex]?.durationMinutes : undefined;
          return <div key={session.id} className="grid grid-cols-[auto_1fr_1fr_auto_auto] items-end gap-2 rounded-xl border border-bp-border bg-bp-background/60 p-3">
            <span className="pb-3 text-[11px] font-semibold text-bp-muted">{index + 1}</span>
            <label className="text-[11px] font-semibold">Start Time<input aria-label={`Start Time ${index + 1}`} type="time" value={session.start_time} onChange={event => onSession(session.id, 'start_time', event.target.value)} className={inputClass} /></label>
            <label className="text-[11px] font-semibold">Stop Time<input aria-label={`Stop Time ${index + 1}`} type="time" value={session.stop_time} onChange={event => onSession(session.id, 'stop_time', event.target.value)} className={inputClass} /></label>
            <span className="min-w-[52px] pb-3 text-[10px] tabular-nums text-bp-muted">{duration === undefined ? '—' : formatMinutesAsHours(duration)}</span>
            <button type="button" aria-label={`Remove session ${index + 1}`} onClick={() => onRemoveSession(session.id)} className="mb-1 flex h-8 w-8 items-center justify-center rounded-lg text-bp-muted hover:bg-white hover:text-red-600"><X className="h-4 w-4" /></button>
          </div>;
        })}</div>
        <div className="grid grid-cols-1 gap-2 rounded-xl bg-bp-navy p-3 text-white sm:grid-cols-3"><ComputedValue label="Actual Working Time" value={formatMinutesAsHours(totalWorking)} dark /><ComputedValue label="Idle Time" value={Number.isInteger(parsedIdle) && parsedIdle >= 0 ? formatMinutesAsHours(parsedIdle) : 'Invalid'} dark /><ComputedValue label="Scheduled Time (work + idle)" value={Number.isInteger(parsedIdle) && parsedIdle >= 0 ? formatMinutesAsHours(totalWorking + parsedIdle) : 'Invalid'} dark /></div>
        {!calculation && sessions.some(item => item.start_time || item.stop_time) && <p className="text-xs text-amber-800">Complete valid non-overlapping sessions. Overnight sessions are supported.</p>}
      </section>
      <section className="space-y-3 border-t border-bp-border pt-4"><SectionTitle icon={<Settings2 className="h-4 w-4" />} title="Idle Time" /><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Idle Time (minutes)<input type="number" min="0" step="1" value={idleMinutes} onChange={event => onIdle(event.target.value)} className={inputClass} /></label><label className="text-xs font-semibold">Reason for Idle Time<select value={idleReason} onChange={event => onIdleReason(event.target.value)} className={inputClass}><option value="">No idle time / not specified</option>{['Waiting for Materials', 'Fuel Shortage', 'Machine Breakdown', 'Operator Unavailable', 'Rain/Weather', 'Site Work Stopped', 'Other'].map(item => <option key={item}>{item}</option>)}</select></label>{idleReason === 'Other' && <label className="text-xs font-semibold sm:col-span-2">Other reason<input required value={customIdleReason} onChange={event => onCustomIdleReason(event.target.value)} className={inputClass} /></label>}</div><label className="block text-xs font-semibold">Remarks <span className="font-normal text-bp-muted">(optional)</span><textarea rows={2} value={remarks} onChange={event => onRemarks(event.target.value)} className={inputClass} /></label></section>
      <div className="flex flex-col-reverse gap-2 border-t border-bp-border pt-4 sm:flex-row sm:justify-end"><button type="button" data-bp-dismiss onClick={onClose} disabled={saving} className="min-h-10 rounded-xl border border-bp-border px-4 text-xs font-semibold">Cancel</button><button type="submit" disabled={saving || !calculation} className="min-h-10 rounded-xl bg-bp-navy px-5 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save Movement'}</button></div>
    </form>
  </ModalShell>;
};

const ReportsPanel: React.FC<{ reportTab: ReportTab; setReportTab: (tab: ReportTab) => void; rows: Array<{ key: string; name: string; detail: string; vendor: string; project: string; period: string; hours: number; idle: number; cost: number }>; onExport: () => void; fromDate: string; toDate: string }> = ({ reportTab, setReportTab, rows, onExport, fromDate, toDate }) => <section className="space-y-4 rounded-2xl border border-bp-border bg-white p-4 shadow-xs sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-bold text-bp-text">Vehicle Reports</h2><p className="mt-1 text-xs text-bp-muted">Filtered records · {fromDate || 'all dates'} to {toDate || 'today'}</p></div><button type="button" onClick={onExport} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-bp-navy px-4 text-xs font-bold text-white"><Download className="h-4 w-4" />Export CSV</button></div><div className="flex flex-wrap gap-2">{([['vehicle', 'Vehicle-wise'], ['project', 'Project-wise'], ['vendor', 'Vendor-wise']] as Array<[ReportTab, string]>).map(([tab, label]) => <button key={tab} type="button" onClick={() => setReportTab(tab)} className={`min-h-9 rounded-xl px-3 text-xs font-semibold ${reportTab === tab ? 'bg-bp-cyan text-bp-text' : 'border border-bp-border bg-white text-bp-muted'}`}>{label}</button>)}</div><div className="overflow-x-auto rounded-xl border border-bp-border"><table className="min-w-[850px] w-full border-collapse text-left text-xs"><thead className="bg-bp-background text-[10px] uppercase tracking-wider text-bp-muted"><tr><th className="px-3 py-3">{reportTab === 'vehicle' ? 'Vehicle' : reportTab === 'project' ? 'Project' : 'Vendor'}</th><th className="px-3 py-3">Details</th><th className="px-3 py-3">Vendor</th><th className="px-3 py-3">Project(s)</th><th className="px-3 py-3">Hire Periods</th><th className="px-3 py-3 text-right">Working Hours</th><th className="px-3 py-3 text-right">Idle Hours</th><th className="px-3 py-3 text-right">Hire Cost</th></tr></thead><tbody className="divide-y divide-bp-border">{rows.length === 0 ? <tr><td colSpan={8} className="px-3 py-10 text-center text-bp-muted">No report data matches the selected filters.</td></tr> : rows.map(row => <tr key={row.key}><td className="px-3 py-3 font-semibold">{row.name}</td><td className="px-3 py-3">{row.detail}</td><td className="px-3 py-3">{row.vendor}</td><td className="px-3 py-3">{row.project}</td><td className="px-3 py-3">{row.period}</td><td className="px-3 py-3 text-right tabular-nums">{row.hours.toFixed(2)}</td><td className="px-3 py-3 text-right tabular-nums">{row.idle.toFixed(2)}</td><td className="px-3 py-3 text-right font-semibold tabular-nums">{currency(row.cost)}</td></tr>)}</tbody></table></div></section>;

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-bp-text">{icon}<span>{title}</span></h3>;
const ComputedValue: React.FC<{ label: string; value: string; emphasize?: boolean; dark?: boolean }> = ({ label, value, emphasize = false, dark = false }) => <div className={`${dark ? 'text-white' : 'rounded-xl border border-bp-border bg-bp-background p-3 text-bp-text'} min-w-0`}><div className={`${dark ? 'text-slate-300' : 'text-bp-muted'} text-[10px] font-medium`}>{label}</div><div className={`${emphasize ? 'text-bp-blue' : dark ? 'text-white' : 'text-bp-text'} mt-1 break-words text-sm font-bold tabular-nums`}>{value}</div></div>;

const AssetDetailsModal: React.FC<{ asset: VehicleAssetRecord; rentals: VehicleRentalRecord[]; movements: VehicleHistoryRow[]; status: string; manager: boolean; onClose: () => void; onEdit: () => void; onHire: () => void }> = ({ asset, rentals, movements, status, manager, onClose, onEdit, onHire }) => <ModalShell title="Vehicle Details" subtitle={`${asset.vehicle_equipment_id} · ${asset.vehicle_type}`} onClose={onClose}><div className="space-y-4 p-4 sm:p-6"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><DetailValue label="Vendor" value={asset.vendor} /><DetailValue label="Model" value={asset.model} /><DetailValue label="Registration" value={asset.registration_number || 'Not provided'} /><DetailValue label="Fuel Type" value={asset.fuel_type} /><DetailValue label="Registered Project" value={asset.project_name} /><DetailValue label="Registered Site" value={asset.site_name} /><DetailValue label="Status" value={status} /><DetailValue label="Remarks" value={asset.remarks || '—'} /></div><div className="border-t border-bp-border pt-4"><h3 className="mb-2 text-xs font-bold">Hire History ({rentals.length})</h3>{rentals.length ? rentals.map(record => <div key={record.id} className="flex flex-wrap justify-between gap-2 border-b border-bp-border py-2 text-xs"><span>{record.project_name} · {record.site_name} · {record.in_date}–{record.out_date}</span><strong>{currency(record.estimated_hire_cost)}</strong></div>) : <p className="text-xs text-bp-muted">No hire periods recorded.</p>}</div><div className="border-t border-bp-border pt-4"><h3 className="mb-2 text-xs font-bold">Movement History ({movements.length})</h3>{movements.slice(0, 8).map(record => <div key={record.id} className="border-b border-bp-border py-2 text-xs"><span className="font-semibold">{record.work_date}</span> · {record.project_name} / {record.site_name} · {formatMinutesAsHours(record.total_working_minutes)}</div>)}{!movements.length && <p className="text-xs text-bp-muted">No movements recorded.</p>}</div>{manager && <div className="flex flex-wrap justify-end gap-2 border-t border-bp-border pt-4"><button type="button" onClick={onEdit} className="min-h-9 rounded-xl border border-bp-border px-3 text-xs font-semibold">Edit Vehicle</button><button type="button" onClick={onHire} className="min-h-9 rounded-xl bg-bp-navy px-3 text-xs font-semibold text-white">Add Hire Period</button></div>}</div></ModalShell>;

const RentalDetailsModal: React.FC<{ record: VehicleRentalRecord; asset?: VehicleAssetRecord; manager: boolean; onClose: () => void; onEdit: () => void; onDelete: () => void }> = ({ record, asset, manager, onClose, onEdit, onDelete }) => <ModalShell title="Hire Period Details" subtitle={`${asset?.vehicle_equipment_id || record.asset_id} · ${record.project_name}`} onClose={onClose}><div className="space-y-4 p-4 sm:p-6"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><DetailValue label="Vehicle Type / Model" value={`${asset?.vehicle_type || 'Vehicle'} · ${asset?.model || '—'}`} /><DetailValue label="Vendor" value={asset?.vendor || '—'} /><DetailValue label="Project / Site" value={`${record.project_name} · ${record.site_name}`} /><DetailValue label="Rental Dates" value={`${record.in_date} to ${record.out_date} (${record.date_rule})`} /><DetailValue label="Rental Period" value={`${record.total_months} months · ${record.total_days} calendar days`} /><DetailValue label="Billable Days" value={String(record.billable_days)} /><DetailValue label="Billing Basis" value={record.billing_basis === 'daily' ? `${currency(record.rent_per_day || 0)} / day` : `${currency(record.rent_per_month || 0)} / month prorated over 30 days`} /><DetailValue label="Estimated Hire Cost" value={currency(record.estimated_hire_cost)} /><DetailValue label="Status" value={hireStatus(record, getLocalDateString())} /><DetailValue label="Remarks" value={record.remarks || '—'} /></div><AttachmentLinks attachments={record.attachments} /><div className="flex justify-end gap-2 border-t border-bp-border pt-4">{manager && <><button type="button" onClick={onDelete} className="min-h-9 rounded-xl border border-red-200 px-3 text-xs font-semibold text-red-700">Delete</button><button type="button" onClick={onEdit} className="min-h-9 rounded-xl bg-bp-navy px-3 text-xs font-semibold text-white">Edit</button></>}</div></div></ModalShell>;

const MovementDetailsModal: React.FC<{ row: VehicleHistoryRow; manager: boolean; onClose: () => void; onDelete: () => void }> = ({ row, manager, onClose, onDelete }) => <ModalShell title="Vehicle Movement Details" subtitle={`${row.vehicle_equipment_id} · ${row.work_date}`} onClose={onClose}><div className="space-y-4 p-4 sm:p-6"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><DetailValue label="Vehicle" value={`${row.vehicle_type} · ${row.vendor}`} /><DetailValue label="Project / Site" value={`${row.project_name} · ${row.site_name}`} /><DetailValue label="Operator" value={row.operator_name} /><DetailValue label="Working Time" value={formatMinutesAsHours(row.total_working_minutes)} /><DetailValue label="Idle Time" value={formatMinutesAsHours(row.idle_minutes)} /><DetailValue label="Scheduled Time" value={formatMinutesAsHours(row.scheduled_minutes)} /><DetailValue label="Idle Reason" value={row.idle_reason || '—'} /><DetailValue label="Record Type" value={row.legacy ? 'Existing work log' : 'Movement history'} /></div><div><h3 className="mb-2 text-xs font-bold">Working Sessions</h3>{row.sessions.map(session => <div key={session.id} className="flex justify-between border-b border-bp-border py-2 text-xs"><span>{session.start_time} – {session.stop_time}</span><strong className="tabular-nums">{formatMinutesAsHours(session.duration_minutes)}</strong></div>)}</div>{manager && row.record && <div className="flex justify-end border-t border-bp-border pt-4"><button type="button" onClick={onDelete} className="min-h-9 rounded-xl border border-red-200 px-3 text-xs font-semibold text-red-700">Delete Movement</button></div>}</div></ModalShell>;

const DetailValue: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="min-w-0 rounded-xl bg-bp-background p-3"><div className="text-[10px] font-medium text-bp-muted">{label}</div><div className="mt-1 break-words text-xs font-semibold text-bp-text">{value}</div></div>;
