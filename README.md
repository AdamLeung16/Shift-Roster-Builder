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
- Store each employee with one or more roles.
- Add, edit, and delete shifts by employee, day, role, start time, and end time.
- Display assignments in a weekly grid with employees as rows and days as columns.
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
  day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
  startTime: string;
  endTime: string;
  role?: string;
};
```

Conflict detection is implemented in `src/rosterLogic.ts`. The app checks for:

- overlapping shifts for the same employee on the same day
- more than five consecutive scheduled days

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
