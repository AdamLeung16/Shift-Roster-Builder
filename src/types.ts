export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type Day = (typeof DAYS)[number];

export type Employee = {
  id: string;
  name: string;
  roles: string[];
};

export type Shift = {
  id: string;
  employeeId: string;
  day: Day;
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
