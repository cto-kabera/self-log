# Self-help tracking tool (Steady)

Personal goal tracker that follows the [Self-Help Tracking Tool SRS](https://davidkabera.github.io/life-tracker/): one polymorphic Goal entity for daily, weekly, monthly, quarterly, and financial targets, with financial sub-goals and planned vs actual entries.

Auth and persistence live on a dedicated Supabase project (email/password plus Google OAuth). Roll-up of `actual_value` is computed in application code, not in SQL.

## Run locally

This app uses its own local Supabase stack on Docker (ports **55321–55327**) so it does not collide with the Gillytech stack on 54321–54327 and does not need a cloud project.

```bash
npm install
cp .env.example .env.local
npm run supabase:start
```

Copy the `ANON_KEY` from `npm run supabase:status` into `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Migrations apply on start.

Email/password signup works locally without email confirmation. Google OAuth stays off until you add a local provider client (still no cloud project required).

Then:

```bash
npm run dev
```

Open [http://localhost:43125](http://localhost:43125).

Studio: [http://127.0.0.1:55323](http://127.0.0.1:55323)  
API: [http://127.0.0.1:55321](http://127.0.0.1:55321)  
Inbucket (auth mail): [http://127.0.0.1:55324](http://127.0.0.1:55324)

Stop the stack with `npm run supabase:stop` (this does not stop Gillytech's containers).

## Cloud auth (Google OAuth)

A dedicated hosted project exists (not Gillytech): [life-tracker on Supabase](https://supabase.com/dashboard/project/lwlgjoqkgcdloyyasoni). Schema `0001_goals_and_rls.sql` is already applied.

Google still needs a Google Cloud OAuth client. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1. Create an **OAuth 2.0 Client ID** (Web application).
2. Authorized JavaScript origins: `https://lwlgjoqkgcdloyyasoni.supabase.co`
3. Authorized redirect URIs: `https://lwlgjoqkgcdloyyasoni.supabase.co/auth/v1/callback`
4. Copy the client ID and secret into Supabase → Authentication → Providers → **Google**.

In Supabase → Authentication → URL configuration:

- Site URL (local): `http://localhost:43125`
- Redirect URLs:
  - `http://localhost:43125/auth/callback`
  - `http://127.0.0.1:43125/auth/callback`
  - `https://YOUR_SERVICE.onrender.com/auth/callback` (after Render gives you a URL)

Then point `.env.local` at the cloud project (Project Settings → API and Database). Restart `npm run dev` and use **Continue with Google**. The app sends you to Google, Google returns to Supabase, then `/auth/callback` stores the session.

## Host on Render

`render.yaml` defines a Node web service named **steady**. After this repo is on GitHub:

1. New Web Service from [https://github.com/cto-kabera/self-log](https://github.com/cto-kabera/self-log) (or Blueprint from `render.yaml`).
2. Set:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://lwlgjoqkgcdloyyasoni.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable/anon key from the project API settings |
| `NEXT_PUBLIC_SITE_URL` | `https://YOUR_SERVICE.onrender.com` |
| `DATABASE_URL` | pooler URI from Database settings (port 6543) |
| `NODE_VERSION` | `22.12.0` (already in `render.yaml`) |

3. Add that Render origin to the Supabase redirect allow-list, then sign in with Google on the live URL.

`npm start` listens on Render’s `PORT`. Local `npm run dev` stays on `43125`.

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
