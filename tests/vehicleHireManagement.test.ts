import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDealerOutstanding,
  calculateFinalVehicleHireBill,
  calculateVehicleFuelAmount,
  getVehicleHireDisplayStatus
} from '../src/utils/vehicleHire.ts';

const values = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, String(value)); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size; }
  }
});

const { dataService, PRESET_USERS } = await import('../src/services/dataService.ts');
const companyId = PRESET_USERS.admin.company_id;
const project = {
  id: 'vh-project-1', company_id: companyId, name: 'North Site', code: 'NORTH-1', client_name: 'Client',
  address: 'Site address', location: 'North', description: '', start_date: '2026-01-01',
  expected_completion_date: '2027-01-01', project_manager_id: PRESET_USERS.admin.id,
  project_manager_name: PRESET_USERS.admin.full_name, status: 'in_progress' as const,
  created_by: PRESET_USERS.admin.id, created_by_name: PRESET_USERS.admin.full_name,
  created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z'
};

const setup = () => {
  values.clear();
  values.set('buildpulse_projects_v1', JSON.stringify([project]));
  dataService.setCurrentUser(PRESET_USERS.admin);
};

const dealerInput = (overrides: Record<string, unknown> = {}) => ({
  dealer_id: 'DLR-01', name: 'North Vehicle Hire', contact_person: 'Ravi', phone: '9000000000',
  address: 'North industrial area', email: 'hire@example.invalid', payment_details: 'Bank transfer',
  remarks: '', status: 'active' as const, ...overrides
});

const createDealer = async () => dataService.saveVehicleDealer(dealerInput());

const hireInput = (dealerId: string, overrides: Record<string, unknown> = {}) => ({
  dealer_id: dealerId, project_id: project.id, site_name: 'North Gate',
  vehicle_type: 'Excavators', registration_number: 'KA-01-AB-1234', vehicle_description: 'Tracked excavator',
  driver_name: 'Operator One', driver_phone: '9111111111', start_at: '2026-10-24T08:00',
  expected_return_at: '2026-10-28T18:00', billing_method: 'hour' as const, agreed_rate: 400,
  initial_meter_reading: 100, initial_engine_hours: 250, advance_amount: 500,
  remarks: '', status: 'active' as const, attachments: { images: [] }, ...overrides
});

test('final hire bill uses confirmed units and handles each billing method without assuming duration', () => {
  assert.equal(calculateFinalVehicleHireBill({ billingMethod: 'hour', agreedRate: 400, billableUsage: 3.5 }), 1400);
  assert.equal(calculateFinalVehicleHireBill({ billingMethod: 'trip', agreedRate: 250, billableUsage: 2, additionalCharges: 30, discount: 20 }), 510);
  assert.equal(calculateFinalVehicleHireBill({ billingMethod: 'fixed_contract', agreedRate: 5000, billableUsage: 0, additionalCharges: 100, discount: 50 }), 5050);
  assert.throws(() => calculateFinalVehicleHireBill({ billingMethod: 'day', agreedRate: 1200, billableUsage: 0 }), /confirmed billable usage/i);
  assert.throws(() => calculateFinalVehicleHireBill({ billingMethod: 'month', agreedRate: 1000, billableUsage: 1, discount: 1100 }), /Discount cannot exceed/i);
});

test('hire statuses are calculated from local expected-return time and finalized returns', () => {
  const hire = { expected_return_at: '2026-10-27T10:00', status: 'active' } as Parameters<typeof getVehicleHireDisplayStatus>[0];
  assert.equal(getVehicleHireDisplayStatus(hire, false, '2026-10-26T12:00'), 'Return Due');
  assert.equal(getVehicleHireDisplayStatus(hire, false, '2026-10-27T10:01'), 'Overdue');
  assert.equal(getVehicleHireDisplayStatus(hire, true, '2026-10-26T12:00'), 'Returned');
  assert.equal(getVehicleHireDisplayStatus({ ...hire, status: 'cancelled' }, false, '2026-10-26T12:00'), 'Cancelled');
});

test('dealers persist by company, duplicate dealer IDs are case-insensitive, and dealers archive without deletion', async () => {
  setup();
  const dealer = await createDealer();
  assert.equal((await dataService.getVehicleDealers()).length, 1);
  await assert.rejects(dataService.saveVehicleDealer(dealerInput({ dealer_id: 'dlr-01' })), /already exists/i);
  await dataService.archiveVehicleDealer(dealer.id);
  assert.equal((await dataService.getVehicleDealers())[0].status, 'archived');
  assert.match(values.get('buildpulse_vehicle_dealers_v1') || '', /North Vehicle Hire/);
});

test('Vehicle Hire records remain company-scoped and management methods enforce existing role permissions', async () => {
  setup();
  await createDealer();
  dataService.setCurrentUser({ ...PRESET_USERS.admin, role: 'accountant', company_id: 'another-company' });
  assert.deepEqual(await dataService.getVehicleDealers(), []);
  await assert.rejects(dataService.saveVehicleDealer(dealerInput({ dealer_id: 'DLR-02' })), /permission/i);
  dataService.setCurrentUser({ ...PRESET_USERS.admin, role: 'site_supervisor', assigned_projects: ['another-project'] });
  await assert.rejects(dataService.saveVehicleHireContract(hireInput('missing-dealer')), /Access Denied/i);
  dataService.setCurrentUser(PRESET_USERS.admin);
  assert.equal((await dataService.getVehicleDealers()).length, 1);
});

test('hire creation persists the contract and records its advance once as a dealer payment', async () => {
  setup();
  const dealer = await createDealer();
  const hire = await dataService.saveVehicleHireContract(hireInput(dealer.id));
  const payments = await dataService.getVehicleDealerPayments();
  assert.equal(hire.hire_reference.startsWith('VH-20261024-'), true);
  assert.equal((await dataService.getVehicleHireContracts())[0].id, hire.id);
  assert.equal(payments.length, 1);
  assert.equal(payments[0].payment_type, 'advance');
  assert.equal(payments[0].amount, 500);
  await dataService.saveVehicleHireContract({ ...hireInput(dealer.id), id: hire.id, advance_amount: 900 });
  assert.equal((await dataService.getVehicleDealerPayments()).length, 1);
  assert.equal((await dataService.getVehicleHireContracts())[0].advance_amount, 500);
});

test('invalid hire dates and overlapping active registrations are rejected', async () => {
  setup();
  const dealer = await createDealer();
  await assert.rejects(dataService.saveVehicleHireContract(hireInput(dealer.id, { start_at: '2026-02-30T08:00' })), /valid local/i);
  await dataService.saveVehicleHireContract(hireInput(dealer.id));
  await assert.rejects(dataService.saveVehicleHireContract(hireInput(dealer.id, { start_at: '2026-10-26T09:00' })), /overlapping active hire/i);
});

test('a returned vehicle can be rehired from its actual return time before the expected date', async () => {
  setup();
  const dealer = await createDealer();
  const hire = await dataService.saveVehicleHireContract(hireInput(dealer.id));
  await dataService.finalizeVehicleHireReturn({
    hire_id: hire.id, actual_return_at: '2026-10-25T17:00', billable_usage: 4,
    return_condition: 'Good', additional_charges: 0, discount: 0, attachments: { images: [] }
  });
  const replacement = await dataService.saveVehicleHireContract(hireInput(dealer.id, {
    start_at: '2026-10-26T08:00', expected_return_at: '2026-10-29T18:00', advance_amount: 0
  }));
  assert.notEqual(replacement.id, hire.id);
});

test('finalized returns calculate from confirmed usage and retain an audit trail for corrections', async () => {
  setup();
  const dealer = await createDealer();
  const hire = await dataService.saveVehicleHireContract(hireInput(dealer.id));
  const returned = await dataService.finalizeVehicleHireReturn({
    hire_id: hire.id, actual_return_at: '2026-10-26T17:00', final_meter_reading: 130,
    final_engine_hours: 260, billable_usage: 4, return_condition: 'Good', additional_charges: 250,
    discount: 100, remarks: 'Returned at site', attachments: { images: [] }
  });
  assert.equal(returned.final_bill, 1750);
  const corrected = await dataService.finalizeVehicleHireReturn({
    id: returned.id, hire_id: hire.id, actual_return_at: '2026-10-26T17:00', final_meter_reading: 130,
    final_engine_hours: 260, billable_usage: 4, return_condition: 'Good', additional_charges: 250,
    discount: 150, correction_reason: 'Approved invoice adjustment', remarks: 'Corrected', attachments: { images: [] }
  });
  assert.equal(corrected.final_bill, 1700);
  assert.equal(corrected.revision_history.length, 1);
  assert.equal((await dataService.getVehicleHireReturns())[0].id, returned.id);
});

test('dealer payments are idempotent and duplicate transaction references are rejected', async () => {
  setup();
  const dealer = await createDealer();
  const paymentInput = {
    dealer_id: dealer.id, hire_ids: [], payment_date: '2026-10-26', amount: 100,
    payment_type: 'partial' as const, method: 'upi' as const, transaction_reference: 'TXN-900',
    idempotency_key: 'payment-once', receipt: { images: [] }
  };
  const first = await dataService.recordVehicleDealerPayment(paymentInput);
  const repeated = await dataService.recordVehicleDealerPayment(paymentInput);
  assert.equal(first.id, repeated.id);
  assert.equal((await dataService.getVehicleDealerPayments()).length, 1);
  await assert.rejects(dataService.recordVehicleDealerPayment({ ...paymentInput, idempotency_key: 'payment-two' }), /already been recorded/i);
});

test('dealer payment edits preserve record identity and revisions; deletion is replaced by a safe reversal', async () => {
  setup();
  const dealer = await createDealer();
  const input = {
    dealer_id: dealer.id, hire_ids: [], payment_date: '2026-10-26', amount: 100,
    payment_type: 'partial' as const, method: 'upi' as const, transaction_reference: 'TXN-EDIT-1',
    idempotency_key: 'payment-edit-1'
  };
  const original = await dataService.recordVehicleDealerPayment(input);
  const corrected = await dataService.recordVehicleDealerPayment({
    ...input, id: original.id, amount: 150, transaction_reference: 'TXN-EDIT-2', correction_reason: 'Corrected bank amount'
  });
  assert.equal(corrected.id, original.id);
  assert.equal(corrected.created_at, original.created_at);
  assert.equal(corrected.revision_history?.length, 1);
  const reversal = await dataService.reverseVehicleDealerPayment(original.id, 'Payment was sent twice at bank');
  assert.equal(reversal.payment_type, 'reversal');
  assert.equal(reversal.reverses_payment_id, original.id);
  const allPayments = await dataService.getVehicleDealerPayments();
  assert.equal(allPayments.length, 2);
  assert.equal(calculateDealerOutstanding(dealer.id, [], [], allPayments, []), 0);
  await assert.rejects(dataService.reverseVehicleDealerPayment(original.id, 'Second reversal'), /already been reversed/i);
  await assert.rejects(dataService.recordVehicleDealerPayment({
    ...input, id: original.id, amount: 200, correction_reason: 'Trying to edit after reversal'
  }), /already been reversed/i);
});

test('unused dealers and hires can be deleted, while records with linked financial history are retained', async () => {
  setup();
  const unusedDealer = await createDealer();
  await dataService.deleteVehicleDealerIfUnused(unusedDealer.id);
  assert.equal((await dataService.getVehicleDealers()).length, 0);

  const dealer = await createDealer();
  const unusedHire = await dataService.saveVehicleHireContract(hireInput(dealer.id, { advance_amount: 0, registration_number: 'KA-04-EF-0001' }));
  await dataService.deleteVehicleHireContractIfUnused(unusedHire.id);
  assert.equal((await dataService.getVehicleHireContracts()).length, 0);

  const hireWithAdvance = await dataService.saveVehicleHireContract(hireInput(dealer.id, { registration_number: 'KA-04-EF-0002' }));
  await assert.rejects(dataService.deleteVehicleHireContractIfUnused(hireWithAdvance.id), /payment.*dependencies/i);
  await assert.rejects(dataService.deleteVehicleDealerIfUnused(dealer.id), /archive the dealer/i);
  await dataService.archiveVehicleDealer(dealer.id);
  assert.equal((await dataService.getVehicleDealers())[0].status, 'archived');
  assert.equal((await dataService.getVehicleHireContracts()).length, 1);
});

test('fuel edits preserve identity and audit prior values; safe company-direct entries are voided, not erased', async () => {
  setup();
  const input = {
    project_id: project.id, site_name: 'North Gate', fuel_date: '2026-10-25', fuel_type: 'diesel' as const,
    quantity_litres: 10, price_per_litre: 80, meter_reading: 500, supplier: 'Pump A',
    payer: 'company_direct' as const, driver_advance_amount: 0, idempotency_key: 'fuel-edit-1',
    reimbursement_confirmed: false, employee_id: PRESET_USERS.admin.user_id!, employee_name: PRESET_USERS.admin.full_name,
    receipt: { images: [] }, notes: 'Receipt attached'
  };
  const original = await dataService.recordVehicleFuelEntry(input);
  const corrected = await dataService.recordVehicleFuelEntry({
    ...input, id: original.id, quantity_litres: 12, correction_reason: 'Receipt quantity corrected'
  });
  assert.equal(corrected.id, original.id);
  assert.equal(corrected.created_at, original.created_at);
  assert.equal(corrected.total_amount, 960);
  assert.equal(corrected.revision_history?.length, 1);
  await dataService.voidVehicleFuelEntry(corrected.id, 'Duplicate direct supplier entry');
  const records = await dataService.getVehicleFuelEntries();
  assert.equal(records.length, 1);
  assert.equal(records[0].status, 'voided');
  await assert.rejects(dataService.recordVehicleFuelEntry({
    ...input, id: corrected.id, correction_reason: 'Edit after void'
  }), /voided fuel entry is immutable/i);
});

test('driver fuel advances reconcile against actual fuel only and cannot be overspent', async () => {
  setup();
  const dealer = await createDealer();
  const hire = await dataService.saveVehicleHireContract(hireInput(dealer.id));
  const advance = await dataService.recordVehicleDriverFuelAdvance({
    hire_id: hire.id, asset_id: undefined, project_id: project.id, site_name: 'North Gate',
    driver_name: 'Operator One', advance_date: '2026-10-24', amount: 1000, method: 'upi',
    transaction_reference: 'DRIVER-ADV-1', idempotency_key: 'driver-advance-1', employee_id: PRESET_USERS.admin.user_id!,
    employee_name: PRESET_USERS.admin.full_name
  });
  const fuelInput = {
    hire_id: hire.id, dealer_id: dealer.id, project_id: project.id, site_name: 'North Gate', fuel_date: '2026-10-25',
    fuel_type: 'diesel' as const, quantity_litres: 10, price_per_litre: 80, total_amount: 0,
    supplier: 'Local pump', payer: 'driver_advance' as const, driver_advance_id: advance.id,
    driver_advance_amount: 0, idempotency_key: 'driver-fuel-entry-1', reimbursement_confirmed: false, employee_id: PRESET_USERS.admin.user_id!,
    employee_name: PRESET_USERS.admin.full_name, receipt: { images: [] }
  };
  const entry = await dataService.recordVehicleFuelEntry(fuelInput);
  const retry = await dataService.recordVehicleFuelEntry(fuelInput);
  assert.equal(retry.id, entry.id);
  assert.equal((await dataService.getVehicleFuelEntries()).length, 1);
  assert.equal(entry.total_amount, 800);
  assert.equal(advance.amount - (await dataService.getVehicleFuelEntries()).reduce((sum, row) => sum + row.total_amount, 0), 200);
  await assert.rejects(dataService.recordVehicleFuelEntry({ ...fuelInput, quantity_litres: 3, idempotency_key: 'driver-fuel-entry-2' }), /exceed the unreconciled/i);
  assert.equal(calculateVehicleFuelAmount(10, 80), 800);
});

test('dealer-paid fuel affects payable only after authorized explicit confirmation', async () => {
  setup();
  const dealer = await createDealer();
  const baseHire = await dataService.saveVehicleHireContract(hireInput(dealer.id, { advance_amount: 0, registration_number: 'KA-02-CD-5678' }));
  await dataService.finalizeVehicleHireReturn({
    hire_id: baseHire.id, actual_return_at: '2026-10-26T17:00', billable_usage: 2,
    return_condition: 'Good', additional_charges: 0, discount: 0, attachments: { images: [] }
  });
  const baseFuel = {
    hire_id: baseHire.id, dealer_id: dealer.id, project_id: project.id, site_name: 'North Gate',
    fuel_date: '2026-10-25', fuel_type: 'diesel' as const, quantity_litres: 5, price_per_litre: 100,
    meter_reading: 150, supplier: 'Local pump', payer: 'dealer_paid' as const, driver_advance_amount: 0,
    idempotency_key: 'dealer-fuel-entry-1',
    reimbursement_confirmed: false, employee_id: PRESET_USERS.admin.user_id!, employee_name: PRESET_USERS.admin.full_name,
    receipt: { images: [] }, confirm_dealer_reimbursement: false
  };
  const unconfirmed = await dataService.recordVehicleFuelEntry(baseFuel);
  assert.equal(unconfirmed.reimbursement_confirmed, false);
  assert.equal(calculateDealerOutstanding(dealer.id, await dataService.getVehicleHireContracts(), await dataService.getVehicleHireReturns(), await dataService.getVehicleDealerPayments(), [unconfirmed]), 800);
  const confirmed = await dataService.recordVehicleFuelEntry({ ...baseFuel, id: unconfirmed.id, confirm_dealer_reimbursement: true });
  assert.equal(confirmed.reimbursement_confirmed, true);
  assert.equal(calculateDealerOutstanding(dealer.id, await dataService.getVehicleHireContracts(), await dataService.getVehicleHireReturns(), await dataService.getVehicleDealerPayments(), [confirmed]), 1300);
  dataService.setCurrentUser({ ...PRESET_USERS.admin, role: 'site_supervisor' });
  await assert.rejects(dataService.recordVehicleFuelEntry({ ...baseFuel, id: confirmed.id, confirm_dealer_reimbursement: true }), /Only a Company Administrator or Project Manager/i);
  dataService.setCurrentUser(PRESET_USERS.admin);
});
