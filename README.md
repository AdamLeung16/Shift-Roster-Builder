## Shift Roster Builder

A small React web app for building a weekly staff roster. Managers can add employees,
assign shifts, view the week in a grid, catch scheduling conflicts, and track weekly
hours per employee.

## Tech Stack

- React + Vite for a fast single-page frontend.
- TypeScript for clear roster data models and safer business logic.
- localStorage for simple browser persistence with no backend.
- Vitest for focused tests around time calculations and conflict detection.

This is a static frontend app, so it can be deployed to GitHub Pages and used directly
from the published page.

## Features

- Add, edit, and delete employees.
- Store each employee with one or more roles selected from Cashier, Supervisor, Cook, or custom role names.
- Search and filter the employee list by role, with five employees shown per page.
- Add, edit, and delete shifts by searchable employee picker, calendar date, start time, and end time.
- Filter the shift employee picker by role so only employees with that role are shown.
- Display assignments in a date-based weekly grid with employees as rows and dated weekdays as columns.
- Jump between weeks with a calendar date picker inside the roster view.
- Search and filter the roster grid by employee name and role.
- Paginate the roster grid with up to ten employees per page.
- Visually flag overlapping shifts for the same employee on the same day.
- Visually flag shifts once an employee is scheduled more than five consecutive days.
- Show weekly total hours for every employee.
- Save roster data in localStorage so the page keeps data after refresh.
- Export the weekly roster to CSV.

## Data Model

```ts
type Employee = {
  id: string;
  name: string;
  roles: string[];
};

type Shift = {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  role?: string;
};
```

Conflict detection is implemented in `src/rosterLogic.ts`. The app checks for:

- overlapping shifts for the same employee on the same calendar date
- more than five consecutive scheduled calendar dates

## Local Setup

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal.

## Verification

```bash
npm run test
npm run build
```

## GitHub Pages

The Vite `base` option is configured for a repository named `Shift-Roster-Builder`:

```ts
base: "/Shift-Roster-Builder/"
```

After pushing to GitHub, enable GitHub Pages with a build workflow or publish the `dist`
folder. The deployed page will support the full app because all data and logic run in
the browser.

## Screenshot

Add a screenshot or short screen recording here before final submission.
