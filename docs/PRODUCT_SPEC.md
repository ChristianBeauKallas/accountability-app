# Accountability App — Product Spec (v1)

> A mobile-first (PWA) accountability app combining a **group accountability
> board** with an optional **1:1 coaching layer**. North star: **frictionless.**
> Open the app, see where everyone is, get motivated, log in seconds, interact,
> build community.

---

## Guiding principle: friction is the enemy

A previous attempt (on Base44) failed by getting too complicated. Every
decision in this spec is measured against one question: *does this make the
daily loop faster and simpler, or slower and heavier?* When in doubt, cut it.

The daily update should take **~15 seconds**. The coaching check-in **~30
seconds**. Nothing is a wall of required fields.

---

## The two layers

The app is **one product with two layers** built on shared primitives.

### Layer 1 — The Group Board (everyone)

The existing text-chat accountability group, leveled up. Everyone in a group
gets this.

- **Daily update** = tap which of the group's activities you did today. That's
  the core. Optionally add a **photo**, **voice note**, or a **caption** for
  context. Media/caption are optional; the activity toggles are the heart of it.
- **Feed** everyone in the group can see, with **comments**.
- **Streaks** — consecutive days a person has posted an update.
- **Accountability header** — who updated today, and who hasn't (and for how
  many days). Visible, motivating, not shaming.

### Layer 2 — Coaching (opt-in, 1:1)

For people who want to go deeper (e.g. weight-loss coaching). An overlay on top
of the group, not a separate app.

- **Structured daily check-in** — weight, sleep, energy, moved?, notes. Private
  to the client and their coach.
- **Coach dashboard** — trends across all of a coach's clients, weekly review
  cadence (not real-time), a place to leave feedback and adjust plans.
- **AI weekly summaries** — generated for the coach only, from the client's
  check-ins *and* their group activity. Nothing AI touches the group feed.

### How the layers relate

- **Everyone is in a group.** Some people **also** opt into coaching.
- A person can post to the group board **and** do a coaching check-in on the
  same day — these are independent acts.
- **Streaks are independent.** Checking in with your coach does **not** keep
  your group-board streak alive, and vice versa. Show up for the group to keep
  the group streak; show up for coaching to keep the coaching streak.

---

## The Home board (the screen that matters)

Opening the app lands on **the board**, not a scroll-first chat feed.

1. **Today's row** — avatars of who has updated today ✅.
2. **Streaks** — each member's 🔥 day count, ordered to show momentum.
3. **Who's dark** — members who haven't updated today, with "N days out."
   Gentle but visible; this is the accountability engine.
4. **Feed** — today's updates below the board, with comments.

One screen delivers "see where everyone is" + "get motivated."

---

## The two actions (both near-zero friction)

**1. Post to the group** — one button, one screen:
- Tap the group's activity toggles for what you did today.
- *Optionally* add a photo, hold-to-record a voice note, or type a caption.
- Post. ~15 seconds.

**2. Coaching check-in** — only visible to people being coached:
- Weight, sleep, energy, moved?, note. Optional photo.
- Private to client + coach. ~30 seconds.

Two separate buttons → two separate streaks.

---

## Scope

### In v1

- Groups, membership, roles (owner/member)
- Home board (today's row, streaks, who's-dark, feed)
- Group posts: activity toggles + optional photo / voice / caption
- Comments on posts
- Coaching relationships + structured check-ins
- Coach dashboard with per-client trends
- AI weekly summaries (coach-only)
- Installable PWA, mobile-first

### Deliberately later

- Video uploads (photo/voice/text only in v1; media type modeled for video)
- Members creating/voting on/editing group activities (v1 activities are
  seed-defined per group)
- Multiple groups surfaced in the UI (the **data model is multi-group from day
  one**; v1 UI shows a user's single group)
- Reactions beyond a single 🔥
- Push notifications

---

## Data model (multi-group from day one)

Everything is scoped to a group so that "anyone can create a group and get the
identical feature set" is a UI unlock later, not a rebuild.

| Table | Purpose |
|-------|---------|
| `profiles` | Users. Includes timezone (needed for correct per-day streaks). |
| `groups` | Each has an owner. |
| `group_members` | user ↔ group, with role (owner/member). |
| `activities` | A group's tasks (the "5 things"). Group-owned. |
| `group_posts` | author, group, optional media, optional caption/voice, and the list of activities completed → drives the **group streak**. |
| `comments` | On group posts. |
| `coaching_relationships` | coach ↔ client. |
| `checkins` | coaching check-in: structured fields + optional media → drives the **coaching streak**. |

Notes:
- **Media handled once** (Supabase Storage), referenced by both `group_posts`
  and `checkins`. Media type modeled as an enum (`image` / `audio` / `video`)
  so video is a later config flip, not a schema change.
- **Streaks are computed, not stored** — derived from posts/check-ins per day in
  each user's timezone. Nothing to keep in sync.
- **RLS** scopes rows to group membership (board) and to the two parties (check-
  ins). No open public-read policy — that gets removed from the starter schema.

---

## Tech

- Next.js (App Router, TypeScript) + Supabase (Postgres, Auth, Storage) on
  Vercel — the stack already scaffolded.
- Supabase Auth for real users and per-user RLS.
- PWA manifest + service worker so it installs to the home screen.

---

## Open questions / to revisit

- Exact fields for the coaching check-in (weight/sleep/energy/moved/notes is the
  starting set).
- Voice note transcription (nice-to-have; could feed AI summaries later).
- Notification strategy for "you're about to break your streak."
