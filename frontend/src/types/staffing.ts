// Staffing types
export interface StaffingTable {
  id: number;
  branchId: number;
  position: string;
  requiredRate: number;
  branch?: { id: number; name: string };
}

export type EmployeeAttendanceStatus = 'PRESENT' | 'ABSENT' | 'SICK' | 'VACATION';

export interface EmployeeAttendance {
  id: number;
  employeeId: number;
  date: string;
  status: EmployeeAttendanceStatus;
  hoursWorked: number;
  notes: string | null;
  employee?: { id: number; firstName: string; lastName: string; position: string };
}

export interface StaffingReport {
  branchId: number;
  branchName: string;
  position: string;
  requiredRate: number;
  currentRate: number;
  deficit: number;
}
