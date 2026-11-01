import type { Employee } from '../types';

/** Returns the next shared company-wide worker code for all attendance add flows. */
export function getNextEmployeeCode(employees: Employee[]): string {
  const highestSequence = employees.reduce((highest, employee) => {
    const match = /^CHEN-(\d+)$/i.exec(employee.employee_code.trim());
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  return `CHEN-${String(highestSequence + 1).padStart(4, '0')}`;
}
