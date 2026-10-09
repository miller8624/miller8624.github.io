# Playa Progress cloud dashboard

Single-owner, phone-friendly fitness dashboard. Public source contains no user photos, personal measurements, passwords, sessions, or database credentials. Private records are served only after authentication.

## Railway deployment

Use the repository's `/fitness` root directory and `Dockerfile`. The app runs one replica on port 3000. Set a `/healthz` healthcheck. Connect the existing Postgres service with `DATABASE_URL=${{Postgres.DATABASE_URL}}`, and set `NODE_ENV=production`, `PORT=3000`, `APP_ORIGIN` to the exact HTTPS domain, and a random `SETUP_TOKEN` of at least 32 characters. Optional `INITIAL_SETTINGS` is private JSON with `trip`, `start`, `steps`, `protein`, `carbs`, `fat`. Keep these values in Railway variables, never the repository.

The first visitor needs the one-time setup code to choose a passphrase (14+ characters). Once initialized, setup is disabled. Passwords are salted and scrypt-hashed; sessions are random, hashed in the database, and sent via Secure, HttpOnly, SameSite cookies. Remove SETUP_TOKEN after account creation. There is no public registration or email-based password recovery. A forgotten password requires an operator-assisted reset, not clearing the database.

## Cloud sync

Settings, daily entries, weekly reviews and sessions persist in Postgres. Each record has a revision; stale updates are rejected. Clients refresh on focus and every 30 seconds while visible and no form is being edited. Saves need connectivity; unsaved form contents remain available on a failure but are lost on reload/close. Backups are plaintext JSON and must be kept private. Import merges dates, replaces matching records and settings, and rejects changes if the cloud version has moved since the backup import screen loaded.

Database tables `owner`, `sessions`, `records`, `meta` are created at startup. Keep a single replica: the request queue serializes transactions and revision checks through one database connection. Do not scale replicas without replacing this with database-level locking/conditional writes.

## Local development and verification

Requires Node 24+. `npm ci`, then set `SETUP_TOKEN` and run `npm start`. In local development only, SQLite is used if DATABASE_URL is absent. No local database is committed. `npm test` runs isolation/authentication, two-session sync, stale edits, imports, logout, validation and persistence across server restart. Production refuses to start without Postgres.

No Apple Health, Strong, Fitness+ or YMCA integration is claimed. Logging remains manual. Private photo uploads are available after sign-in.

## Private photos and goal tracking

Authenticated photo uploads are normalized to JPEG, resized, stripped of metadata and stored in `fitness_photos`. Photos are not included in JSON backups. Keep your originals as an independent backup. Side-by-side and reveal-slider comparisons preserve the complete image frame on mobile.

Optional settings `goalWeight` and `goalStart` define a linear planning path ending on `trip`. Recorded weights and rolling seven-day averages are shown against this guide. Existing settings and older backups remain compatible. No target is chosen automatically.

Apple Health export routes are disabled with HTTP 410. Previously issued tokens can no longer write any steps. All activity logging is manual.

## Daily workouts, food inspiration and rewards

Today shows the complete planned session before its check-in. Exercise dialogs include original setup cues and schematic animated SVG sketches, with alternative movements selectable individually. Sketches are not biomechanics demonstrations; ACE/NASM demo libraries provide external examples. No third-party exercise images are bundled. Animation respects reduced-motion preferences and can be paused.

Nutrition rotates 14 meal/snack ideas by calendar date, with a manual shuffle. Macros are approximate; MyFitnessPal remains a separate manual diary.

Rewards are derived from meaningful dated cloud check-ins (10 points), walking-goal days (20), and planned activities (30). Duplicate saves cannot duplicate points. Current and best check-in streaks, walking streaks, six badges, a seven-day trail and 200-point levels are recalculated from records. Confetti fires only after a confirmed save that newly achieves today's check-in/step/activity goal, with an in-session off switch and reduced-motion support. No extra workout is required on a recovery day.
