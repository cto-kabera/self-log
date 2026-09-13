# Self-help tracking tool (Steady)

Personal goal tracker that follows the [Self-Help Tracking Tool SRS](https://davidkabera.github.io/life-tracker/): one polymorphic Goal entity for daily, weekly, monthly, quarterly, and financial targets, with financial sub-goals and planned vs actual entries.

Auth and persistence live on a dedicated Supabase project (email/password plus Google OAuth). Roll-up of `actual_value` is computed in application code, not in SQL.

## Run locally

Node.js 20+. Create a Supabase project, then:

```bash
npm install
cp .env.example .env.local
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from Project Settings → API
- `DATABASE_URL` from Project Settings → Database (URI, session or transaction pooler)
- `NEXT_PUBLIC_SITE_URL` (`http://localhost:43125` locally)

In the Supabase dashboard:

1. Authentication → Providers → enable Email and Google
2. Authentication → URL configuration → add `http://localhost:43125/auth/callback` to Redirect URLs
3. Push the app schema, then apply row-level security:

```bash
npm run db:push
```

Paste `supabase/migrations/0001_goals_and_rls.sql` into the SQL editor (or `supabase db push` if the CLI is linked).

Then:

```bash
npm run dev
```

Open [http://localhost:43125](http://localhost:43125).

## What you can do now

- Sign in with Google or email/password
- Create cadence goals (daily / weekly / monthly / quarterly)
- Create a financial plan on the 10th (cycle runs to the 9th): bills + emergency fund + investment = monthly target
- Bills table: target, vote head, and spent, with auto-sum totals to check against the plan
- Planned vs actual roll up in the backend layer
- Copy a financial plan to the next month
- Carry daily goal titles into today

## Docs

SRS: [https://davidkabera.github.io/life-tracker/](https://davidkabera.github.io/life-tracker/)
