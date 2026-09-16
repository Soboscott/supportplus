# SupportPulse

A support operations dashboard for exploring ticket demand, backlog, aging, and resolution time. Built as a portfolio project using HTML, CSS, and JavaScript, with a small Node.js server and no third-party dependencies.

## Run it

Install Node.js 22 or newer. Open a terminal **inside the supportpulse project folder**, then run:

```sh
npm start
```

Open http://localhost:3000. Use `npm test` to run the data validation and metric tests. No npm install or build step is needed. A hosting service can set `PORT`; otherwise the server uses port 3000.

## What works

- 120 fictional tickets, regenerated relative to the current time.
- Product, priority, and inclusive UTC creation-date filters.
- Ticket count, open backlog, overdue count, and average resolution time.
- Ticket demand and category charts, plus backlog aging buckets.
- Searchable ticket table with 20 tickets per page.
- Sample CSV download and validated CSV import (5 MB / 10,000 ticket limit).
- Responsive layout, keyboard controls, and import status announcements.

## Metric definitions

All dashboard metrics use the selected ticket cohort: tickets filtered by product, priority, and creation date. Search affects only the ticket table. This is not a historical backlog snapshot or a count of resolutions occurring within the date range.

Open backlog includes Open and Pending tickets. Overdue means elapsed age exceeds Critical: 4 hours, High: 24 hours, Normal: 72 hours, or Low: 120 hours. These are illustrative resolution targets, not business-hour SLAs. Average resolution is the arithmetic mean of resolved_at minus created_at for resolved tickets in the cohort. With no resolved tickets, it displays a dash. Aging buckets are under 24h, 24h to under 72h, 72h to under 168h, and 168h or more. Values refresh when controls change or the page reloads.

## CSV format

Download the sample CSV from the dashboard for a ready-to-import example. Required headers:

```csv
id,subject,product,priority,status,category,created_at,resolved_at
```

IDs must be unique. Priorities are Critical, High, Normal, Low. Statuses are Open, Pending, Resolved. Timestamps must be UTC, such as `2026-09-01T10:00:00Z` (optional three-digit milliseconds), and cannot be in the future. Resolved tickets require resolved_at on or after created_at; unresolved tickets must leave it blank. Commas, double quotes, and line breaks inside quoted fields are supported. Import validation is all-or-nothing; failed imports preserve existing data.

Files are processed in browser memory, never uploaded or persisted. Refreshing restores demo data. There is no authentication, shared database, or live ticket-system integration.

## Project structure

- `index.html`: dashboard structure
- `src/styles.css`: layout and visual design
- `src/app.js`: filters, rendering, import, and table interactions
- `src/data.js`: demo tickets, CSV validation, and metrics
- `server.mjs`: serves an explicit allowlist of public files
- `tests/data.test.js`: data and metric tests

## Put it on GitHub

1. Create an empty GitHub repository named `supportpulse` (choose your preferred visibility).
2. Extract this project ZIP and open the `supportpulse` folder.
3. In GitHub's web interface, use **uploading an existing file** and upload the folder contents, keeping the `src` and `tests` directories intact. Confirm `package.json` is at the repository root.
4. Commit with the message `Add SupportPulse dashboard`.

Alternatively, use a terminal in this folder after creating the empty repository:

```sh
git init -b main
git add .
git commit -m "Add SupportPulse dashboard"
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your repository's actual URL. Deployment configuration for Upsun is a next step; this starter has not been deployed.

## Next milestones

Add configurable SLA targets, a prior-period comparison with explicit cohort definitions, and an Upsun deployment configuration. Keep fictional data available so interviewers can explore the dashboard without uploading files.
