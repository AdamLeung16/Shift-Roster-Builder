import { WEEKDAYS, type Conflict, type DateString, type Employee, type Shift, type Weekday } from "./types";

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function shiftDurationHours(shift: Shift): number {
  return (timeToMinutes(shift.endTime) - timeToMinutes(shift.startTime)) / 60;
}

export function isValidShiftTime(startTime: string, endTime: string): boolean {
  return timeToMinutes(endTime) > timeToMinutes(startTime);
}

export function shiftsOverlap(a: Shift, b: Shift): boolean {
  return (
    a.employeeId === b.employeeId &&
    a.date === b.date &&
    timeToMinutes(a.startTime) < timeToMinutes(b.endTime) &&
    timeToMinutes(b.startTime) < timeToMinutes(a.endTime)
  );
}

export function toDateString(date: Date): DateString {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}` as DateString;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getWeekStart(date = new Date()): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  return start;
}

export function getWeekDates(weekStart: Date): DateString[] {
  return WEEKDAYS.map((_, index) => toDateString(addDays(weekStart, index)));
}

export function getMonthWeekStarts(year: number, monthIndex: number): DateString[] {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0);
  const weekStarts: DateString[] = [];
  let cursor = getWeekStart(firstDayOfMonth);

  while (cursor <= lastDayOfMonth) {
    weekStarts.push(toDateString(cursor));
    cursor = addDays(cursor, 7);
  }

  return weekStarts;
}

export function getMonthCalendarDates(year: number, monthIndex: number): DateString[] {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0);
  const calendarStart = getWeekStart(firstDayOfMonth);
  const calendarEnd = addDays(getWeekStart(lastDayOfMonth), 6);
  const dates: DateString[] = [];
  let cursor = calendarStart;

  while (cursor <= calendarEnd) {
    dates.push(toDateString(cursor));
    cursor = addDays(cursor, 1);
  }

  return dates;
}

export function isSameDate(a: DateString, b: DateString): boolean {
  return a === b;
}

export function getWeekdayLabel(dateString: DateString): string {
  const day = new Date(`${dateString}T00:00:00`).getDay();
  return WEEKDAYS[day === 0 ? 6 : day - 1];
}

export function isEmployeeUnavailableOnDate(employee: Employee, dateString: DateString): boolean {
  return employee.unavailableDays.includes(getWeekdayLabel(dateString) as Weekday);
}

export function formatDateLabel(dateString: DateString): string {
  const date = new Date(`${dateString}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function detectConflicts(shifts: Shift[], employees: Employee[]): Conflict[] {
  const conflicts = new Map<string, Conflict[]>();

  const addConflict = (shiftId: string, conflict: Conflict) => {
    const existing = conflicts.get(shiftId) ?? [];
    if (!existing.some((item) => item.type === conflict.type && item.message === conflict.message)) {
      conflicts.set(shiftId, [...existing, conflict]);
    }
  };

  for (let index = 0; index < shifts.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < shifts.length; otherIndex += 1) {
      const current = shifts[index];
      const other = shifts[otherIndex];

      if (shiftsOverlap(current, other)) {
        const message = "Overlaps with another shift on the same day.";
        addConflict(current.id, { shiftId: current.id, type: "overlap", message });
        addConflict(other.id, { shiftId: other.id, type: "overlap", message });
      }
    }
  }

  for (const employee of employees) {
    const workedDates = Array.from(
      new Set(shifts.filter((shift) => shift.employeeId === employee.id).map((shift) => shift.date)),
    ).sort();
    let consecutive = 0;
    const flaggedDays = new Set<string>();
    let previousDate: Date | undefined;

    for (const dateString of workedDates) {
      const currentDate = new Date(`${dateString}T00:00:00`);
      const gapDays = previousDate
        ? Math.round((currentDate.getTime() - previousDate.getTime()) / 86_400_000)
        : 1;

      if (gapDays === 1) {
        consecutive += 1;
      } else {
        consecutive = 1;
      }

      if (consecutive > 5) {
        flaggedDays.add(dateString);
      }
      previousDate = currentDate;
    }

    if (flaggedDays.size > 0) {
      for (const shift of shifts) {
        if (shift.employeeId === employee.id && flaggedDays.has(shift.date)) {
          addConflict(shift.id, {
            shiftId: shift.id,
            type: "too_many_consecutive_days",
            message: "Employee is scheduled more than 5 consecutive days.",
          });
        }
      }
    }
  }

  return Array.from(conflicts.values()).flat();
}

export function getConflictsByShift(conflicts: Conflict[]): Map<string, Conflict[]> {
  const byShift = new Map<string, Conflict[]>();
  for (const conflict of conflicts) {
    byShift.set(conflict.shiftId, [...(byShift.get(conflict.shiftId) ?? []), conflict]);
  }
  return byShift;
}

export function calculateWeeklyHours(employees: Employee[], shifts: Shift[]) {
  return employees.map((employee) => {
    const totalHours = shifts
      .filter((shift) => shift.employeeId === employee.id)
      .reduce((total, shift) => total + Math.max(shiftDurationHours(shift), 0), 0);

    return {
      employeeId: employee.id,
      name: employee.name,
      totalHours,
    };
  });
}

export function filterShiftsByDateRange(shifts: Shift[], dateStrings: DateString[]): Shift[] {
  const visibleDates = new Set(dateStrings);
  return shifts.filter((shift) => visibleDates.has(shift.date));
}
