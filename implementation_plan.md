# Flagged Student Tracking, Verdict Reactivation, Chart Toggles, and Enriched Campus Monitor Stats

This plan outlines the design and changes to highlight flagged students across all logs and reports (including PDF downloads), add a verdict reactivate-to-active option for resolved security incidents, add a line/bar chart toggle to the main traffic chart, and enrich the Executive Dashboard and Live Campus Monitor with high-fidelity statistics.

## User Review Required

> [!IMPORTANT]
> - Flagged student rows in logs tables, user directories, and generated report tables will be highlighted with a soft red background, red text, and red borders for immediate tracking.
> - Report PDFs generated from the Reports tab will automatically highlight flagged student rows in red using the `jspdf-autotable` `didParseCell` styling hooks.
> - Security followup form will expose a new "Verdict" option enabling administrators to reactivate a student to "active" status immediately upon resolving a case.
> - Main dashboard traffic chart will feature dynamic Line/Bar selector controls using smooth transitions.

## Proposed Changes

---

### Backend Components

#### [MODIFY] [users.py](file:///c:/Users/Metto/Desktop/Codes/gatepass/backend/app/routers/users.py)
- Update the `/` (get all users) endpoint to check for unresolved incidents for each user in the database.
- Add an `is_flagged` field to the returned user dictionary. If `is_flagged` is true, automatically set `status` to `"Flagged"` in the response payload.

#### [MODIFY] [admin.py](file:///c:/Users/Metto/Desktop/Codes/gatepass/backend/app/routers/admin.py)
- Import `IncidentReport` model.
- Update `/scan-logs` endpoint to query for unresolved incidents matching each scanned user and append `"is_flagged": True/False` to each log entry.

#### [MODIFY] [reports.py](file:///c:/Users/Metto/Desktop/Codes/gatepass/backend/app/routers/reports.py)
- Import `IncidentReport` model.
- Update `/detailed` endpoint to check for unresolved incidents matching each entry log's user, returning `"is_flagged": True/False` in `entry_logs`.

#### [MODIFY] [dashboard.py](file:///c:/Users/Metto/Desktop/Codes/gatepass/backend/app/routers/dashboard.py)
- Import `IncidentReport`, `NoticeBoardItem`, `Asset`, `AssetLog`.
- Update `/recent-logs` endpoint to query for unresolved incidents for each logged gate check-in, returning `"is_flagged": True/False` and marking `isAlert = True`.
- Update `/live-monitor-stats` endpoint to query and return additional statistics:
  - `incidents`: `total_active` (unresolved incidents count) and `high_severity` count.
  - `notices`: `total_notices` count.
  - `assets`: `total_assets` count and `checked_out_assets` count.

#### [MODIFY] [security.py](file:///c:/Users/Metto/Desktop/Codes/gatepass/backend/app/routers/security.py)
- Update `/incidents/{incident_id}/followup` endpoint to accept an optional form field `reactivate_user: bool = Form(False)`.
- If `followup_type == "resolved"`, `reactivate_user` is true, and the incident has a target user, update the target user's status to `"active"` and commit to the database.

---

### Frontend Components

#### [MODIFY] [ScanLogs.tsx](file:///c:/Users/Metto/Desktop/Codes/gatepass/frontend/src/ScanLogs.tsx)
- Color the table row (`<tr>`) with a soft red background class (`bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-300 border-l-4 border-red-500`) when `log.is_flagged` is true.

#### [MODIFY] [Reports.tsx](file:///c:/Users/Metto/Desktop/Codes/gatepass/frontend/src/Reports.tsx)
- Color the Generator page table row with the soft red styling when `log.is_flagged` is true.
- Modify `exportToPDF` table options to include a `didParseCell` hook. If `log.is_flagged` is true for that row's index, override `data.cell.styles.fillColor` to light red (`[254, 226, 226]`) and `textColor` to dark red (`[153, 27, 27]`).

#### [MODIFY] [Users.tsx](file:///c:/Users/Metto/Desktop/Codes/gatepass/frontend/src/Users.tsx)
- In the user list table view, highlight flagged student rows in soft red.
- In the grid view, add a red border and soft red highlight to cards representing flagged students.

#### [MODIFY] [IncidentReporting.tsx](file:///c:/Users/Metto/Desktop/Codes/gatepass/frontend/src/IncidentReporting.tsx)
- Add state `reactivateUser` (boolean, defaults to `true`).
- When the followup update type selection is `"resolved"`, render a checkbox "Reactivate Affected Student to Active Status".
- Include `reactivate_user` in the form body when posting followups.

#### [MODIFY] [AdminDashboard.tsx](file:///c:/Users/Metto/Desktop/Codes/gatepass/frontend/src/AdminDashboard.tsx)
- Import `BarChart` and `Bar` from `recharts`.
- Add `chartType` state ('line' or 'bar') with responsive design selection buttons.
- Conditionally render `<AreaChart>` or `<BarChart>` inside the traffic report card.
- Enrich top stats cards to show active incidents, active notice count, and checked-out assets using stats returned from `/live-monitor-stats`.
- Style recent activity items to render with red background/border if `log.is_flagged` is true.

#### [MODIFY] [LiveClasses.tsx](file:///c:/Users/Metto/Desktop/Codes/gatepass/frontend/src/LiveClasses.tsx)
- Redesign the "Live Campus Monitor" stats dashboard widgets.
- Add dedicated cards displaying ongoing security incidents, active notice board count, and asset checkout rate alongside existing metrics.

## Verification Plan

### Automated Tests
- Run `npm run build` in the `frontend` folder to verify full frontend compilation.

### Manual Verification
- Log an incident report against a student (e.g. Alex Metto) with severity "Medium" and status "reported" (unresolved).
- Verify the student is flagged in the Users Directory with red styling.
- Verify that logs in Scan Logs show a red row for this student.
- Generate a detailed report in Reports and verify the row is colored red in the table and in the exported PDF.
- Resolve the incident, checking the verdict option "Reactivate Student Status to Active", and verify the student status returns to "active" and the red highlighting disappears.
- Verify chart toggle buttons on the Executive Dashboard switch traffic views between Line/Area and Bar charts.
- Verify that live stats on the Executive Dashboard and Live Campus Monitor show high-fidelity widgets for assets, notices, and incidents.
