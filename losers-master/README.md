# ParkSathi — Smart Parking App (free stack)

Next.js 14 (App Router) + Supabase (DB/Auth/Storage/Realtime) + Tailwind +
OpenStreetMap/Leaflet + OneSignal push + QR-based park sessions.
Every service used has a free tier — nothing here requires a paid plan.

This README is written so you can follow it top to bottom with **zero prior
Next.js/Supabase experience**. Do the steps in order.

---

## 0. What you need installed on your computer

1. **Node.js 18 or newer** — download from https://nodejs.org (LTS version).
   Check it worked: open a terminal and run `node -v`.
2. **A code editor** — VS Code is recommended (free): https://code.visualstudio.com
3. **Git** (optional but recommended for deploying) — https://git-scm.com

---

## 1. Get the project onto your computer

1. Download/copy the `parksathi` folder you were given onto your computer.
2. Open a terminal **inside that folder** (in VS Code: Terminal → New Terminal).
3. Install all dependencies:
   ```bash
   npm install
   ```
   This reads `package.json` and downloads Next.js, Supabase, Leaflet, etc.
   It only needs internet access on your own machine.

---

## 2. Create your free Supabase project

Supabase gives you a Postgres database, authentication, file storage, and
realtime updates — all on one free project.

1. Go to https://supabase.com → **Start your project** → sign in with GitHub or email.
2. Click **New Project**.
   - Name: `parksathi`
   - Database password: generate one and **save it somewhere** (you may need it later).
   - Region: pick the one closest to Nepal (e.g. Singapore).
   - Plan: **Free**.
3. Wait ~2 minutes while it provisions.
4. Once it's ready, go to **Project Settings → API**. You'll see:
   - **Project URL** → copy this
   - **anon public** key → copy this
5. In your project folder, duplicate `.env.local.example` and rename the copy to
   `.env.local`. Paste in the two values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

### 2.1 Create the database tables

1. In Supabase, open **SQL Editor** (left sidebar) → **New query**.
2. Open the file `supabase/schema.sql` from this project, copy **all** of it,
   paste it into the SQL editor, and click **Run**.
3. You should see "Success. No rows returned." This created every table
   (profiles, vehicles, parking_spots, bookings, ratings, notifications),
   security rules, and the two functions that power QR start/end sessions.

### 2.2 Create storage buckets (for license photos & spot photos)

1. Go to **Storage** (left sidebar) → **New bucket**.
2. Create a bucket named exactly `licenses`. Toggle **Public bucket = ON**
   (simplest for a free/demo project — for production you'd keep it private
   and use signed URLs instead).
3. Create a second bucket named `avatars`, also public.
4. Create a third bucket named `spot-photos`, also public.
5. For each bucket, open it → **Policies** → **New policy** → choose the
   "Allow authenticated users to upload" template, and a "Allow public read"
   template for select. (If you made the buckets Public in step 2, read access
   already works — you mainly need an INSERT policy for authenticated users.)
   Quick version: click **New Policy → For full customization** and use:
   ```sql
   create policy "auth users can upload"
   on storage.objects for insert
   to authenticated
   with check (bucket_id in ('licenses','avatars','spot-photos'));

   create policy "anyone can read"
   on storage.objects for select
   using (bucket_id in ('licenses','avatars','spot-photos'));
   ```

### 2.3 Turn on Google sign-in (optional but in your spec)

1. In Supabase: **Authentication → Providers → Google** → toggle it on.
2. You need a Google OAuth Client ID/Secret (free):
   - Go to https://console.cloud.google.com/ → create a project (free).
   - **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Application type: **Web application**.
   - Authorized redirect URI: paste the callback URL Supabase shows you on
     the Google provider screen (looks like
     `https://xxxx.supabase.co/auth/v1/callback`).
   - Copy the generated **Client ID** and **Client Secret** back into the
     Supabase Google provider screen and **Save**.
3. In **Authentication → URL Configuration**, set:
   - Site URL: `http://localhost:3000` (for now — change this after you deploy)
   - Redirect URLs: add `http://localhost:3000/auth/callback`

If you'd rather skip Google for now, that's fine — email/password signup
already works without any of this.

---

## 3. Create your free OneSignal account (push notifications)

1. Go to https://onesignal.com → sign up free.
2. **New App/Website** → name it `ParkSathi`.
3. Choose platform **Web Push** → **Typical Site**.
4. Site name: `ParkSathi`, Site URL: `http://localhost:3000` for now.
5. Skip the "add code manually" step — this project already has the SDK
   wired in `src/lib/onesignal.ts`.
6. After creating the app, go to **Settings → Keys & IDs** and copy the
   **OneSignal App ID**.
7. Add it to `.env.local`:
   ```
   NEXT_PUBLIC_ONESIGNAL_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

Sending an actual push (e.g. "Your reserved spot is ready") is done from
OneSignal's dashboard **Messages → New Push** while you're testing — for a
production app you'd call OneSignal's REST API from a Supabase Edge Function
whenever a row changes (e.g. a booking becomes active). That backend trigger
is a good next step once the core app is working, and is not required to
demo the app.

---

## 4. Run it locally

```bash
npm run dev
```

Open http://localhost:3000 — you should land on the login screen.

1. Click **Sign up**, fill in name/email/phone/license photo/password.
2. You'll land on the Home tab with an OpenStreetMap map centered on your
   location (allow location access when your browser asks).
3. Go to the **Profile** tab → **My vehicles** → add a vehicle.
4. Go to the **Listings** tab → **Add spot** → drop a pin, set credit or
   commercial pricing, publish.
5. Back in **Listings**, under your new spot click **View printable QR code**
   — this is the sticker you'd place at the real parking spot.
6. From another test account (or the same one), open the spot from the map
   or list → **Reserve this spot** → you'll land on the session screen →
   **Scan to start parking** → point your camera at the QR you generated in
   step 5 → the timer starts.
7. Click **Scan to end parking**, scan the same QR again → session
   completes, credits/amount are calculated automatically, and you can rate
   the spot.

---

## 5. Deploy it for free (Vercel)

1. Push this project to a GitHub repository (create one on github.com, then
   in your project folder: `git init`, `git add .`, `git commit -m "init"`,
   `git remote add origin <your repo URL>`, `git push -u origin main`).
2. Go to https://vercel.com → sign up free with GitHub → **Add New Project**
   → import your repo.
3. In the **Environment Variables** section, add the same 4 values from your
   `.env.local` (Supabase URL, Supabase anon key, OneSignal App ID, and set
   `NEXT_PUBLIC_SITE_URL` to your future Vercel URL, e.g.
   `https://parksathi.vercel.app`).
4. Click **Deploy**. Free tier is enough for a class project / small pilot.
5. Afterwards, go back to:
   - **Supabase → Authentication → URL Configuration**: update Site URL and
     add `https://parksathi.vercel.app/auth/callback` to redirect URLs.
   - **Google Cloud Console credentials**: add the same production callback
     URL as an authorized redirect URI.
   - **OneSignal → Settings → Web Push**: update Site URL to the production
     domain (OneSignal web push needs HTTPS, which Vercel gives you free).

---

## 6. How the QR start/end flow works (so you can explain/defend it)

- Every parking spot gets a random `qr_secret` the moment it's created
  (see `parking_spots.qr_secret` in the schema).
- The host prints that as a QR code (`/list/[spotId]/qr`) and sticks it at
  the physical spot.
- When a driver reserves a spot, a `bookings` row is created with
  `status = 'reserved'`.
- Arriving and scanning the sticker calls the Postgres function
  `start_parking_session(booking_id, qr_secret)`, which checks the scanned
  secret matches that spot, flips the booking to `active`, stamps
  `started_at`, and decrements `available_slots`.
- Scanning the same sticker again on the way out calls
  `end_parking_session`, which stamps `ended_at`, computes elapsed minutes,
  and charges **credits** (community/credit mode) or a **Rs. amount**
  (commercial mode) — all inside the database function so it can't be
  tampered with from the browser.
- Both functions run with `security definer`, so regular users can call them
  through Supabase's RPC endpoint without needing direct table-write access.

## 6.5 Phase 2 features (verification, ratings, admin, scan-anywhere QR)

This build adds:

- **Directions everywhere** — every spot (map popup, spot cards, booking
  page) now has a "Get there" button that opens Google Maps driving
  directions, next to "Reserve".
- **Scan QR from anywhere** — a floating "Scan QR" button on the Home tab
  and a `/scan` page let a driver scan a spot's sticker directly; the app
  figures out whether to start or end their session, or offers to reserve
  the spot if they haven't yet.
- **Real ratings** — rating a spot after a session now rolls up into that
  spot's `rating_avg`/`rating_count` (and the host's profile rating)
  automatically via a Postgres trigger, and shows up everywhere a rating is
  displayed (previously it was a hardcoded 4.8).
- **Reservation notifications** — a host now gets an in-app notification
  the instant someone books their spot (and a driver gets one when their
  session starts/ends), via a `bookings` trigger — no extra code needed on
  the client.
- **Listings, reorganized** — the Listings tab is now split into
  **Parking spots** (browse everyone's spots) and **My listings** (spots
  you host), each searchable by name/address and sortable by distance or
  availability.
- **Identity verification, in Profile** — Profile now has an "Identity
  verification" row. Tapping it opens a form for full name, date of birth,
  license number, and license photo — the same fields collected at signup,
  now editable/resubmittable any time, with a status pill
  (unverified/pending/verified/rejected).
- **Admin section** (`/admin`) — a new gated area for reviewing and
  approving/rejecting driver license verifications and parking-spot
  listings, plus a simple user list with an admin-toggle. New spots are
  `pending` by default and only appear on the map/browse list once an
  admin approves them.

### Running the migration

Open **SQL Editor** in Supabase and run `supabase/schema.sql` again — the
new "PHASE 2 MIGRATION" section at the bottom is additive and safe to run
even if you already ran the file before (everything uses
`add column if not exists` / `create or replace` / `drop ... if exists`).

### Making yourself an admin

There's no self-service way to become an admin (on purpose). After
signing up normally, run this once in the SQL Editor:

```sql
update public.profiles set is_admin = true where phone = '98XXXXXXXX';
```

Then open the app → Profile → you'll see an "Admin dashboard" shortcut.



- **Real-time traffic overlays** — you listed this as future; OpenStreetMap
  + Leaflet don't include live traffic for free, so it's not wired in.
- **Real payments for commercial spots** — since you asked for a
  zero-cost model, commercial bookings currently just *record* an amount
  due rather than charging a real card. When you're ready, Nepali gateways
  like eSewa or Khalti have sandbox/free developer accounts you could plug
  into the `end_parking_session` flow.
- **Server-triggered OneSignal push** (actual phone push notifications,
  not just the in-app bell) — reservation/session notifications now write
  to the `notifications` table automatically via a Postgres trigger, and
  show up on the Alerts tab in real time. Turning those into an actual
  push to the phone still needs a small Supabase Edge Function calling the
  OneSignal REST API whenever a row is inserted into `notifications`. Ask
  me for this next if you want it — it's a focused, well-scoped addition.

## 8. Project structure

```
parksathi/
  supabase/schema.sql        <- run this once in Supabase SQL editor
  src/
    app/
      login/, signup/        <- auth pages
      auth/callback/         <- OAuth redirect handler
      (main)/                <- everything behind the bottom nav
        home/                <- live map (Home tab)
        list/, list/add/     <- listings feed + create-a-spot form
        list/[spotId]/qr/    <- printable QR for a host's spot
        booking/[spotId]/    <- spot detail + reserve
        session/[bookingId]/ <- QR scan to start/end + rating
        notifications/       <- in-app notification log
        profile/, profile/vehicles/
    components/              <- MapView, LocationPicker, QR scan/display, nav
    lib/                      <- Supabase clients, OneSignal init
    types/                    <- shared TypeScript types matching the DB
```

---

## 9. If something breaks

- **"Invalid API key" in the browser console** → your `.env.local` values
  are wrong or you forgot to restart `npm run dev` after editing it.
- **Map is blank** → you're offline, or an ad-blocker is blocking
  `tile.openstreetmap.org`.
- **Camera scanner doesn't open** → browsers only allow camera access on
  `https://` or `http://localhost` — this is why `allowLocalhostAsSecureOrigin`
  is set for OneSignal too, and why you must deploy to get camera scanning
  working on a phone that isn't `localhost`.
- **Google login redirects to an error page** → double-check the redirect
  URI matches *exactly* (including https vs http) in both Google Cloud
  Console and Supabase.
