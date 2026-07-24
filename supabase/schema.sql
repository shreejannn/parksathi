-- =========================================================
-- ParkSathi Database Schema
-- Run this whole file once in Supabase SQL Editor
-- (Project -> SQL Editor -> New query -> paste -> Run)
-- =========================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- PROFILES  (1-1 with auth.users)
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text unique,
  license_photo_url text,
  avatar_url text,
  credits integer not null default 20,          -- starting free credits
  is_host boolean not null default false,        -- has ever listed a spot
  rating_avg numeric(2,1) not null default 5.0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------
-- VEHICLES  (a user can have many)
-- ---------------------------------------------------------
create table if not exists public.vehicles (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  nickname text,
  plate_number text not null,
  vehicle_type text not null default 'car' check (vehicle_type in ('car','bike','scooter','van','other')),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.vehicles enable row level security;

create policy "users manage their own vehicles"
  on public.vehicles for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ---------------------------------------------------------
-- PARKING SPOTS
-- ---------------------------------------------------------
create table if not exists public.parking_spots (
  id uuid primary key default uuid_generate_v4(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  mode text not null default 'credit' check (mode in ('credit','commercial')),
  price_per_hour numeric(10,2) not null default 0,   -- rupees/hour, 0 for pure-credit spots
  credit_per_hour integer not null default 1,
  latitude double precision not null,
  longitude double precision not null,
  address text,
  total_slots integer not null default 1,
  available_slots integer not null default 1,
  is_active boolean not null default true,
  photo_url text,
  qr_secret text not null default encode(gen_random_bytes(8), 'hex'),
  created_at timestamptz not null default now()
);

alter table public.parking_spots enable row level security;

create policy "spots are viewable by everyone"
  on public.parking_spots for select
  using (true);

create policy "hosts manage their own spots"
  on public.parking_spots for insert
  with check (auth.uid() = host_id);

create policy "hosts update their own spots"
  on public.parking_spots for update
  using (auth.uid() = host_id);

create policy "hosts delete their own spots"
  on public.parking_spots for delete
  using (auth.uid() = host_id);

-- ---------------------------------------------------------
-- BOOKINGS / PARKING SESSIONS
-- ---------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  spot_id uuid not null references public.parking_spots(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  status text not null default 'reserved'
    check (status in ('reserved','active','completed','cancelled')),
  reserved_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz,
  duration_minutes integer,
  mode text not null,
  credits_charged integer not null default 0,
  amount_charged numeric(10,2) not null default 0,
  qr_token text not null default encode(gen_random_bytes(10), 'hex'),
  created_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

create policy "driver or host can view a booking"
  on public.bookings for select
  using (
    auth.uid() = driver_id
    or auth.uid() in (select host_id from public.parking_spots where id = spot_id)
  );

create policy "drivers create their own bookings"
  on public.bookings for insert
  with check (auth.uid() = driver_id);

create policy "driver or host can update a booking"
  on public.bookings for update
  using (
    auth.uid() = driver_id
    or auth.uid() in (select host_id from public.parking_spots where id = spot_id)
  );

-- ---------------------------------------------------------
-- RATINGS  (platform rating; google rating is just a stored reference number)
-- ---------------------------------------------------------
create table if not exists public.ratings (
  id uuid primary key default uuid_generate_v4(),
  spot_id uuid not null references public.parking_spots(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  rater_id uuid not null references public.profiles(id) on delete cascade,
  stars integer not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (booking_id)
);

alter table public.ratings enable row level security;

create policy "ratings are viewable by everyone"
  on public.ratings for select
  using (true);

create policy "raters insert their own rating"
  on public.ratings for insert
  with check (auth.uid() = rater_id);

-- ---------------------------------------------------------
-- NOTIFICATIONS (in-app log, mirrors what OneSignal pushes)
-- ---------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  data jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "users view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "users update their own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "system inserts notifications"
  on public.notifications for insert
  with check (true);

-- ---------------------------------------------------------
-- FUNCTIONS: start / end a parking session via QR scan
-- ---------------------------------------------------------

-- Start session: called when the driver scans the physical QR code
-- stuck at the parking spot (encodes the spot's qr_secret).
create or replace function public.start_parking_session(
  p_booking_id uuid,
  p_spot_qr_secret text
)
returns public.bookings
language plpgsql
security definer
as $$
declare
  b public.bookings;
  s public.parking_spots;
begin
  select * into b from public.bookings where id = p_booking_id;

  if b is null then
    raise exception 'Booking not found';
  end if;

  select * into s from public.parking_spots where id = b.spot_id;

  if s.qr_secret <> p_spot_qr_secret then
    raise exception 'This QR code does not match the reserved spot';
  end if;

  if b.status <> 'reserved' then
    raise exception 'Booking is not in a reservable state';
  end if;

  update public.bookings
    set status = 'active', started_at = now()
    where id = p_booking_id
    returning * into b;

  update public.parking_spots
    set available_slots = greatest(available_slots - 1, 0)
    where id = b.spot_id;

  return b;
end;
$$;

-- End session: called when the driver scans the spot's QR code again to leave
create or replace function public.end_parking_session(
  p_booking_id uuid,
  p_spot_qr_secret text
)
returns public.bookings
language plpgsql
security definer
as $$
declare
  b public.bookings;
  s public.parking_spots;
  mins integer;
  hours numeric;
  charge_credits integer;
  charge_amount numeric;
  driver_credits integer;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b is null then
    raise exception 'Booking not found';
  end if;

  select * into s from public.parking_spots where id = b.spot_id;

  if s.qr_secret <> p_spot_qr_secret then
    raise exception 'This QR code does not match the reserved spot';
  end if;
  if b.status <> 'active' then
    raise exception 'Booking is not active';
  end if;

  mins := greatest(1, ceil(extract(epoch from (now() - b.started_at)) / 60));
  hours := ceil(mins / 60.0);

  if b.mode = 'credit' then
    charge_credits := hours * s.credit_per_hour;
    charge_amount := 0;
  else
    charge_credits := 0;
    charge_amount := hours * s.price_per_hour;
  end if;

  update public.bookings
    set status = 'completed',
        ended_at = now(),
        duration_minutes = mins,
        credits_charged = charge_credits,
        amount_charged = charge_amount
    where id = p_booking_id
    returning * into b;

  update public.parking_spots
    set available_slots = least(available_slots + 1, total_slots)
    where id = b.spot_id;

  if b.mode = 'credit' then
    select credits into driver_credits from public.profiles where id = b.driver_id;
    update public.profiles set credits = credits - charge_credits where id = b.driver_id;
    update public.profiles set credits = credits + charge_credits where id = s.host_id;
  end if;

  return b;
end;
$$;

-- ---------------------------------------------------------
-- Realtime: let the app subscribe to live spot + booking changes
-- ---------------------------------------------------------
alter publication supabase_realtime add table public.parking_spots;
alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.notifications;
