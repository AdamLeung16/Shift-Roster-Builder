import type { Employee, RosterData } from "./types";
import { WEEKDAYS, type DateString, type Shift, type Weekday } from "./types";
import { addDays, getWeekStart, toDateString } from "./rosterLogic";

const STORAGE_KEY = "shift-roster-builder:data";

function dateForCurrentWeekday(day: Weekday): DateString {
  const weekStart = getWeekStart();
  const dayIndex = WEEKDAYS.indexOf(day);
  return toDateString(addDays(weekStart, dayIndex));
}

export const starterData: RosterData = {
  employees: [
    { id: "emp-ava", name: "Ava Thompson", roles: ["Cashier", "Barista"], unavailableDays: ["Thu"] },
    { id: "emp-ben", name: "Ben Carter", roles: ["Cook"], unavailableDays: ["Tue"] },
    { id: "emp-chloe", name: "Chloe Martin", roles: ["Supervisor", "Cashier"], unavailableDays: ["Sat"] },
    { id: "emp-daniel", name: "Daniel Wright", roles: ["Cook", "Stocker"], unavailableDays: ["Mon"] },
    { id: "emp-emma", name: "Emma Lewis", roles: ["Cashier"], unavailableDays: ["Sun"] },
    { id: "emp-felix", name: "Felix Young", roles: ["Supervisor", "Cook"], unavailableDays: ["Wed"] },
    { id: "emp-grace", name: "Grace Kim", roles: ["Cashier", "Cleaning Staff"], unavailableDays: ["Fri"] },
    { id: "emp-henry", name: "Henry Brooks", roles: ["Cook", "Cashier"], unavailableDays: ["Thu", "Sun"] },
    { id: "emp-isla", name: "Isla Green", roles: ["Supervisor"], unavailableDays: ["Tue"] },
    { id: "emp-jack", name: "Jack Rivera", roles: ["Stocker", "Cashier"], unavailableDays: [] },
    { id: "emp-lily", name: "Lily Evans", roles: ["Cook", "Barista"], unavailableDays: ["Mon"] },
    { id: "emp-mason", name: "Mason Hall", roles: ["Cashier", "Supervisor", "Cook"], unavailableDays: ["Sat"] },
    { id: "emp-nora", name: "Nora Scott", roles: ["Cleaning Staff"], unavailableDays: ["Wed"] },
    { id: "emp-oliver", name: "Oliver Adams", roles: ["Cook"], unavailableDays: ["Fri"] },
    { id: "emp-piper", name: "Piper Ward", roles: ["Cashier", "Barista"], unavailableDays: ["Tue", "Sun"] },
    { id: "emp-quinn", name: "Quinn Baker", roles: ["Supervisor", "Stocker"], unavailableDays: ["Mon"] },
    { id: "emp-ruby", name: "Ruby Nelson", roles: ["Cashier", "Cook"], unavailableDays: ["Thu"] },
    { id: "emp-samuel", name: "Samuel Price", roles: ["Cook", "Cleaning Staff"], unavailableDays: [] },
    { id: "emp-tara", name: "Tara Hughes", roles: ["Supervisor", "Cashier"], unavailableDays: ["Fri"] },
    { id: "emp-victor", name: "Victor Chen", roles: ["Stocker", "Barista", "Cashier"], unavailableDays: ["Wed"] },
  ],
  shifts: [
    { id: "shift-mon-ava", employeeId: "emp-ava", date: dateForCurrentWeekday("Mon"), startTime: "08:00", endTime: "14:00", role: "Cashier" },
    { id: "shift-mon-chloe", employeeId: "emp-chloe", date: dateForCurrentWeekday("Mon"), startTime: "09:00", endTime: "17:00", role: "Supervisor" },
    { id: "shift-mon-ben", employeeId: "emp-ben", date: dateForCurrentWeekday("Mon"), startTime: "10:00", endTime: "18:00", role: "Cook" },
    { id: "shift-mon-grace", employeeId: "emp-grace", date: dateForCurrentWeekday("Mon"), startTime: "12:00", endTime: "18:00", role: "Cashier" },
    { id: "shift-mon-samuel", employeeId: "emp-samuel", date: dateForCurrentWeekday("Mon"), startTime: "14:00", endTime: "20:00", role: "Cook" },

    { id: "shift-tue-mason", employeeId: "emp-mason", date: dateForCurrentWeekday("Tue"), startTime: "08:00", endTime: "13:00", role: "Cashier" },
    { id: "shift-tue-felix", employeeId: "emp-felix", date: dateForCurrentWeekday("Tue"), startTime: "09:00", endTime: "17:00", role: "Supervisor" },
    { id: "shift-tue-lily", employeeId: "emp-lily", date: dateForCurrentWeekday("Tue"), startTime: "10:00", endTime: "18:00", role: "Cook" },
    { id: "shift-tue-jack", employeeId: "emp-jack", date: dateForCurrentWeekday("Tue"), startTime: "12:00", endTime: "18:00", role: "Cashier" },
    { id: "shift-tue-ruby", employeeId: "emp-ruby", date: dateForCurrentWeekday("Tue"), startTime: "14:00", endTime: "20:00", role: "Cook" },

    { id: "shift-wed-emma", employeeId: "emp-emma", date: dateForCurrentWeekday("Wed"), startTime: "08:00", endTime: "14:00", role: "Cashier" },
    { id: "shift-wed-isla", employeeId: "emp-isla", date: dateForCurrentWeekday("Wed"), startTime: "09:00", endTime: "17:00", role: "Supervisor" },
    { id: "shift-wed-oliver", employeeId: "emp-oliver", date: dateForCurrentWeekday("Wed"), startTime: "10:00", endTime: "18:00", role: "Cook" },
    { id: "shift-wed-mason", employeeId: "emp-mason", date: dateForCurrentWeekday("Wed"), startTime: "12:00", endTime: "18:00", role: "Cashier" },
    { id: "shift-wed-henry", employeeId: "emp-henry", date: dateForCurrentWeekday("Wed"), startTime: "14:00", endTime: "20:00", role: "Cook" },

    { id: "shift-thu-tara", employeeId: "emp-tara", date: dateForCurrentWeekday("Thu"), startTime: "08:00", endTime: "14:00", role: "Cashier" },
    { id: "shift-thu-quinn", employeeId: "emp-quinn", date: dateForCurrentWeekday("Thu"), startTime: "09:00", endTime: "17:00", role: "Supervisor" },
    { id: "shift-thu-daniel", employeeId: "emp-daniel", date: dateForCurrentWeekday("Thu"), startTime: "10:00", endTime: "18:00", role: "Cook" },
    { id: "shift-thu-victor", employeeId: "emp-victor", date: dateForCurrentWeekday("Thu"), startTime: "12:00", endTime: "18:00", role: "Cashier" },
    { id: "shift-thu-lily", employeeId: "emp-lily", date: dateForCurrentWeekday("Thu"), startTime: "14:00", endTime: "20:00", role: "Cook" },

    { id: "shift-fri-ava", employeeId: "emp-ava", date: dateForCurrentWeekday("Fri"), startTime: "08:00", endTime: "14:00", role: "Cashier" },
    { id: "shift-fri-chloe", employeeId: "emp-chloe", date: dateForCurrentWeekday("Fri"), startTime: "09:00", endTime: "17:00", role: "Supervisor" },
    { id: "shift-fri-ben", employeeId: "emp-ben", date: dateForCurrentWeekday("Fri"), startTime: "10:00", endTime: "18:00", role: "Cook" },
    { id: "shift-fri-jack", employeeId: "emp-jack", date: dateForCurrentWeekday("Fri"), startTime: "12:00", endTime: "18:00", role: "Cashier" },
    { id: "shift-fri-samuel", employeeId: "emp-samuel", date: dateForCurrentWeekday("Fri"), startTime: "14:00", endTime: "20:00", role: "Cook" },

    { id: "shift-sat-emma", employeeId: "emp-emma", date: dateForCurrentWeekday("Sat"), startTime: "08:00", endTime: "14:00", role: "Cashier" },
    { id: "shift-sat-isla", employeeId: "emp-isla", date: dateForCurrentWeekday("Sat"), startTime: "09:00", endTime: "17:00", role: "Supervisor" },
    { id: "shift-sat-oliver", employeeId: "emp-oliver", date: dateForCurrentWeekday("Sat"), startTime: "10:00", endTime: "18:00", role: "Cook" },
    { id: "shift-sat-victor", employeeId: "emp-victor", date: dateForCurrentWeekday("Sat"), startTime: "12:00", endTime: "18:00", role: "Cashier" },
    { id: "shift-sat-ruby", employeeId: "emp-ruby", date: dateForCurrentWeekday("Sat"), startTime: "14:00", endTime: "20:00", role: "Cook" },

    { id: "shift-sun-grace", employeeId: "emp-grace", date: dateForCurrentWeekday("Sun"), startTime: "08:00", endTime: "14:00", role: "Cashier" },
    { id: "shift-sun-quinn", employeeId: "emp-quinn", date: dateForCurrentWeekday("Sun"), startTime: "09:00", endTime: "17:00", role: "Supervisor" },
    { id: "shift-sun-daniel", employeeId: "emp-daniel", date: dateForCurrentWeekday("Sun"), startTime: "10:00", endTime: "18:00", role: "Cook" },
    { id: "shift-sun-mason", employeeId: "emp-mason", date: dateForCurrentWeekday("Sun"), startTime: "12:00", endTime: "18:00", role: "Cashier" },
    { id: "shift-sun-felix", employeeId: "emp-felix", date: dateForCurrentWeekday("Sun"), startTime: "14:00", endTime: "20:00", role: "Cook" },
  ],
};

function normalizeEmployee(employee: Employee & { unavailableDays?: Weekday[] }): Employee {
  return {
    ...employee,
    unavailableDays: Array.isArray(employee.unavailableDays)
      ? WEEKDAYS.filter((day) => employee.unavailableDays?.includes(day))
      : [],
  };
}

function normalizeShift(shift: Shift & { day?: Weekday }): Shift {
  if (shift.date) {
    return shift;
  }

  return {
    ...shift,
    date: dateForCurrentWeekday(shift.day ?? "Mon"),
  };
}

export function loadRosterData(): RosterData {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return starterData;
  }

  try {
    const parsed = JSON.parse(stored) as RosterData;
    if (Array.isArray(parsed.employees) && Array.isArray(parsed.shifts)) {
      return {
        employees: parsed.employees.map(normalizeEmployee),
        shifts: parsed.shifts.map(normalizeShift),
      };
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
