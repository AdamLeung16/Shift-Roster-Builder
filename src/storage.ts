import type { RosterData } from "./types";

const STORAGE_KEY = "shift-roster-builder:data";

export const starterData: RosterData = {
  employees: [
    { id: "emp-alex", name: "Alex Chen", roles: ["Supervisor", "Cashier"] },
    { id: "emp-jamie", name: "Jamie Patel", roles: ["Cook"] },
    { id: "emp-sam", name: "Sam Rivera", roles: ["Cashier", "Cook"] },
  ],
  shifts: [
    {
      id: "shift-1",
      employeeId: "emp-alex",
      day: "Mon",
      startTime: "09:00",
      endTime: "17:00",
      role: "Supervisor",
    },
    {
      id: "shift-2",
      employeeId: "emp-jamie",
      day: "Tue",
      startTime: "10:00",
      endTime: "16:00",
      role: "Cook",
    },
  ],
};

export function loadRosterData(): RosterData {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return starterData;
  }

  try {
    const parsed = JSON.parse(stored) as RosterData;
    if (Array.isArray(parsed.employees) && Array.isArray(parsed.shifts)) {
      return parsed;
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return starterData;
}

export function saveRosterData(data: RosterData) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearRosterData() {
  window.localStorage.removeItem(STORAGE_KEY);
}
