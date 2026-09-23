# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A mobile-first gym routine builder web app. Users create machine-based workout routines, then execute them via a guided "workout player" that tracks sets, reps, weight, and rest periods. Supabase Auth (email + password, no public sign-up) with Row Level Security on every table, and access limited to members listed in `gym.members`. The app never uses the service-role key.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
npm test         # Unit tests (node --test)
```

## Architecture

### Tech Stack
- Next.js 16 with App Router
- React 19, TypeScript
- Supabase (Postgres in the `gym` schema, Supabase Auth, RLS) via `@supabase/ssr`
- Zustand for client state
- TanStack Query for server state
- Tailwind CSS v4

### Key Patterns

**Routing Structure:**
- `src/app/(tabs)/` - Main tabbed views with bottom navigation (Today, Routines, Build)
- `src/app/workout/[sessionId]/` - Full-screen workout player (no bottom nav)
- `src/app/api/` - Route handlers that query Supabase as the signed-in user
- `src/app/login/` - Email + password sign-in (no sign-up page)
- `src/app/auth/signout/` - POST route that clears the session
- `src/proxy.ts` - Next 16 proxy (formerly middleware): refreshes the session cookie, redirects signed-out visitors to `/login`, returns 401 JSON for `/api/*`

**State Management:**
- `src/stores/workout-player.ts` - Zustand store managing workout session state (phase, current exercise/set, rest timer, completed sets)
- Workout phases: `idle` → `working` → `resting` → `hydrating` → `summary`

**Data Flow:**
- All data calls go through API routes in `src/app/api/`
- Every handler starts with `requireUser()` from `src/lib/supabase/server.ts`, which returns a 401 when there is no session, otherwise a per-request client built from the anon key + the user's cookie
- Postgres RLS enforces ownership; handlers do not need to filter by `user_id`, and inserts get `user_id` from the column default `auth.uid()`
- Client fetches via TanStack Query with 60s stale time

### Data Model

Five tables in the `gym` schema: `machines`, `routines`, `routine_items`, `workout_sessions`, `workout_sets`. `machines` is a read-only catalogue common to all members; the other four carry `user_id` and are owner-only under RLS. Fresh setup: `supabase/schema.sql`. Existing databases: the ordered files in `supabase/launch/` (01 lockdown, 02 members, 03 FK fix, 04 RPCs, 05 backfill); see `docs/launch-checklist.md`.

`gym.members` lists who may use the app. Only the service role / SQL editor can write it; a restrictive `*_members_only` policy on every table ANDs membership into all other policies.

Key relationships:
- Routine has many RoutineItems (ordered by `position`)
- RoutineItem references a Machine
- WorkoutSession belongs to a Routine and has many WorkoutSets

### Design System

Dark theme defined in `src/globals.css` with CSS custom properties:
- Colors: `--bg-app`, `--bg-card`, `--accent-green`, etc.
- Use via Tailwind: `bg-bg-app`, `text-accent-green`, etc.

### Component Organization
- `src/components/ui/` - Reusable primitives (Button, Card, Input, Modal, NumberStepper)
- `src/components/workout/` - Workout player screens (WorkSetScreen, RestScreen, HydrationReminder, WorkoutSummary)
- `src/components/routines/` - Routine management (RoutineCard, MachinePickerModal, RoutineItemForm)

## Security rules

- Never import a service-role client into `src/`. `src/lib/supabase/server.ts` is `server-only` and uses the anon key.
- New route handlers must call `requireUser()` first and use the client it returns.
- New user-owned tables need `user_id uuid not null default auth.uid()`, RLS enabled, and one policy per operation `to authenticated` using `(select auth.uid()) = user_id`. Never `using (true)` on writes.
- Every new gym table gets a restrictive `<table>_members_only` policy using `(select gym.is_member())`.
- `npm run build` runs `scripts/check-db-lockdown.mjs` on Vercel and fails unless anon is denied on `gym` and the members gate exists. Don't bypass it.
- The service-role key is only for local scripts in `scripts/` (via `scripts/admin-client.ts`). Those scripts must set `user_id` explicitly.

## Environment Variables

App (`.env.local`, and Vercel):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - anon / publishable key (safe in the browser; RLS does the gating)

Local scripts only (never set on Vercel):
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` - used by `scripts/admin-client.ts`
- `SEED_USER_ID` - auth user id that seeded rows belong to
