-- Telning 0002: shipments typed in the admin (api/admin-ship.js). The carrier key is in `carrier`; for "Other" the
-- carrier's name goes in carrier_name. shipped_at: when the parcel was first saved as shipped; notified_at: when the
-- buyer last got the "shipped" email.
alter table public.fulfilments add column if not exists carrier_name text;
alter table public.fulfilments add column if not exists shipped_at timestamptz;
alter table public.fulfilments add column if not exists notified_at timestamptz;
