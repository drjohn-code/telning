-- Telning 0003: marketing emails from the admin (api/admin-campaign.js), the unsubscribe list (api/unsubscribe.js),
-- the "Letters from Pim" box at checkout, and the bucket for campaign pictures.

-- where a buyer's marketing consent came from ('checkout', 'admin', …)
alter table public.customers add column if not exists consent_source text;

-- addresses that must never get a marketing email again (they unsubscribed); a new tick at checkout removes the row
create table if not exists public.email_suppressions (
  email text primary key,
  reason text not null default 'unsubscribed',
  source text,
  created_at timestamptz not null default now()
);

-- one row per marketing email sent from the admin
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  preheader text,
  content jsonb not null default '{}'::jsonb,       -- headline, text, image, button
  sources jsonb not null default '[]'::jsonb,       -- newsletter | buyers | pasted
  recipients integer not null default 0,
  sent integer not null default 0,
  failed integer not null default 0,
  skipped integer not null default 0,               -- unsubscribed or invalid
  status text not null default 'sending' check (status in ('sending', 'sent', 'failed')),
  created_by text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.email_log add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;
create index if not exists email_log_campaign on public.email_log (campaign_id);

do $$ declare t text; begin
  foreach t in array array['email_suppressions', 'campaigns'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists admin_read on public.%I;', t);
    execute format('create policy admin_read on public.%I for select to authenticated using (public.is_admin());', t);
  end loop;
end $$;

-- campaign pictures: public to read (email apps load them), only admins may upload; JPG, PNG or GIF up to 2 MB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('email-images', 'email-images', true, 2097152, array['image/jpeg', 'image/png', 'image/gif'])
on conflict (id) do nothing;
drop policy if exists email_images_admin_insert on storage.objects;
create policy email_images_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'email-images' and public.is_admin());
