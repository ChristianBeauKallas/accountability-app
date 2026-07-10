# Accountability App

A [Next.js](https://nextjs.org) (App Router + TypeScript) starter wired up to
[Supabase](https://supabase.com) for the database, deployed on
[Vercel](https://vercel.com).

This README is your setup walkthrough. The code is already scaffolded — you
just need to create the accounts, connect them, and add your keys.

---

## What's in here

```
app/
  layout.tsx          Root layout
  page.tsx            Homepage — reads goals from Supabase (Server Component)
  globals.css         Styles
lib/supabase/
  client.ts           Supabase client for Client Components (browser)
  server.ts           Supabase client for Server Components / Actions
supabase/
  schema.sql          SQL to create the example `goals` table + RLS policy
.env.local.example    Template for your Supabase keys
```

---

## Step 1 — Run it locally first

```bash
npm install
npm run dev
```

Open http://localhost:3000. You'll see a notice saying Supabase isn't
configured yet — that's expected. Let's fix that.

---

## Step 2 — Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (the free tier is
   plenty to start).
2. Click **New project**. Pick an organization, give it a name (e.g.
   `accountability-app`), and set a strong **database password** (save it in a
   password manager — you'll need it if you ever connect directly to Postgres).
3. Choose the region closest to your users and click **Create new project**.
   Provisioning takes a minute or two.

### Create the example table

1. In the Supabase dashboard, open the **SQL Editor** (left sidebar).
2. Copy the contents of [`supabase/schema.sql`](./supabase/schema.sql), paste
   it in, and click **Run**. This creates the `goals` table, turns on Row
   Level Security, adds a public read policy, and inserts two example rows.

### Grab your API keys

1. Go to **Project Settings → Data API** and copy the **Project URL**.
2. Go to **Project Settings → API Keys** and copy the **`anon` / `public`
   key**.

> **Security note:** The `anon` key is meant to be public — it's protected by
> Row Level Security. Never expose the `service_role` key in frontend code or
> a `NEXT_PUBLIC_` variable.

---

## Step 3 — Connect Supabase to your local app

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and paste in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Restart the dev server (`Ctrl+C`, then `npm run dev`). The homepage should now
show the two example goals from your database. 🎉

---

## Step 4 — Push to GitHub

This repo is already a git repo. Commit and push to GitHub (Vercel deploys
from your GitHub repo):

```bash
git add .
git commit -m "Initial Next.js + Supabase setup"
git push
```

---

## Step 5 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up **with your GitHub
   account** — this lets Vercel see your repos.
2. Click **Add New… → Project** and **Import** this repository.
3. Vercel auto-detects Next.js, so leave the build settings as-is.
4. Before deploying, expand **Environment Variables** and add the same two
   variables from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**. In ~1 minute you'll get a live URL.

> **Tip:** There's also an official
> [Vercel + Supabase integration](https://vercel.com/integrations/supabase)
> that can sync these environment variables for you automatically. Manual is
> fine — and clearer — for a first setup.

### Redeploys are automatic

Every `git push` to your default branch triggers a new production deploy.
Pushing to any other branch gives you a preview deployment with its own URL.

---

## Next steps

- **Add auth:** Supabase Auth integrates cleanly with the `lib/supabase`
  clients already here. When you add it, tighten your RLS policies to scope
  rows to `auth.uid()` and remove the open read policy in `schema.sql`.
- **Write data:** Use a Server Action or Route Handler with the server client
  to insert/update goals.
- **Type safety:** Generate TypeScript types from your schema with the
  Supabase CLI (`supabase gen types typescript`).

## Useful links

- [Next.js docs](https://nextjs.org/docs)
- [Supabase docs](https://supabase.com/docs)
- [Supabase + Next.js guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Vercel docs](https://vercel.com/docs)
