# BARMAP Project Context

## What BARMAP Is

BARMAP is an Ireland-focused calisthenics and outdoor fitness social map. It helps people find verified outdoor training spots, inspect equipment and source links, share sessions, save useful posts, submit new parks for review, and build lightweight community activity around parks, missions, and sessions.

The product started as a single HTML prototype and is now a working Next.js/React app with a real app shell, Supabase-backed account/post systems, a Leaflet map, park panels, social feed, profile surface, sessions, missions, and submit-a-spot flow.

## Inspect Before Changing

Before making changes, inspect the current codebase and git state. Read the relevant files first, understand existing patterns, and preserve user-authored unstaged work. Do not assume the previous conversation context is complete.

## Current Working Systems

- App shell with fixed top bar, bottom navigation, and floating create button.
- Feed tab with seeded and Supabase-backed posts.
- Post cards with likes, local comments sheet, share, and save actions.
- Map tab with Leaflet, satellite/map layers, tile fallback notices, search, markers, and park selection.
- Park detail panel with hero images, galleries, equipment chips, source/directions/map links, local park feed, session RSVP counts, and mission states.
- Auth modal with Supabase email/password signup and login.
- Profile page with signed-out state, profile header, editable profile entry point, posts, stats, saved posts, mission status, and workout log UI.
- Create post modal with image upload to Supabase Storage.
- Saved posts backed by Supabase `saved_posts`.
- Submit park flow backed by Supabase `submitted_spots`, falling back to localStorage when Supabase is unavailable.
- Sessions page with join toggles and local host-session draft.
- Missions page with proof upload UI and pending review flow.
- Workout logging stored locally in `localStorage`.

## Known UX Issues

- The visual system is heavily dark/gold and can feel one-note, dense, and low-contrast.
- Feed, missions, sessions, park panel, and profile use different interaction models, so the product does not yet feel fully tightened.
- Mission submissions require a video file but only store the file name locally; there is no real upload, review, or admin flow yet.
- Workout logs are local only and are not tied to a Supabase account.
- Comments are localStorage only and use the post author avatar rather than the commenter.
- Park panel Missions currently shows empty verified-result messaging rather than useful leaderboards.
- “Saved Spots” wording is misleading because the current system saves posts, not parks/spots.
- Sessions are mostly seeded/local behavior with no persistence or auth requirement.
- Submit park does not require login and does not surface submitted spots back into the map.
- Map search focuses the first match only; there is no result list or no-results feedback.
- Floating Create is always visible and may compete with bottom navigation and modal workflows on mobile.
- ESLint is not configured for non-interactive `npm run lint`.

## Current Priorities

1. Tighten the core MVP loop: map spot -> park panel -> create post -> feed/profile.
2. Decide whether Missions and Sessions stay in v1; persist them properly if yes, simplify or hide them if no.
3. Make saved behavior semantically clear: either call it saved posts everywhere or add true saved parks.
4. Add real Supabase persistence/storage for workout logs and mission submissions, or clearly mark them as local drafts.
5. Improve mobile layout polish around the floating create button, bottom nav, map controls, panels, and sheets.
6. Configure ESLint so `npm run lint` is non-interactive and useful.
7. Keep repo context clean; avoid temporary files and unrelated churn.

## Product Rules

- No visible button can be fake or dead. Every visible action must either perform a real action, open a real flow, show a clear unavailable/configuration message, or be removed until it is real.
- Prioritize the smallest useful MVP over broad prototype feature sprawl.
- Do not imply backend persistence, moderation, verification, uploads, notifications, or admin review unless the code actually supports it.
- Keep labels honest: saved posts are not saved parks unless a saved-parks system exists.
- Preserve real user trust over decorative polish.
- Prefer logged-in, persistent versions of social/product actions where the action matters to the user’s account.
- Avoid app functionality changes when the task is only to update project context.

## Backend Stack

- Frontend: Next.js 14, React 18, TypeScript.
- Map: Leaflet.
- Backend: Supabase.
- Auth: Supabase Auth with email/password.
- Database tables currently represented in `supabase/schema.sql`: `profiles`, `posts`, `saved_posts`, `submitted_spots`.
- Storage: Supabase Storage bucket `post-media` for uploaded post images.
- Local-only current state: post comments, workout logs, mission submissions, session joins/drafts, and fallback submitted spots.
- Hosting/deployment context: Vercel config exists.

## Design Direction

- BARMAP should feel like a real mobile-first utility for calisthenics people, not a marketing landing page.
- The first screen should remain the actual product experience.
- Prioritize map readability, fast scanning, honest status states, and ergonomic mobile flows.
- Use restrained, functional UI with clear hierarchy and stable touch targets.
- Keep cards for repeated items, modals, sheets, and genuinely framed tools; avoid unnecessary nested cards.
- The current dark/gold look is a starting point, but future design passes should add contrast, reduce monotony, and improve legibility.
- Visual assets should reveal real parks, equipment, sessions, posts, or map context wherever possible.
