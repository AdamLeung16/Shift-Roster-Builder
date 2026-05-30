import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Download,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  Users,
} from "lucide-react";
import { DAYS, type Day, type Employee, type Shift } from "./types";
import {
  calculateWeeklyHours,
  detectConflicts,
  getConflictsByShift,
  isValidShiftTime,
} from "./rosterLogic";
import { clearRosterData, loadRosterData, saveRosterData, starterData } from "./storage";

type EmployeeForm = {
  id?: string;
  name: string;
  roles: string;
};

type ShiftForm = {
  id?: string;
  employeeId: string;
  day: Day;
  startTime: string;
  endTime: string;
  role: string;
};

const emptyEmployeeForm: EmployeeForm = {
  name: "",
  roles: "",
};

const emptyShiftForm: ShiftForm = {
  employeeId: "",
  day: "Mon",
  startTime: "09:00",
  endTime: "17:00",
  role: "",
};

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseRoles(value: string) {
  return value
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

function formatHours(hours: number) {
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
}

function App() {
  const [employees, setEmployees] = useState<Employee[]>(() => loadRosterData().employees);
  const [shifts, setShifts] = useState<Shift[]>(() => loadRosterData().shifts);
  const [employeeForm, setEmployeeForm] = useState<EmployeeForm>(emptyEmployeeForm);
  const [shiftForm, setShiftForm] = useState<ShiftForm>(emptyShiftForm);
  const [employeeError, setEmployeeError] = useState("");
  const [shiftError, setShiftError] = useState("");

  useEffect(() => {
    saveRosterData({ employees, shifts });
  }, [employees, shifts]);

  useEffect(() => {
    if (!shiftForm.employeeId && employees.length > 0) {
      setShiftForm((form) => ({ ...form, employeeId: employees[0].id }));
    }
  }, [employees, shiftForm.employeeId]);

  const conflicts = useMemo(() => detectConflicts(shifts, employees), [shifts, employees]);
  const conflictsByShift = useMemo(() => getConflictsByShift(conflicts), [conflicts]);
  const weeklyHours = useMemo(() => calculateWeeklyHours(employees, shifts), [employees, shifts]);
  const totalShiftCount = shifts.length;
  const totalHours = weeklyHours.reduce((sum, item) => sum + item.totalHours, 0);

  const selectedEmployee = employees.find((employee) => employee.id === shiftForm.employeeId);
  const availableRoles = selectedEmployee?.roles ?? [];

  const submitEmployee = (event: React.FormEvent) => {
    event.preventDefault();
    const name = employeeForm.name.trim();
    const roles = parseRoles(employeeForm.roles);

    if (!name) {
      setEmployeeError("Please enter an employee name.");
      return;
    }
    if (roles.length === 0) {
      setEmployeeError("Please add at least one role.");
      return;
    }

    if (employeeForm.id) {
      setEmployees((current) =>
        current.map((employee) =>
          employee.id === employeeForm.id ? { ...employee, name, roles } : employee,
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
      setEmployees((current) => [...current, { id: createId("emp"), name, roles }]);
    }

    setEmployeeForm(emptyEmployeeForm);
    setEmployeeError("");
  };

  const editEmployee = (employee: Employee) => {
    setEmployeeForm({
      id: employee.id,
      name: employee.name,
      roles: employee.roles.join(", "),
    });
    setEmployeeError("");
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
      day: shiftForm.day,
      startTime: shiftForm.startTime,
      endTime: shiftForm.endTime,
      role: shiftForm.role || availableRoles[0] || "",
    };

    if (shiftForm.id) {
      setShifts((current) =>
        current.map((shift) => (shift.id === shiftForm.id ? shiftPayload : shift)),
      );
    } else {
      setShifts((current) => [...current, shiftPayload]);
    }

    setShiftForm({
      ...emptyShiftForm,
      employeeId: shiftForm.employeeId,
      role: availableRoles[0] || "",
    });
    setShiftError("");
  };

  const editShift = (shift: Shift) => {
    setShiftForm({
      id: shift.id,
      employeeId: shift.employeeId,
      day: shift.day,
      startTime: shift.startTime,
      endTime: shift.endTime,
      role: shift.role ?? "",
    });
    setShiftError("");
  };

  const deleteShift = (shiftId: string) => {
    setShifts((current) => current.filter((shift) => shift.id !== shiftId));
  };

  const resetDemoData = () => {
    clearRosterData();
    setEmployees(starterData.employees);
    setShifts(starterData.shifts);
    setEmployeeForm(emptyEmployeeForm);
    setShiftForm({ ...emptyShiftForm, employeeId: starterData.employees[0]?.id ?? "" });
  };

  const exportCsv = () => {
    const rows = [
      ["Employee", "Day", "Start", "End", "Role"],
      ...shifts.map((shift) => {
        const employee = employees.find((item) => item.id === shift.employeeId);
        return [
          employee?.name ?? "Unknown employee",
          shift.day,
          shift.startTime,
          shift.endTime,
          shift.role ?? "",
        ];
      }),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "weekly-roster.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Core roster task</p>
          <h1>Shift Roster Builder</h1>
          <p className="hero-copy">
            Build a weekly staff schedule, catch conflicts, and track assigned hours.
          </p>
        </div>
        <div className="hero-stats" aria-label="Roster overview">
          <div>
            <span>{employees.length}</span>
            <small>Employees</small>
          </div>
          <div>
            <span>{totalShiftCount}</span>
            <small>Shifts</small>
          </div>
          <div className={conflicts.length > 0 ? "stat-alert" : ""}>
            <span>{conflicts.length}</span>
            <small>Conflicts</small>
          </div>
        </div>
      </header>

      <section className="toolbar" aria-label="Roster actions">
        <button className="secondary-button" type="button" onClick={resetDemoData}>
          <RefreshCcw size={16} />
          Reset demo data
        </button>
        <button className="secondary-button" type="button" onClick={exportCsv}>
          <Download size={16} />
          Export CSV
        </button>
      </section>

      <section className="workspace">
        <aside className="side-panel">
          <section className="panel">
            <div className="panel-title">
              <Users size={18} />
              <h2>Employees</h2>
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
              <label>
                Roles
                <input
                  value={employeeForm.roles}
                  onChange={(event) =>
                    setEmployeeForm((form) => ({ ...form, roles: event.target.value }))
                  }
                  placeholder="Cashier, Supervisor"
                />
              </label>
              {employeeError ? <p className="form-error">{employeeError}</p> : null}
              <div className="form-actions">
                <button className="primary-button" type="submit">
                  <Plus size={16} />
                  {employeeForm.id ? "Save employee" : "Add employee"}
                </button>
                {employeeForm.id ? (
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => setEmployeeForm(emptyEmployeeForm)}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>

            <div className="employee-list">
              {employees.length === 0 ? (
                <p className="empty-state">No employees yet. Add one to start scheduling.</p>
              ) : (
                employees.map((employee) => (
                  <article className="employee-card" key={employee.id}>
                    <div>
                      <strong>{employee.name}</strong>
                      <div className="role-tags">
                        {employee.roles.map((role) => (
                          <span key={role}>{role}</span>
                        ))}
                      </div>
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
          </section>

          <section className="panel">
            <div className="panel-title">
              <Clock size={18} />
              <h2>Weekly Hours</h2>
            </div>
            <div className="hours-list">
              {weeklyHours.map((item) => (
                <div className="hours-row" key={item.employeeId}>
                  <span>{item.name}</span>
                  <strong>{formatHours(item.totalHours)}h</strong>
                </div>
              ))}
              {weeklyHours.length === 0 ? (
                <p className="empty-state">Hours will appear after employees are added.</p>
              ) : (
                <div className="hours-total">
                  <span>Total assigned</span>
                  <strong>{formatHours(totalHours)}h</strong>
                </div>
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
              <label>
                Employee
                <select
                  value={shiftForm.employeeId}
                  onChange={(event) => {
                    const nextEmployee = employees.find(
                      (employee) => employee.id === event.target.value,
                    );
                    setShiftForm((form) => ({
                      ...form,
                      employeeId: event.target.value,
                      role: nextEmployee?.roles[0] ?? "",
                    }));
                  }}
                >
                  {employees.length === 0 ? <option value="">Add an employee first</option> : null}
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Day
                <select
                  value={shiftForm.day}
                  onChange={(event) =>
                    setShiftForm((form) => ({ ...form, day: event.target.value as Day }))
                  }
                >
                  {DAYS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>
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
              <label>
                Role
                <select
                  value={shiftForm.role}
                  onChange={(event) =>
                    setShiftForm((form) => ({ ...form, role: event.target.value }))
                  }
                >
                  {availableRoles.length === 0 ? <option value="">No role</option> : null}
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
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
                        ...emptyShiftForm,
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
            {shiftError ? <p className="form-error">{shiftError}</p> : null}
          </section>

          <section className="panel roster-panel">
            <div className="panel-title">
              <CalendarDays size={18} />
              <h2>Weekly Roster</h2>
            </div>
            <div className="roster-scroll">
              <table className="roster-grid">
                <thead>
                  <tr>
                    <th>Employee</th>
                    {DAYS.map((day) => (
                      <th key={day}>{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={DAYS.length + 1} className="table-empty">
                        Add employees to build the weekly schedule.
                      </td>
                    </tr>
                  ) : (
                    employees.map((employee) => (
                      <tr key={employee.id}>
                        <th scope="row">
                          <span>{employee.name}</span>
                        </th>
                        {DAYS.map((day) => {
                          const dayShifts = shifts
                            .filter((shift) => shift.employeeId === employee.id && shift.day === day)
                            .sort((a, b) => a.startTime.localeCompare(b.startTime));

                          return (
                            <td key={day}>
                              {dayShifts.length === 0 ? (
                                <span className="no-shift">-</span>
                              ) : (
                                dayShifts.map((shift) => {
                                  const shiftConflicts = conflictsByShift.get(shift.id) ?? [];
                                  return (
                                    <article
                                      className={`shift-chip ${
                                        shiftConflicts.length > 0 ? "has-conflict" : ""
                                      }`}
                                      key={shift.id}
                                    >
                                      <div>
                                        <strong>
                                          {shift.startTime}-{shift.endTime}
                                        </strong>
                                        <span>{shift.role || "Shift"}</span>
                                      </div>
                                      {shiftConflicts.length > 0 ? (
                                        <div className="conflict-note">
                                          <AlertTriangle size={13} />
                                          {shiftConflicts.map((conflict) => conflict.message).join(" ")}
                                        </div>
                                      ) : null}
                                      <div className="shift-actions">
                                        <button
                                          type="button"
                                          aria-label="Edit shift"
                                          title="Edit shift"
                                          onClick={() => editShift(shift)}
                                        >
                                          <Pencil size={13} />
                                        </button>
                                        <button
                                          type="button"
                                          aria-label="Delete shift"
                                          title="Delete shift"
                                          onClick={() => deleteShift(shift.id)}
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </article>
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
          </section>
        </section>
      </section>
    </main>
  );
}

export default App;
