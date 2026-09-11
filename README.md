# Self-help tracking tool (Steady)

Personal goal tracker that follows the [Self-Help Tracking Tool SRS](https://davidkabera.github.io/life-tracker/): one polymorphic Goal entity for daily, weekly, monthly, quarterly, and financial targets, with financial sub-goals and planned vs actual entries.

This cloud preview keeps the Steady sage theme. Auth is email/password on this server (SQLite). The SRS calls for a dedicated Supabase project and Google OAuth; those are not required to run locally. Roll-up of `actual_value` is computed in application code, not in SQL.

## Run locally

Node.js 20+.

```bash
npm install
cp .env.example .env.local
```

Set `BETTER_AUTH_SECRET` (`openssl rand -base64 32`). Then:

```bash
npm run db:push
npm run dev
```

Open [http://localhost:43125](http://localhost:43125).

SQLite path defaults to `data/tracker.db`.

## What you can do now

- Create cadence goals (daily / weekly / monthly / quarterly)
- Create a financial goal for a period; set income and allocate bills, emergency fund, and saving as percentages of income
- Log expenditure with a short comment for tracking
- Planned vs actual roll up in the backend layer
- Copy a financial plan to the next month
- Carry daily goal titles into today

Google OAuth is listed in the SRS (ASR-F08) and stays off until a Supabase project is connected.

## Docs

SRS: [https://davidkabera.github.io/life-tracker/](https://davidkabera.github.io/life-tracker/)
