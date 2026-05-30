import { describe, expect, it } from "vitest";
import {
  calculateWeeklyHours,
  detectConflicts,
  isValidShiftTime,
  shiftDurationHours,
  shiftsOverlap,
} from "./rosterLogic";
import type { Employee, Shift } from "./types";

const employees: Employee[] = [{ id: "emp-1", name: "Alex", roles: ["Cashier"] }];

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
      day: "Mon",
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
      day: "Mon",
      startTime: "09:00",
      endTime: "13:00",
    };
    const second: Shift = {
      id: "shift-2",
      employeeId: "emp-1",
      day: "Mon",
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
      day: "Mon",
      startTime: "09:00",
      endTime: "13:00",
    };
    const second: Shift = {
      id: "shift-2",
      employeeId: "emp-1",
      day: "Mon",
      startTime: "13:00",
      endTime: "17:00",
    };

    expect(shiftsOverlap(first, second)).toBe(false);
    expect(detectConflicts([first, second], employees)).toHaveLength(0);
  });

  it("does not flag same-time shifts for different employees", () => {
    const secondEmployee = { id: "emp-2", name: "Jamie", roles: ["Cook"] };
    const shifts: Shift[] = [
      {
        id: "shift-1",
        employeeId: "emp-1",
        day: "Mon",
        startTime: "09:00",
        endTime: "13:00",
      },
      {
        id: "shift-2",
        employeeId: "emp-2",
        day: "Mon",
        startTime: "09:00",
        endTime: "13:00",
      },
    ];

    expect(detectConflicts(shifts, [...employees, secondEmployee])).toHaveLength(0);
  });

  it("flags shifts after five consecutive worked days", () => {
    const shifts: Shift[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => ({
      id: `shift-${index}`,
      employeeId: "emp-1",
      day: day as Shift["day"],
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
        day: "Mon",
        startTime: "09:00",
        endTime: "17:00",
      },
      {
        id: "shift-2",
        employeeId: "emp-1",
        day: "Tue",
        startTime: "10:00",
        endTime: "15:30",
      },
    ];

    expect(calculateWeeklyHours(employees, shifts)[0].totalHours).toBe(13.5);
  });
});
