import { DAYS, type Conflict, type Employee, type Shift } from "./types";

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
    a.day === b.day &&
    timeToMinutes(a.startTime) < timeToMinutes(b.endTime) &&
    timeToMinutes(b.startTime) < timeToMinutes(a.endTime)
  );
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
    const workedDays = new Set(
      shifts.filter((shift) => shift.employeeId === employee.id).map((shift) => shift.day),
    );
    let consecutive = 0;
    const flaggedDays = new Set<string>();

    for (const day of DAYS) {
      if (workedDays.has(day)) {
        consecutive += 1;
        if (consecutive > 5) {
          flaggedDays.add(day);
        }
      } else {
        consecutive = 0;
      }
    }

    if (flaggedDays.size > 0) {
      for (const shift of shifts) {
        if (shift.employeeId === employee.id && flaggedDays.has(shift.day)) {
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
