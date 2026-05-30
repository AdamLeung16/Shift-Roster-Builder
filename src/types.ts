export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const DEFAULT_ROLES = ["Cashier", "Supervisor", "Cook"] as const;

export type Weekday = (typeof WEEKDAYS)[number];
export type DateString = `${number}-${number}-${number}`;

export type Employee = {
  id: string;
  name: string;
  roles: string[];
};

export type Shift = {
  id: string;
  employeeId: string;
  date: DateString;
  startTime: string;
  endTime: string;
  role?: string;
};

export type ConflictType = "overlap" | "too_many_consecutive_days";

export type Conflict = {
  shiftId: string;
  type: ConflictType;
  message: string;
};

export type RosterData = {
  employees: Employee[];
  shifts: Shift[];
};
