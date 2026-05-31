import { describe, expect, it } from "vitest";
import {
  calculateWeeklyHours,
  detectConflicts,
  filterShiftsByDateRange,
  getMonthCalendarDates,
  getMonthWeekStarts,
  getWeekDates,
  getWeekStart,
  isEmployeeUnavailableOnDate,
  isValidShiftTime,
  shiftDurationHours,
  shiftsOverlap,
  toDateString,
} from "./rosterLogic";
import { WEEKDAYS, type Employee, type Shift } from "./types";
import { starterData } from "./storage";

const employees: Employee[] = [{ id: "emp-1", name: "Alex", roles: ["Cashier"], unavailableDays: [] }];

describe("rosterLogic", () => {
  it("validates shift times", () => {
    expect(isValidShiftTime("09:00", "17:00")).toBe(true);
    expect(isValidShiftTime("17:00", "09:00")).toBe(false);
    expect(isValidShiftTime("09:00", "09:00")).toBe(false);
  });

  it("calculates shift duration", () => {
    const shift: Shift = {
      id: "shift-1",
      employeeId: "emp-1",
      date: "2026-06-01",
      startTime: "09:30",
      endTime: "17:00",
      role: "Cashier",
    };
    expect(shiftDurationHours(shift)).toBe(7.5);
  });

  it("detects overlapping shifts for the same employee and day", () => {
    const first: Shift = {
      id: "shift-1",
      employeeId: "emp-1",
      date: "2026-06-01",
      startTime: "09:00",
      endTime: "13:00",
    };
    const second: Shift = {
      id: "shift-2",
      employeeId: "emp-1",
      date: "2026-06-01",
      startTime: "12:00",
      endTime: "16:00",
    };

    expect(shiftsOverlap(first, second)).toBe(true);
    expect(detectConflicts([first, second], employees)).toHaveLength(2);
  });

  it("does not flag adjacent shifts as overlapping", () => {
    const first: Shift = {
      id: "shift-1",
      employeeId: "emp-1",
      date: "2026-06-01",
      startTime: "09:00",
      endTime: "13:00",
    };
    const second: Shift = {
      id: "shift-2",
      employeeId: "emp-1",
      date: "2026-06-01",
      startTime: "13:00",
      endTime: "17:00",
    };

    expect(shiftsOverlap(first, second)).toBe(false);
    expect(detectConflicts([first, second], employees)).toHaveLength(0);
  });

  it("does not flag same-time shifts for different employees", () => {
    const secondEmployee = { id: "emp-2", name: "Jamie", roles: ["Cook"], unavailableDays: [] };
    const shifts: Shift[] = [
      {
        id: "shift-1",
        employeeId: "emp-1",
        date: "2026-06-01",
        startTime: "09:00",
        endTime: "13:00",
      },
      {
        id: "shift-2",
        employeeId: "emp-2",
        date: "2026-06-01",
        startTime: "09:00",
        endTime: "13:00",
      },
    ];

    expect(detectConflicts(shifts, [...employees, secondEmployee])).toHaveLength(0);
  });

  it("flags shifts after five consecutive worked days", () => {
    const shifts: Shift[] = ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05", "2026-06-06"].map((date, index) => ({
      id: `shift-${index}`,
      employeeId: "emp-1",
      date: date as Shift["date"],
      startTime: "09:00",
      endTime: "17:00",
    }));

    const conflicts = detectConflicts(shifts, employees);
    expect(conflicts).toEqual([
      {
        shiftId: "shift-5",
        type: "too_many_consecutive_days",
        message: "Employee is scheduled more than 5 consecutive days.",
      },
    ]);
  });

  it("summarizes weekly hours by employee", () => {
    const shifts: Shift[] = [
      {
        id: "shift-1",
        employeeId: "emp-1",
        date: "2026-06-01",
        startTime: "09:00",
        endTime: "17:00",
      },
      {
        id: "shift-2",
        employeeId: "emp-1",
        date: "2026-06-02",
        startTime: "10:00",
        endTime: "15:30",
      },
    ];

    expect(calculateWeeklyHours(employees, shifts)[0].totalHours).toBe(13.5);
  });

  it("builds a Monday-based week and filters shifts into that week", () => {
    const weekStart = getWeekStart(new Date("2026-06-03T12:00:00"));
    const weekDates = getWeekDates(weekStart);
    const shifts: Shift[] = [
      {
        id: "shift-1",
        employeeId: "emp-1",
        date: "2026-06-01",
        startTime: "09:00",
        endTime: "17:00",
      },
      {
        id: "shift-2",
        employeeId: "emp-1",
        date: "2026-06-08",
        startTime: "09:00",
        endTime: "17:00",
      },
    ];

    expect(toDateString(weekStart)).toBe("2026-06-01");
    expect(weekDates).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
      "2026-06-05",
      "2026-06-06",
      "2026-06-07",
    ]);
    expect(filterShiftsByDateRange(shifts, weekDates)).toHaveLength(1);
  });

  it("lists selectable week starts for a chosen month", () => {
    expect(getMonthWeekStarts(2026, 4)).toEqual([
      "2026-04-27",
      "2026-05-04",
      "2026-05-11",
      "2026-05-18",
      "2026-05-25",
    ]);
  });

  it("builds a Monday-starting month calendar grid", () => {
    const dates = getMonthCalendarDates(2026, 4);

    expect(dates[0]).toBe("2026-04-27");
    expect(dates.at(-1)).toBe("2026-05-31");
    expect(dates).toContain("2026-05-01");
    expect(dates).toContain("2026-05-31");
    expect(dates.length % 7).toBe(0);
  });

  it("includes trailing dates for months that end before Sunday", () => {
    const dates = getMonthCalendarDates(2026, 5);

    expect(dates[0]).toBe("2026-06-01");
    expect(dates.at(-1)).toBe("2026-07-05");
    expect(dates).toContain("2026-07-01");
  });

  it("checks employee unavailable weekdays against a concrete date", () => {
    const employee: Employee = {
      id: "emp-2",
      name: "Jamie",
      roles: ["Cook"],
      unavailableDays: ["Tue"],
    };

    expect(isEmployeeUnavailableOnDate(employee, "2026-06-02")).toBe(true);
    expect(isEmployeeUnavailableOnDate(employee, "2026-06-03")).toBe(false);
  });

  it("provides a 20-person starter team with valid roles and preferred days off", () => {
    const roleSet = new Set(starterData.employees.flatMap((employee) => employee.roles));
    const weekdaySet = new Set(WEEKDAYS);

    expect(starterData.employees).toHaveLength(20);
    expect(roleSet.has("Cashier")).toBe(true);
    expect(roleSet.has("Supervisor")).toBe(true);
    expect(roleSet.has("Cook")).toBe(true);

    for (const employee of starterData.employees) {
      expect(employee.roles.length).toBeGreaterThanOrEqual(1);
      expect(employee.roles.length).toBeLessThanOrEqual(3);
      expect(employee.roles.every((role) => role.trim().length > 0)).toBe(true);
      expect(employee.unavailableDays.length).toBeLessThanOrEqual(2);
      expect(employee.unavailableDays.every((day) => weekdaySet.has(day))).toBe(true);
    }
  });

  it("provides conflict-free starter shifts for the current week", () => {
    const employeeById = new Map(starterData.employees.map((employee) => [employee.id, employee]));
    const weekDates = new Set(getWeekDates(getWeekStart()));

    expect(starterData.shifts.length).toBeGreaterThan(0);
    expect(detectConflicts(starterData.shifts, starterData.employees)).toHaveLength(0);

    for (const shift of starterData.shifts) {
      const employee = employeeById.get(shift.employeeId);

      expect(weekDates.has(shift.date)).toBe(true);
      expect(employee).toBeDefined();
      expect(isValidShiftTime(shift.startTime, shift.endTime)).toBe(true);
      expect(employee?.roles.includes(shift.role ?? "")).toBe(true);
      expect(employee && isEmployeeUnavailableOnDate(employee, shift.date)).toBe(false);
    }
  });
});
