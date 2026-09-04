# Steady

A self-help tracker for daily habits and numbered goals. Create an account, check off routines, keep streaks, and log progress toward a target. Data is stored on the server, so the same login works on another device.

## Run locally

You need Node.js 20+.

```bash
npm install
cp .env.example .env.local
```

Set `BETTER_AUTH_SECRET` to a long random string (`openssl rand -base64 32` works). Keep `BETTER_AUTH_URL` pointed at the URL you will open in the browser.

Create the SQLite tables:

```bash
npm run db:push
```

Start the app:

```bash
npm run dev
```

Open [http://localhost:43123](http://localhost:43123), create an account, add a habit, and set a goal.

SQLite lives at `data/tracker.db` by default. Change `DATABASE_PATH` if you want a different file. For a hosted database later, keep the same schema and point that path (or swap the Drizzle driver) at your server.

## What it does

- **Habits** — daily check-offs, a seven-day grid, current streak, archive
- **Goals** — numeric target, optional unit, progress logs, percent complete
- **Accounts** — email and password only (no Google/GitHub in this version)

There is no email verification. Treat this as a personal tool: anyone who can reach the server can sign up.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server on port 43123 |
| `npm run build` | Production build |
| `npm start` | Production server on port 43123 |
| `npm run db:push` | Apply the Drizzle schema to SQLite |
| `npm run lint` | ESLint |
