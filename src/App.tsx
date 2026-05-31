import { type CSSProperties, type DragEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CornerDownLeft,
  Download,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { DEFAULT_ROLES, WEEKDAYS, type DateString, type Employee, type Shift, type Weekday } from "./types";
import {
  calculateWeeklyHours,
  detectConflicts,
  filterShiftsByDateRange,
  formatDateLabel,
  getConflictsByShift,
  getMonthCalendarDates,
  getWeekDates,
  getWeekStart,
  getWeekdayLabel,
  isEmployeeUnavailableOnDate,
  isValidShiftTime,
  toDateString,
} from "./rosterLogic";
import { clearRosterData, loadRosterData, saveRosterData, starterData } from "./storage";

type EmployeeForm = {
  id?: string;
  name: string;
  roles: string[];
  customRole: string;
  unavailableDays: Weekday[];
};

type ShiftForm = {
  id?: string;
  employeeId: string;
  date: DateString;
  startTime: string;
  endTime: string;
  role: string;
};

const emptyEmployeeForm: EmployeeForm = {
  name: "",
  roles: [],
  customRole: "",
  unavailableDays: [],
};

type RoleColor = {
  background: string;
  border: string;
  text: string;
};

const FIXED_ROLE_COLORS: Record<string, RoleColor> = {
  Cashier: {
    background: "#dbeafe",
    border: "#93c5fd",
    text: "#1d4ed8",
  },
  Supervisor: {
    background: "#ede9fe",
    border: "#c4b5fd",
    text: "#6d28d9",
  },
  Cook: {
    background: "#ffedd5",
    border: "#fdba74",
    text: "#c2410c",
  },
};

const CUSTOM_ROLE_COLORS: RoleColor[] = [
  { background: "#fce7f3", border: "#f9a8d4", text: "#be185d" },
  { background: "#e0e7ff", border: "#a5b4fc", text: "#4338ca" },
  { background: "#fef3c7", border: "#fcd34d", text: "#b45309" },
  { background: "#fee2e2", border: "#fca5a5", text: "#b91c1c" },
  { background: "#e0f2fe", border: "#7dd3fc", text: "#0369a1" },
  { background: "#f3e8ff", border: "#d8b4fe", text: "#7e22ce" },
  { background: "#fae8ff", border: "#f0abfc", text: "#a21caf" },
  { background: "#cffafe", border: "#67e8f9", text: "#0e7490" },
  { background: "#ffe4e6", border: "#fda4af", text: "#be123c" },
  { background: "#e5e7eb", border: "#cbd5e1", text: "#334155" },
  { background: "#f5f5f4", border: "#d6d3d1", text: "#57534e" },
  { background: "#fffbeb", border: "#fbbf24", text: "#92400e" },
];

function createEmptyShiftForm(date: DateString): ShiftForm {
  return {
    employeeId: "",
    date,
    startTime: "09:00",
    endTime: "17:00",
    role: "",
  };
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatHours(hours: number) {
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
}

function uniqueRoles(roles: string[]) {
  return Array.from(new Set(roles.map((role) => role.trim()).filter(Boolean)));
}

function compareNames(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function hashRole(role: string) {
  return Array.from(role).reduce((hash, char) => hash + char.charCodeAt(0), 0);
}

function createRoleColorMap(roles: string[]) {
  const roleColorMap = new Map<string, RoleColor>();
  const customPalette = [...CUSTOM_ROLE_COLORS];

  uniqueRoles(roles)
    .sort(compareNames)
    .forEach((role) => {
      const fixedColor = FIXED_ROLE_COLORS[role];
      if (fixedColor) {
        roleColorMap.set(role, fixedColor);
        return;
      }

      if (customPalette.length > 0) {
        const colorIndex = hashRole(role) % customPalette.length;
        const [color] = customPalette.splice(colorIndex, 1);
        roleColorMap.set(role, color);
        return;
      }

      const hue = (hashRole(role) * 47) % 360;
      roleColorMap.set(role, {
        background: `hsl(${hue} 88% 94%)`,
        border: `hsl(${hue} 78% 78%)`,
        text: `hsl(${hue} 70% 32%)`,
      });
    });

  return roleColorMap;
}

function getConflictKey(conflict: { shiftId: string; type: string; message: string }) {
  return `${conflict.shiftId}:${conflict.type}:${conflict.message}`;
}

function App() {
  const today = new Date();
  const initialWeekStart = getWeekStart(today);
  const initialDate = toDateString(initialWeekStart);
  const [weekStart, setWeekStart] = useState<Date>(initialWeekStart);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isRosterDatePickerOpen, setIsRosterDatePickerOpen] = useState(false);
  const [isEmployeePickerOpen, setIsEmployeePickerOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeRoleFilter, setEmployeeRoleFilter] = useState("");
  const [employeeListSearch, setEmployeeListSearch] = useState("");
  const [employeeListRoleFilter, setEmployeeListRoleFilter] = useState("");
  const [employeeListPage, setEmployeeListPage] = useState(1);
  const [rosterEmployeeSearch, setRosterEmployeeSearch] = useState("");
  const [rosterRoleFilter, setRosterRoleFilter] = useState("");
  const [rosterPage, setRosterPage] = useState(1);
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [rosterCalendarYear, setRosterCalendarYear] = useState(today.getFullYear());
  const [rosterCalendarMonth, setRosterCalendarMonth] = useState(today.getMonth());
  const [shiftEditCalendarYear, setShiftEditCalendarYear] = useState(today.getFullYear());
  const [shiftEditCalendarMonth, setShiftEditCalendarMonth] = useState(today.getMonth());
  const [isShiftEditDatePickerOpen, setIsShiftEditDatePickerOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>(() => loadRosterData().employees);
  const [shifts, setShifts] = useState<Shift[]>(() => loadRosterData().shifts);
  const [employeeForm, setEmployeeForm] = useState<EmployeeForm>(emptyEmployeeForm);
  const [shiftForm, setShiftForm] = useState<ShiftForm>(() => createEmptyShiftForm(initialDate));
  const [shiftEditForm, setShiftEditForm] = useState<ShiftForm>(() => createEmptyShiftForm(initialDate));
  const [employeeError, setEmployeeError] = useState("");
  const [shiftError, setShiftError] = useState("");
  const [shiftEditError, setShiftEditError] = useState("");
  const [draggedShiftId, setDraggedShiftId] = useState<string | null>(null);
  const [dragError, setDragError] = useState("");

  const visibleDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const visibleShifts = useMemo(() => filterShiftsByDateRange(shifts, visibleDates), [shifts, visibleDates]);
  const calendarDates = useMemo(
    () => getMonthCalendarDates(calendarYear, calendarMonth),
    [calendarYear, calendarMonth],
  );
  const rosterCalendarDates = useMemo(
    () => getMonthCalendarDates(rosterCalendarYear, rosterCalendarMonth),
    [rosterCalendarYear, rosterCalendarMonth],
  );
  const shiftEditCalendarDates = useMemo(
    () => getMonthCalendarDates(shiftEditCalendarYear, shiftEditCalendarMonth),
    [shiftEditCalendarYear, shiftEditCalendarMonth],
  );

  useEffect(() => {
    saveRosterData({ employees, shifts });
  }, [employees, shifts]);

  useEffect(() => {
    if (!visibleDates.includes(shiftForm.date)) {
      setShiftForm((form) => ({ ...form, date: visibleDates[0] }));
    }
  }, [shiftForm.date, visibleDates]);

  const conflicts = useMemo(() => detectConflicts(shifts, employees), [shifts, employees]);
  const conflictsByShift = useMemo(() => getConflictsByShift(conflicts), [conflicts]);
  const weeklyHours = useMemo(() => {
    return calculateWeeklyHours(employees, visibleShifts).sort((a, b) => {
      if (b.totalHours !== a.totalHours) {
        return b.totalHours - a.totalHours;
      }
      return compareNames(a.name, b.name);
    });
  }, [employees, visibleShifts]);
  const totalShiftCount = visibleShifts.length;
  const totalHours = weeklyHours.reduce((sum, item) => sum + item.totalHours, 0);

  const selectedEmployee = employees.find((employee) => employee.id === shiftForm.employeeId);
  const allEmployeeRoles = useMemo(
    () => uniqueRoles(employees.flatMap((employee) => employee.roles)),
    [employees],
  );
  const roleColorMap = useMemo(() => createRoleColorMap(allEmployeeRoles), [allEmployeeRoles]);
  const getRoleTagStyle = (role: string): CSSProperties => {
    const color = roleColorMap.get(role);
    if (!color) {
      return {};
    }

    return {
      "--role-bg": color.background,
      "--role-border": color.border,
      "--role-text": color.text,
    } as CSSProperties;
  };
  const filteredEmployees = useMemo(() => {
    const searchText = employeeSearch.trim().toLowerCase();
    return employees.filter((employee) => {
      const matchesName = employee.name.toLowerCase().includes(searchText);
      const matchesRole = !employeeRoleFilter || employee.roles.includes(employeeRoleFilter);
      return matchesName && matchesRole;
    });
  }, [employeeRoleFilter, employeeSearch, employees]);
  const filteredEmployeeList = useMemo(() => {
    const searchText = employeeListSearch.trim().toLowerCase();
    return employees
      .filter((employee) => {
        const matchesName = employee.name.toLowerCase().includes(searchText);
        const matchesRole = !employeeListRoleFilter || employee.roles.includes(employeeListRoleFilter);
        return matchesName && matchesRole;
      })
      .sort((a, b) => compareNames(a.name, b.name));
  }, [employeeListRoleFilter, employeeListSearch, employees]);
  const filteredRosterEmployees = useMemo(() => {
    const searchText = rosterEmployeeSearch.trim().toLowerCase();
    return employees
      .filter((employee) => {
        const matchesName = employee.name.toLowerCase().includes(searchText);
        const matchesRole = !rosterRoleFilter || employee.roles.includes(rosterRoleFilter);
        return matchesName && matchesRole;
      })
      .sort((a, b) => compareNames(a.name, b.name));
  }, [employees, rosterEmployeeSearch, rosterRoleFilter]);
  const customRoles = employeeForm.roles.filter(
    (role) => !DEFAULT_ROLES.some((defaultRole) => defaultRole === role),
  );
  const employeesPerPage = 5;
  const employeePageCount = Math.max(1, Math.ceil(filteredEmployeeList.length / employeesPerPage));
  const visibleEmployeeList = filteredEmployeeList.slice(
    (employeeListPage - 1) * employeesPerPage,
    employeeListPage * employeesPerPage,
  );
  const rosterEmployeesPerPage = 10;
  const rosterPageCount = Math.max(1, Math.ceil(filteredRosterEmployees.length / rosterEmployeesPerPage));
  const visibleRosterEmployees = filteredRosterEmployees.slice(
    (rosterPage - 1) * rosterEmployeesPerPage,
    rosterPage * rosterEmployeesPerPage,
  );
  const weekRangeLabel = `${formatDateLabel(visibleDates[0])} - ${formatDateLabel(visibleDates[6])}`;
  const monthOptions = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const todayString = toDateString(today);
  const getShiftRoleForEmployee = (employee?: Employee, fallbackRole = "") => {
    if (!employee) {
      return "";
    }
    if (employeeRoleFilter && employee.roles.includes(employeeRoleFilter)) {
      return employeeRoleFilter;
    }
    if (fallbackRole && employee.roles.includes(fallbackRole)) {
      return fallbackRole;
    }
    return employee.roles[0] ?? "";
  };
  const getShiftRoleForTargetEmployee = (employee: Employee, fallbackRole = "") => {
    if (fallbackRole && employee.roles.includes(fallbackRole)) {
      return fallbackRole;
    }
    return employee.roles[0] ?? "";
  };
  const getAvailabilityError = (employee: Employee | undefined, date: DateString) => {
    if (!employee || !isEmployeeUnavailableOnDate(employee, date)) {
      return "";
    }

    return `${employee.name} prefers not to work on ${getWeekdayLabel(date)}. Choose another date or employee.`;
  };
  const validateShiftMove = (shift: Shift, targetEmployee: Employee, targetDate: DateString) => {
    const availabilityError = getAvailabilityError(targetEmployee, targetDate);
    if (availabilityError) {
      return availabilityError;
    }

    const nextShifts = shifts.map((item) =>
      item.id === shift.id
        ? {
            ...item,
            employeeId: targetEmployee.id,
            date: targetDate,
            role: getShiftRoleForTargetEmployee(targetEmployee, item.role),
          }
        : item,
    );
    const existingConflictKeys = new Set(
      conflicts.filter((conflict) => conflict.shiftId !== shift.id).map(getConflictKey),
    );
    const newConflicts = detectConflicts(nextShifts, employees).filter(
      (conflict) => conflict.shiftId === shift.id || !existingConflictKeys.has(getConflictKey(conflict)),
    );

    if (newConflicts.length > 0) {
      return newConflicts[0].message;
    }

    return "";
  };
  const validateShiftSave = (shiftPayload: Shift, employee: Employee | undefined) => {
    const availabilityError = getAvailabilityError(employee, shiftPayload.date);
    if (availabilityError) {
      return availabilityError;
    }

    const nextShifts = shifts.some((shift) => shift.id === shiftPayload.id)
      ? shifts.map((shift) => (shift.id === shiftPayload.id ? shiftPayload : shift))
      : [...shifts, shiftPayload];
    const existingConflictKeys = new Set(
      conflicts.filter((conflict) => conflict.shiftId !== shiftPayload.id).map(getConflictKey),
    );
    const newConflicts = detectConflicts(nextShifts, employees).filter(
      (conflict) => conflict.shiftId === shiftPayload.id || !existingConflictKeys.has(getConflictKey(conflict)),
    );

    return newConflicts[0]?.message ?? "";
  };

  useEffect(() => {
    if (!shiftForm.employeeId && employees.length > 0) {
      const firstEmployee = employees[0];
      setShiftForm((form) => ({
        ...form,
        employeeId: firstEmployee.id,
        role: getShiftRoleForEmployee(firstEmployee, form.role),
      }));
    }
  }, [employees, shiftForm.employeeId]);

  useEffect(() => {
    if (employeeRoleFilter && allEmployeeRoles.length > 0 && !allEmployeeRoles.includes(employeeRoleFilter)) {
      setEmployeeRoleFilter("");
    }
  }, [allEmployeeRoles, employeeRoleFilter]);

  useEffect(() => {
    if (
      employeeListRoleFilter &&
      allEmployeeRoles.length > 0 &&
      !allEmployeeRoles.includes(employeeListRoleFilter)
    ) {
      setEmployeeListRoleFilter("");
    }
  }, [allEmployeeRoles, employeeListRoleFilter]);

  useEffect(() => {
    if (rosterRoleFilter && allEmployeeRoles.length > 0 && !allEmployeeRoles.includes(rosterRoleFilter)) {
      setRosterRoleFilter("");
    }
  }, [allEmployeeRoles, rosterRoleFilter]);

  useEffect(() => {
    setEmployeeListPage(1);
  }, [employeeListRoleFilter, employeeListSearch]);

  useEffect(() => {
    setRosterPage(1);
  }, [rosterEmployeeSearch, rosterRoleFilter]);

  useEffect(() => {
    if (employeeListPage > employeePageCount) {
      setEmployeeListPage(employeePageCount);
    }
  }, [employeeListPage, employeePageCount]);

  useEffect(() => {
    if (rosterPage > rosterPageCount) {
      setRosterPage(rosterPageCount);
    }
  }, [rosterPage, rosterPageCount]);

  const openDatePicker = () => {
    const selectedDate = new Date(`${shiftForm.date}T00:00:00`);
    setCalendarYear(selectedDate.getFullYear());
    setCalendarMonth(selectedDate.getMonth());
    setIsDatePickerOpen((current) => !current);
  };

  const changeCalendarMonth = (offset: number) => {
    const nextDate = new Date(calendarYear, calendarMonth + offset, 1);
    setCalendarYear(nextDate.getFullYear());
    setCalendarMonth(nextDate.getMonth());
  };

  const openRosterDatePicker = () => {
    setRosterCalendarYear(weekStart.getFullYear());
    setRosterCalendarMonth(weekStart.getMonth());
    setIsRosterDatePickerOpen((current) => !current);
  };

  const changeRosterCalendarMonth = (offset: number) => {
    const nextDate = new Date(rosterCalendarYear, rosterCalendarMonth + offset, 1);
    setRosterCalendarYear(nextDate.getFullYear());
    setRosterCalendarMonth(nextDate.getMonth());
  };

  const selectShiftDate = (date: DateString) => {
    const selectedDate = new Date(`${date}T00:00:00`);
    setShiftForm((form) => ({ ...form, date }));
    setWeekStart(getWeekStart(selectedDate));
    setIsDatePickerOpen(false);
  };

  const selectRosterDate = (date: DateString) => {
    const selectedDate = new Date(`${date}T00:00:00`);
    setWeekStart(getWeekStart(selectedDate));
    setIsRosterDatePickerOpen(false);
  };

  const openShiftEditDatePicker = () => {
    const selectedDate = new Date(`${shiftEditForm.date}T00:00:00`);
    setShiftEditCalendarYear(selectedDate.getFullYear());
    setShiftEditCalendarMonth(selectedDate.getMonth());
    setIsShiftEditDatePickerOpen((current) => !current);
  };

  const changeShiftEditCalendarMonth = (offset: number) => {
    const nextDate = new Date(shiftEditCalendarYear, shiftEditCalendarMonth + offset, 1);
    setShiftEditCalendarYear(nextDate.getFullYear());
    setShiftEditCalendarMonth(nextDate.getMonth());
  };

  const selectShiftEditDate = (date: DateString) => {
    setShiftEditForm((form) => ({ ...form, date }));
    setIsShiftEditDatePickerOpen(false);
  };

  const jumpToThisWeek = () => {
    const currentDate = new Date();
    setWeekStart(getWeekStart(currentDate));
    setRosterCalendarYear(currentDate.getFullYear());
    setRosterCalendarMonth(currentDate.getMonth());
    setIsRosterDatePickerOpen(false);
  };

  const selectShiftEmployee = (employee: Employee) => {
    setShiftForm((form) => ({
      ...form,
      employeeId: employee.id,
      role: getShiftRoleForEmployee(employee, form.role),
    }));
    setIsEmployeePickerOpen(false);
  };

  const filterEmployeesByRole = (role: string) => {
    setEmployeeRoleFilter(role);
    setEmployeeSearch("");
    if (!role) {
      return;
    }

    const currentEmployee = employees.find((employee) => employee.id === shiftForm.employeeId);
    if (currentEmployee?.roles.includes(role)) {
      setShiftForm((form) => ({ ...form, role }));
      return;
    }

    const firstMatchingEmployee = employees.find((employee) => employee.roles.includes(role));
    if (firstMatchingEmployee) {
      setShiftForm((form) => ({
        ...form,
        employeeId: firstMatchingEmployee.id,
        role,
      }));
    }
  };

  const filterEmployeeListByRole = (role: string) => {
    setEmployeeListRoleFilter(role);
    setEmployeeListSearch("");
  };

  const toggleEmployeeRole = (role: string) => {
    setEmployeeForm((form) => ({
      ...form,
      roles: form.roles.includes(role)
        ? form.roles.filter((item) => item !== role)
        : [...form.roles, role],
    }));
  };

  const toggleUnavailableDay = (day: Weekday) => {
    setEmployeeForm((form) => ({
      ...form,
      unavailableDays: form.unavailableDays.includes(day)
        ? form.unavailableDays.filter((item) => item !== day)
        : [...form.unavailableDays, day],
    }));
  };

  const addCustomRole = () => {
    const role = employeeForm.customRole.trim();
    if (!role) {
      return;
    }

    setEmployeeForm((form) => ({
      ...form,
      roles: uniqueRoles([...form.roles, role]),
      customRole: "",
    }));
  };

  const submitEmployee = (event: React.FormEvent) => {
    event.preventDefault();
    const name = employeeForm.name.trim();
    const roles = uniqueRoles(employeeForm.roles);
    const unavailableDays = WEEKDAYS.filter((day) => employeeForm.unavailableDays.includes(day));

    if (!name) {
      setEmployeeError("Please enter an employee name.");
      return;
    }
    if (roles.length === 0) {
      setEmployeeError("Please select or add at least one role.");
      return;
    }

    if (employeeForm.id) {
      setEmployees((current) =>
        current.map((employee) =>
          employee.id === employeeForm.id ? { ...employee, name, roles, unavailableDays } : employee,
        ),
      );
      setShifts((current) =>
        current.map((shift) =>
          shift.employeeId === employeeForm.id && shift.role && !roles.includes(shift.role)
            ? { ...shift, role: roles[0] }
            : shift,
        ),
      );
    } else {
      setEmployees((current) => [
        ...current,
        { id: createId("emp"), name, roles, unavailableDays },
      ]);
    }

    setEmployeeForm(emptyEmployeeForm);
    setEmployeeError("");
    setIsEmployeeModalOpen(false);
  };

  const editEmployee = (employee: Employee) => {
    setEmployeeForm({
      id: employee.id,
      name: employee.name,
      roles: employee.roles,
      customRole: "",
      unavailableDays: employee.unavailableDays,
    });
    setEmployeeError("");
    setIsEmployeeModalOpen(true);
  };

  const openAddEmployeeModal = () => {
    setEmployeeForm(emptyEmployeeForm);
    setEmployeeError("");
    setIsEmployeeModalOpen(true);
  };

  const closeEmployeeModal = () => {
    setEmployeeForm(emptyEmployeeForm);
    setEmployeeError("");
    setIsEmployeeModalOpen(false);
  };

  const deleteEmployee = (employeeId: string) => {
    setEmployees((current) => current.filter((employee) => employee.id !== employeeId));
    setShifts((current) => current.filter((shift) => shift.employeeId !== employeeId));
    if (shiftForm.employeeId === employeeId) {
      setShiftForm((form) => ({ ...form, employeeId: "" }));
    }
  };

  const submitShift = (event: React.FormEvent) => {
    event.preventDefault();

    if (!shiftForm.employeeId) {
      setShiftError("Please choose an employee.");
      return;
    }
    if (!isValidShiftTime(shiftForm.startTime, shiftForm.endTime)) {
      setShiftError("End time must be later than start time.");
      return;
    }
    const shiftPayload: Shift = {
      id: shiftForm.id ?? createId("shift"),
      employeeId: shiftForm.employeeId,
      date: shiftForm.date,
      startTime: shiftForm.startTime,
      endTime: shiftForm.endTime,
      role: getShiftRoleForEmployee(selectedEmployee, shiftForm.role),
    };
    const saveError = validateShiftSave(shiftPayload, selectedEmployee);
    if (saveError) {
      setShiftError(saveError);
      return;
    }

    if (shiftForm.id) {
      setShifts((current) =>
        current.map((shift) => (shift.id === shiftForm.id ? shiftPayload : shift)),
      );
    } else {
      setShifts((current) => [...current, shiftPayload]);
    }

    setShiftForm({
      ...createEmptyShiftForm(shiftForm.date),
      employeeId: shiftForm.employeeId,
      role: getShiftRoleForEmployee(selectedEmployee, shiftForm.role),
    });
    setShiftError("");
  };

  const editShift = (shift: Shift) => {
    const shiftDate = new Date(`${shift.date}T00:00:00`);
    setShiftEditForm({
      id: shift.id,
      employeeId: shift.employeeId,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      role: shift.role ?? "",
    });
    setCalendarYear(shiftDate.getFullYear());
    setCalendarMonth(shiftDate.getMonth());
    setShiftEditCalendarYear(shiftDate.getFullYear());
    setShiftEditCalendarMonth(shiftDate.getMonth());
    setShiftEditError("");
    setIsShiftEditDatePickerOpen(false);
    setIsShiftModalOpen(true);
  };

  const submitShiftEdit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!shiftEditForm.id || !shiftEditForm.employeeId) {
      setShiftEditError("Please choose an employee.");
      return;
    }
    if (!isValidShiftTime(shiftEditForm.startTime, shiftEditForm.endTime)) {
      setShiftEditError("End time must be later than start time.");
      return;
    }

    const editEmployee = employees.find((employee) => employee.id === shiftEditForm.employeeId);
    const selectedDate = new Date(`${shiftEditForm.date}T00:00:00`);
    const shiftPayload: Shift = {
      id: shiftEditForm.id,
      employeeId: shiftEditForm.employeeId,
      date: shiftEditForm.date,
      startTime: shiftEditForm.startTime,
      endTime: shiftEditForm.endTime,
      role: getShiftRoleForEmployee(editEmployee, shiftEditForm.role),
    };
    const saveError = validateShiftSave(shiftPayload, editEmployee);
    if (saveError) {
      setShiftEditError(saveError);
      return;
    }

    setShifts((current) =>
      current.map((shift) => (shift.id === shiftEditForm.id ? shiftPayload : shift)),
    );
    setWeekStart(getWeekStart(selectedDate));
    setRosterCalendarYear(selectedDate.getFullYear());
    setRosterCalendarMonth(selectedDate.getMonth());
    setIsShiftModalOpen(false);
    setShiftEditError("");
  };

  const closeShiftModal = () => {
    setIsShiftModalOpen(false);
    setIsShiftEditDatePickerOpen(false);
    setShiftEditError("");
  };

  const deleteShift = (shiftId: string) => {
    setShifts((current) => current.filter((shift) => shift.id !== shiftId));
  };

  const confirmDeleteShift = () => {
    if (!shiftEditForm.id) {
      return;
    }

    const shouldDelete = window.confirm("Delete this shift?");
    if (!shouldDelete) {
      return;
    }

    deleteShift(shiftEditForm.id);
    closeShiftModal();
  };

  const startShiftDrag = (event: DragEvent<HTMLButtonElement>, shiftId: string) => {
    setDraggedShiftId(shiftId);
    setDragError("");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", shiftId);
  };

  const allowShiftDrop = (event: DragEvent<HTMLTableCellElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const dropShift = (event: DragEvent<HTMLTableCellElement>, employee: Employee, date: DateString) => {
    event.preventDefault();
    const shiftId = event.dataTransfer.getData("text/plain") || draggedShiftId;
    if (!shiftId) {
      return;
    }

    const shift = shifts.find((item) => item.id === shiftId);
    if (!shift) {
      setDraggedShiftId(null);
      return;
    }

    if (shift.employeeId === employee.id && shift.date === date) {
      setDraggedShiftId(null);
      return;
    }

    const moveError = validateShiftMove(shift, employee, date);
    if (moveError) {
      setDragError(moveError);
      setDraggedShiftId(null);
      return;
    }

    setShifts((current) =>
      current.map((item) =>
        item.id === shift.id
          ? {
              ...item,
              employeeId: employee.id,
              date,
              role: getShiftRoleForTargetEmployee(employee, item.role),
            }
          : item,
      ),
    );
    setDragError("");
    setDraggedShiftId(null);
  };

  const endShiftDrag = () => {
    setDraggedShiftId(null);
  };

  const resetDemoData = () => {
    clearRosterData();
    const currentWeekStart = getWeekStart();
    const currentDate = new Date();
    setCalendarYear(currentDate.getFullYear());
    setCalendarMonth(currentDate.getMonth());
    setRosterCalendarYear(currentDate.getFullYear());
    setRosterCalendarMonth(currentDate.getMonth());
    setWeekStart(currentWeekStart);
    setEmployees(starterData.employees);
    setShifts(starterData.shifts);
    setEmployeeForm(emptyEmployeeForm);
    setShiftForm({
      ...createEmptyShiftForm(toDateString(getWeekStart())),
      employeeId: starterData.employees[0]?.id ?? "",
      role: starterData.employees[0]?.roles[0] ?? "",
    });
    setShiftEditForm(createEmptyShiftForm(toDateString(getWeekStart())));
    setEmployeeSearch("");
    setEmployeeRoleFilter("");
    setEmployeeListSearch("");
    setEmployeeListRoleFilter("");
    setEmployeeListPage(1);
    setRosterEmployeeSearch("");
    setRosterRoleFilter("");
    setRosterPage(1);
    setShiftEditCalendarYear(currentDate.getFullYear());
    setShiftEditCalendarMonth(currentDate.getMonth());
    setIsEmployeePickerOpen(false);
    setIsEmployeeModalOpen(false);
    setIsShiftModalOpen(false);
    setIsDatePickerOpen(false);
    setIsRosterDatePickerOpen(false);
    setIsShiftEditDatePickerOpen(false);
    setDraggedShiftId(null);
    setDragError("");
  };

  const exportCsv = () => {
    const formatShiftForCsv = (shift: Shift) => `${shift.startTime}-${shift.endTime}`;
    const rows = [
      ["Employee", ...visibleDates.map((date) => `${getWeekdayLabel(date)} ${formatDateLabel(date)}`)],
      ...filteredRosterEmployees.map((employee) => [
        employee.name,
        ...visibleDates.map((date) => {
          const dayShifts = visibleShifts
            .filter((shift) => shift.employeeId === employee.id && shift.date === date)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          return dayShifts.map(formatShiftForCsv).join(", ");
        }),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${visibleDates[0]}_to_${visibleDates[6]}_roster.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">OPTIX</p>
          <h1>Shift Roster Builder</h1>
          <p className="hero-copy">
            A data-based wekkly staff schedule.
          </p>
        </div>
        <div className="hero-stats" aria-label="Roster overview">
          <div>
            <span>{employees.length}</span>
            <small>Employees</small>
          </div>
          <div>
            <span>{totalShiftCount}</span>
            <small>This Week</small>
          </div>
        </div>
      </header>

      <section className="toolbar" aria-label="Roster actions">
        <button className="secondary-button" type="button" onClick={resetDemoData}>
          <RefreshCcw size={16} />
          Reset demo data
        </button>
      </section>

      <section className="workspace">
        <aside className="side-panel">
          <section className="panel">
            <div className="panel-title employee-panel-title">
              <div>
                <Users size={18} />
                <h2>Employees</h2>
              </div>
              <button className="icon-text-button compact-button" type="button" onClick={openAddEmployeeModal}>
                <Plus size={15} />
                Add
              </button>
            </div>

            <div className="employee-list-controls" aria-label="Employee list filters">
              <label className="search-field">
                <Search size={15} />
                <input
                  value={employeeListSearch}
                  onChange={(event) => setEmployeeListSearch(event.target.value)}
                  placeholder="Search employee name"
                />
              </label>
              <div className="role-filter-list" aria-label="Filter employee list by role">
                <button
                  className={!employeeListRoleFilter ? "active" : ""}
                  type="button"
                  onClick={() => filterEmployeeListByRole("")}
                >
                  All
                </button>
                {allEmployeeRoles.map((role) => (
                  <button
                    className={[
                      "role-color-filter",
                      employeeListRoleFilter === role ? "active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={role}
                    style={getRoleTagStyle(role)}
                    type="button"
                    onClick={() => filterEmployeeListByRole(role)}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div className="employee-list">
              {employees.length === 0 ? (
                <p className="empty-state">No employees yet. Add one to start scheduling.</p>
              ) : visibleEmployeeList.length === 0 ? (
                <p className="empty-state">No employees match this search.</p>
              ) : (
                visibleEmployeeList.map((employee) => (
                  <article className="employee-card" key={employee.id}>
                    <div>
                      <strong>{employee.name}</strong>
                      <div className="role-tags">
                        {employee.roles.map((role) => (
                          <span key={role} style={getRoleTagStyle(role)}>
                            {role}
                          </span>
                        ))}
                      </div>
                      {employee.unavailableDays.length > 0 ? (
                        <small className="availability-note">
                          Prefers off: {employee.unavailableDays.join(", ")}
                        </small>
                      ) : null}
                    </div>
                    <div className="icon-actions">
                      <button
                        type="button"
                        aria-label={`Edit ${employee.name}`}
                        title={`Edit ${employee.name}`}
                        onClick={() => editEmployee(employee)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${employee.name}`}
                        title={`Delete ${employee.name}`}
                        onClick={() => deleteEmployee(employee.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
            {employees.length > 0 ? (
              <div className="pagination" aria-label="Employee list pagination">
                <button
                  type="button"
                  aria-label="Previous employee page"
                  title="Previous page"
                  onClick={() => setEmployeeListPage((page) => Math.max(1, page - 1))}
                  disabled={employeeListPage === 1}
                >
                  <ChevronLeft size={15} />
                </button>
                <div className="page-buttons">
                  {Array.from({ length: employeePageCount }, (_, index) => index + 1).map((page) => (
                    <button
                      className={employeeListPage === page ? "active" : ""}
                      key={page}
                      type="button"
                      onClick={() => setEmployeeListPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Next employee page"
                  title="Next page"
                  onClick={() => setEmployeeListPage((page) => Math.min(employeePageCount, page + 1))}
                  disabled={employeeListPage === employeePageCount}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            ) : null}
          </section>

          <section className="panel">
            <div className="panel-title">
              <Clock size={18} />
              <h2>Weekly Hours</h2>
            </div>
            <div className="hours-list">
              {weeklyHours.length === 0 ? (
                <p className="empty-state">Hours will appear after employees are added.</p>
              ) : (
                <>
                  <div className="hours-scroll" aria-label="Weekly employee hours">
                    {weeklyHours.map((item) => (
                      <div className="hours-row" key={item.employeeId}>
                        <span>{item.name}</span>
                        <strong>{formatHours(item.totalHours)}h</strong>
                      </div>
                    ))}
                  </div>
                  <div className="hours-total">
                    <span>Total assigned</span>
                    <strong>{formatHours(totalHours)}h</strong>
                  </div>
                </>
              )}
            </div>
          </section>
        </aside>

        <section className="main-panel">
          <section className="panel">
            <div className="panel-title">
              <CalendarDays size={18} />
              <h2>{shiftForm.id ? "Edit Shift" : "Assign Shift"}</h2>
            </div>
            <form className="shift-form" onSubmit={submitShift}>
              <div className="employee-picker">
                <span className="field-label">Employee</span>
                <button
                  className="employee-trigger"
                  type="button"
                  onClick={() => setIsEmployeePickerOpen((current) => !current)}
                  disabled={employees.length === 0}
                >
                  <span>{selectedEmployee?.name ?? "Add an employee first"}</span>
                  <small>
                    {employeeRoleFilter
                      ? `Filtered by ${employeeRoleFilter}`
                      : selectedEmployee?.roles.join(", ") || "No roles"}
                  </small>
                </button>
                {isEmployeePickerOpen ? (
                  <div className="employee-popover">
                    <label className="search-field">
                      <Search size={15} />
                      <input
                        value={employeeSearch}
                        onChange={(event) => setEmployeeSearch(event.target.value)}
                        placeholder="Search employee name"
                      />
                    </label>
                    <div className="role-filter-list" aria-label="Filter employees by role">
                      <button
                        className={!employeeRoleFilter ? "active" : ""}
                        type="button"
                        onClick={() => filterEmployeesByRole("")}
                      >
                        All
                      </button>
                      {allEmployeeRoles.map((role) => (
                        <button
                          className={employeeRoleFilter === role ? "active" : ""}
                          key={role}
                          type="button"
                          onClick={() => filterEmployeesByRole(role)}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                    <div className="employee-options">
                      {filteredEmployees.length === 0 ? (
                        <p className="empty-state">No employees match this search.</p>
                      ) : (
                        filteredEmployees.map((employee) => (
                          <button
                            className="employee-option"
                            key={employee.id}
                            type="button"
                            onClick={() => selectShiftEmployee(employee)}
                          >
                            <span>
                              <strong>{employee.name}</strong>
                              <small>{employee.roles.join(", ")}</small>
                            </span>
                            {shiftForm.employeeId === employee.id ? <Check size={16} /> : null}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="date-picker">
                <span className="field-label">Date</span>
                <button className="date-trigger" type="button" onClick={openDatePicker}>
                  <span>{getWeekdayLabel(shiftForm.date)}</span>
                  <strong>{formatDateLabel(shiftForm.date)}</strong>
                </button>
                {isDatePickerOpen ? (
                  <div className="calendar-popover">
                    <div className="calendar-header">
                      <button
                        type="button"
                        aria-label="Previous month"
                        title="Previous month"
                        onClick={() => changeCalendarMonth(-1)}
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <strong>
                        {monthOptions[calendarMonth]} {calendarYear}
                      </strong>
                      <button
                        type="button"
                        aria-label="Next month"
                        title="Next month"
                        onClick={() => changeCalendarMonth(1)}
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                    <div className="calendar-grid">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                        <span className="calendar-weekday" key={day}>
                          {day}
                        </span>
                      ))}
                      {calendarDates.map((date) => {
                        const dateObject = new Date(`${date}T00:00:00`);
                        const isCurrentMonth = dateObject.getMonth() === calendarMonth;
                        const isSelected = date === shiftForm.date;
                        const isToday = date === todayString;
                        const isInVisibleWeek = visibleDates.includes(date);

                        return (
                          <button
                            className={[
                              "calendar-day",
                              isSelected ? "selected" : "",
                              isToday ? "today" : "",
                              isInVisibleWeek ? "in-visible-week" : "",
                              isCurrentMonth ? "" : "muted",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            key={date}
                            type="button"
                            onClick={() => selectShiftDate(date)}
                          >
                            {dateObject.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
              <label>
                Start
                <input
                  type="time"
                  value={shiftForm.startTime}
                  onChange={(event) =>
                    setShiftForm((form) => ({ ...form, startTime: event.target.value }))
                  }
                />
              </label>
              <label>
                End
                <input
                  type="time"
                  value={shiftForm.endTime}
                  onChange={(event) =>
                    setShiftForm((form) => ({ ...form, endTime: event.target.value }))
                  }
                />
              </label>
              <div className="shift-form-actions">
                <button className="primary-button" type="submit" disabled={employees.length === 0}>
                  <Plus size={16} />
                  {shiftForm.id ? "Save shift" : "Add shift"}
                </button>
                {shiftForm.id ? (
                  <button
                    className="text-button"
                    type="button"
                    onClick={() =>
                      setShiftForm({
                        ...createEmptyShiftForm(visibleDates[0]),
                        employeeId: employees[0]?.id ?? "",
                        role: employees[0]?.roles[0] ?? "",
                      })
                    }
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
            {shiftError ? (
              <p className="form-error warning-message">
                <AlertTriangle size={14} />
                {shiftError}
              </p>
            ) : null}
          </section>

          <section className="panel roster-panel">
            <div className="panel-title roster-title">
              <div>
                <CalendarDays size={18} />
                <h2>Weekly Roster</h2>
              </div>
              <span>{weekRangeLabel}</span>
            </div>
            <div className="week-picker" aria-label="Week selector">
              <div className="date-picker roster-date-picker">
                <span className="field-label">Jump to week</span>
                <div className="jump-week-control">
                  <button className="date-trigger" type="button" onClick={openRosterDatePicker}>
                    <span>{getWeekdayLabel(visibleDates[0])}</span>
                    <strong>{weekRangeLabel}</strong>
                  </button>
                  <button
                    className="icon-square-button"
                    type="button"
                    aria-label="Back to this week"
                    title="Back to this week"
                    onClick={jumpToThisWeek}
                  >
                    <CornerDownLeft size={16} />
                  </button>
                </div>
                {isRosterDatePickerOpen ? (
                  <div className="calendar-popover">
                    <div className="calendar-header">
                      <button
                        type="button"
                        aria-label="Previous roster month"
                        title="Previous month"
                        onClick={() => changeRosterCalendarMonth(-1)}
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <strong>
                        {monthOptions[rosterCalendarMonth]} {rosterCalendarYear}
                      </strong>
                      <button
                        type="button"
                        aria-label="Next roster month"
                        title="Next month"
                        onClick={() => changeRosterCalendarMonth(1)}
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                    <div className="calendar-grid">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                        <span className="calendar-weekday" key={day}>
                          {day}
                        </span>
                      ))}
                      {rosterCalendarDates.map((date) => {
                        const dateObject = new Date(`${date}T00:00:00`);
                        const isCurrentMonth = dateObject.getMonth() === rosterCalendarMonth;
                        const isSelected = visibleDates.includes(date);
                        const isToday = date === todayString;

                        return (
                          <button
                            className={[
                              "calendar-day",
                              isSelected ? "selected" : "",
                              isToday ? "today" : "",
                              isSelected ? "in-visible-week" : "",
                              isCurrentMonth ? "" : "muted",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            key={date}
                            type="button"
                            onClick={() => selectRosterDate(date)}
                          >
                            {dateObject.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="roster-filter-group">
                <label>
                  Roles
                  <select
                    value={rosterRoleFilter}
                    onChange={(event) => setRosterRoleFilter(event.target.value)}
                    aria-label="Filter roster by role"
                  >
                    <option value="">All</option>
                  {allEmployeeRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                  </select>
                </label>
              </div>
              <label className="search-field roster-search-field">
                <Search size={15} />
                <input
                  value={rosterEmployeeSearch}
                  onChange={(event) => setRosterEmployeeSearch(event.target.value)}
                  placeholder="Search employee name"
                />
              </label>
            </div>
            <div className="roster-export-row">
              <button className="secondary-button" type="button" onClick={exportCsv}>
                <Download size={16} />
                Export CSV
              </button>
            </div>
            {dragError ? (
              <p className="form-error roster-drag-error">
                <AlertTriangle size={14} />
                {dragError}
              </p>
            ) : null}
            <div className="roster-scroll">
              <table className="roster-grid">
                <thead>
                  <tr>
                    <th>Employee</th>
                    {visibleDates.map((date) => (
                      <th key={date}>
                        <span>{getWeekdayLabel(date)}</span>
                        <strong>{formatDateLabel(date)}</strong>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={visibleDates.length + 1} className="table-empty">
                        Add employees to build the weekly schedule.
                      </td>
                    </tr>
                  ) : filteredRosterEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={visibleDates.length + 1} className="table-empty">
                        No employees match this roster filter.
                      </td>
                    </tr>
                  ) : (
                    visibleRosterEmployees.map((employee) => (
                      <tr key={employee.id}>
                        <th className="employee-row-header" scope="row">
                          <span>{employee.name}</span>
                          <div className="role-tags roster-role-tags">
                            {employee.roles.map((role) => (
                              <span key={role} style={getRoleTagStyle(role)}>
                                {role}
                              </span>
                            ))}
                          </div>
                        </th>
                        {visibleDates.map((date) => {
                          const dayShifts = visibleShifts
                            .filter((shift) => shift.employeeId === employee.id && shift.date === date)
                            .sort((a, b) => a.startTime.localeCompare(b.startTime));

                          return (
                            <td
                              className={draggedShiftId ? "shift-drop-cell" : ""}
                              key={date}
                              onDragOver={allowShiftDrop}
                              onDrop={(event) => dropShift(event, employee, date)}
                            >
                              {dayShifts.length === 0 ? (
                                <span className="no-shift">-</span>
                              ) : (
                                dayShifts.map((shift) => {
                                  const shiftConflicts = conflictsByShift.get(shift.id) ?? [];
                                  return (
                                    <button
                                      className={`shift-chip ${
                                        shiftConflicts.length > 0 ? "has-conflict" : ""
                                      } ${draggedShiftId === shift.id ? "is-dragging" : ""}`}
                                      key={shift.id}
                                      type="button"
                                      draggable
                                      aria-label={`Open shift ${shift.startTime}-${shift.endTime}`}
                                      title="Drag to move, click to edit"
                                      onDragStart={(event) => startShiftDrag(event, shift.id)}
                                      onDragEnd={endShiftDrag}
                                      onClick={() => editShift(shift)}
                                    >
                                      <strong className="shift-time">
                                        {shift.startTime}-{shift.endTime}
                                      </strong>
                                      {shiftConflicts.length > 0 ? (
                                        <div className="conflict-note">
                                          <AlertTriangle size={13} />
                                          {shiftConflicts.map((conflict) => conflict.message).join(" ")}
                                        </div>
                                      ) : null}
                                    </button>
                                  );
                                })
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredRosterEmployees.length > 0 ? (
              <div className="pagination roster-pagination" aria-label="Roster pagination">
                <button
                  type="button"
                  aria-label="Previous roster page"
                  title="Previous page"
                  onClick={() => setRosterPage((page) => Math.max(1, page - 1))}
                  disabled={rosterPage === 1}
                >
                  <ChevronLeft size={15} />
                </button>
                <div className="page-buttons">
                  {Array.from({ length: rosterPageCount }, (_, index) => index + 1).map((page) => (
                    <button
                      className={rosterPage === page ? "active" : ""}
                      key={page}
                      type="button"
                      onClick={() => setRosterPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Next roster page"
                  title="Next page"
                  onClick={() => setRosterPage((page) => Math.min(rosterPageCount, page + 1))}
                  disabled={rosterPage === rosterPageCount}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            ) : null}
          </section>
        </section>
      </section>
      {isEmployeeModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-modal-title"
          >
            <div className="modal-header">
              <div>
                <Users size={18} />
                <h2 id="employee-modal-title">
                  {employeeForm.id ? "Edit Employee" : "Add Employee"}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close employee form"
                title="Close"
                onClick={closeEmployeeModal}
              >
                <X size={17} />
              </button>
            </div>
            <form className="stacked-form" onSubmit={submitEmployee}>
              <label>
                Name
                <input
                  value={employeeForm.name}
                  onChange={(event) =>
                    setEmployeeForm((form) => ({ ...form, name: event.target.value }))
                  }
                  placeholder="Alex Chen"
                />
              </label>
              <div className="field-group">
                <span className="field-label">Roles</span>
                <div className="role-menu role-menu-static">
                  {DEFAULT_ROLES.map((role) => (
                    <label className="checkbox-row" key={role}>
                      <input
                        type="checkbox"
                        checked={employeeForm.roles.includes(role)}
                        onChange={() => toggleEmployeeRole(role)}
                      />
                      {role}
                    </label>
                  ))}
                  {customRoles.length > 0 ? (
                    <div className="custom-role-list">
                      {customRoles.map((role) => (
                        <button
                          className="custom-role-pill"
                          key={role}
                          type="button"
                          onClick={() => toggleEmployeeRole(role)}
                        >
                          {role}
                          <X size={12} />
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="custom-role-input">
                    <input
                      value={employeeForm.customRole}
                      onChange={(event) =>
                        setEmployeeForm((form) => ({ ...form, customRole: event.target.value }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addCustomRole();
                        }
                      }}
                      placeholder="Add custom role"
                    />
                    <button type="button" onClick={addCustomRole}>
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="field-group">
                <span className="field-label">Preferred days off</span>
                <div className="weekday-choice-list" aria-label="Preferred days off">
                  {WEEKDAYS.map((day) => (
                    <button
                      className={employeeForm.unavailableDays.includes(day) ? "active" : ""}
                      key={day}
                      type="button"
                      onClick={() => toggleUnavailableDay(day)}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              {employeeError ? <p className="form-error">{employeeError}</p> : null}
              <div className="form-actions">
                <button className="primary-button" type="submit">
                  <Plus size={16} />
                  {employeeForm.id ? "Save employee" : "Add employee"}
                </button>
                <button className="text-button" type="button" onClick={closeEmployeeModal}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
      {isShiftModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="modal-panel shift-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shift-modal-title"
          >
            <div className="modal-header">
              <div>
                <CalendarDays size={18} />
                <h2 id="shift-modal-title">Edit Shift</h2>
              </div>
              <button
                type="button"
                aria-label="Close shift form"
                title="Close"
                onClick={closeShiftModal}
              >
                <X size={17} />
              </button>
            </div>
            <form className="stacked-form" onSubmit={submitShiftEdit}>
              <div className="field-group">
                <span className="field-label">Employee</span>
                <div className="readonly-field">
                  <strong>
                    {employees.find((employee) => employee.id === shiftEditForm.employeeId)?.name ??
                      "Unknown employee"}
                  </strong>
                </div>
              </div>
              <div className="date-picker">
                <span className="field-label">Date</span>
                <button className="date-trigger" type="button" onClick={openShiftEditDatePicker}>
                  <span>{getWeekdayLabel(shiftEditForm.date)}</span>
                  <strong>{formatDateLabel(shiftEditForm.date)}</strong>
                </button>
                {isShiftEditDatePickerOpen ? (
                  <div className="calendar-popover">
                    <div className="calendar-header">
                      <button
                        type="button"
                        aria-label="Previous shift month"
                        title="Previous month"
                        onClick={() => changeShiftEditCalendarMonth(-1)}
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <strong>
                        {monthOptions[shiftEditCalendarMonth]} {shiftEditCalendarYear}
                      </strong>
                      <button
                        type="button"
                        aria-label="Next shift month"
                        title="Next month"
                        onClick={() => changeShiftEditCalendarMonth(1)}
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                    <div className="calendar-grid">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                        <span className="calendar-weekday" key={day}>
                          {day}
                        </span>
                      ))}
                      {shiftEditCalendarDates.map((date) => {
                        const dateObject = new Date(`${date}T00:00:00`);
                        const isCurrentMonth = dateObject.getMonth() === shiftEditCalendarMonth;
                        const isSelected = date === shiftEditForm.date;
                        const isToday = date === todayString;
                        const isInVisibleWeek = visibleDates.includes(date);

                        return (
                          <button
                            className={[
                              "calendar-day",
                              isSelected ? "selected" : "",
                              isToday ? "today" : "",
                              isInVisibleWeek ? "in-visible-week" : "",
                              isCurrentMonth ? "" : "muted",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            key={date}
                            type="button"
                            onClick={() => selectShiftEditDate(date)}
                          >
                            {dateObject.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
              <label>
                Start
                <input
                  type="time"
                  value={shiftEditForm.startTime}
                  onChange={(event) =>
                    setShiftEditForm((form) => ({ ...form, startTime: event.target.value }))
                  }
                />
              </label>
              <label>
                End
                <input
                  type="time"
                  value={shiftEditForm.endTime}
                  onChange={(event) =>
                    setShiftEditForm((form) => ({ ...form, endTime: event.target.value }))
                  }
                />
              </label>
              {shiftEditError ? (
                <p className="form-error warning-message">
                  <AlertTriangle size={14} />
                  {shiftEditError}
                </p>
              ) : null}
              <div className="modal-footer-actions">
                <button className="danger-button" type="button" onClick={confirmDeleteShift}>
                  <Trash2 size={16} />
                  Delete
                </button>
                <div className="form-actions">
                  <button className="primary-button" type="submit">
                    <Plus size={16} />
                    Save shift
                  </button>
                  <button className="text-button" type="button" onClick={closeShiftModal}>
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      ) : null}
      <footer className="app-footer">Designed by Adam Leung</footer>
    </main>
  );
}

export default App;
