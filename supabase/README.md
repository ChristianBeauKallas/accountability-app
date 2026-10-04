# Athletx — Supabase setup

## Reusing an existing project? Wipe it first ⚠️

If you're pointing Athletx at a Supabase project that already ran another app
(e.g. the old "Get Better" app), run **`reset-all.sql` first**. It is
**destructive and irreversible** — it drops the entire `public` schema and
deletes every auth user. Only do this on a project whose data you're done
with. (A fresh/empty project does not need it — skip straight to the schema.)

Order when reusing a project:

1. `reset-all.sql` — wipes old tables, functions, triggers, and all users.
2. the four files below, in order.

## Apply the schema

Run these in the Supabase SQL editor (or `psql`) **in order**:

1. `migrations/0001_schema.sql` — tables, enums, triggers (incl. auto-profile
   on signup).
2. `migrations/0002_rls.sql` — Row Level Security policies.
3. `migrations/0003_onboarding.sql` — onboarding completion flag.
4. `migrations/0004_player_need_visibility.sql` — players can read needs
   they've applied to (keeps closed needs visible in the Tracker).
5. `migrations/0005_posts.sql` — player Updates/Highlights posts + the
   `player-media` Storage bucket.
6. `migrations/0006_player_prefs.sql` — player recruiting preferences
   (levels / states / climate) that filter the Fits feed.
7. `migrations/0007_program_profile.sql` — program profile fields (record,
   enrollment, min GPA) + `program_posts` (Updates / Facilities).
8. `migrations/0008_social.sql` — follows, verified/recruiting-pitch fields,
   and notification triggers (program update → followers/applicants; coach
   interest → player).
9. `seed.sql` — demo programs, needs, players, applications, posts, follows.

The seed is safe to re-run; it clears its own rows first.

## The anti-spam guarantee (enforced in RLS)

- **Nobody browses players.** A player row/profile is readable only by the
  player themselves and by a coach **after** that player has applied to one of
  the coach's program needs.
- Players can read **open** needs, program pages, and their **own**
  applications — nothing about other players.
- Coaches read applications to **their** program's needs, and only the
  profiles of players who applied.

## Demo accounts

All seeded accounts use the password **`athletxdemo`** (and email magic-link
once SMTP/OAuth is configured in Phase 3):

| Email | Role | Notes |
|---|---|---|
| `coach@seed.athletx` | coach | staffs **Cowley College** — populated inbox |
| `coach2@seed.athletx` | coach | staffs **Washburn University** |
| `player1@seed.athletx` … `player40@seed.athletx` | player | various positions / states |

## Environment variables

The app reads (added in Phase 3):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Set them in `.env.local` for development and in Vercel project settings for
deploys. Never commit real keys.
