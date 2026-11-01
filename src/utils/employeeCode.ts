import type { Employee } from '../types';

const EMPLOYEE_CODE_SEQUENCE_KEY = 'buildpulse_attendance_employee_code_sequence_v1';

function sequenceFromCode(code: string): number {
  const match = /^CHEN-(\d+)$/i.exec(code.trim());
  return match ? Number(match[1]) : 0;
}

function storedEmployeeCodeSequence(): number {
  const stored = Number(localStorage.getItem(EMPLOYEE_CODE_SEQUENCE_KEY) || 0);
  return Number.isSafeInteger(stored) && stored > 0 ? stored : 0;
}

function saveEmployeeCodeSequence(sequence: number): void {
  localStorage.setItem(EMPLOYEE_CODE_SEQUENCE_KEY, String(sequence));
}

/** Returns the next shared company-wide worker code for all attendance add flows. */
export function getNextEmployeeCode(employees: Employee[]): string {
  const highestSequence = employees.reduce((highest, employee) => {
    return Math.max(highest, sequenceFromCode(employee.employee_code));
  }, storedEmployeeCodeSequence());

  // Keep a high-water mark so deleting the latest employee never makes its ID
  // available for reuse. The buildpulse_ key also travels in shared app_state.
  saveEmployeeCodeSequence(highestSequence);

  return `CHEN-${String(highestSequence + 1).padStart(4, '0')}`;
}

/** Records a successfully created ID before future deletions can remove it. */
export function recordIssuedEmployeeCode(code: string): void {
  const sequence = sequenceFromCode(code);
  if (sequence > storedEmployeeCodeSequence()) saveEmployeeCodeSequence(sequence);
}
