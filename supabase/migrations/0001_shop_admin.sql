-- Telning shop admin: customers, orders, fulfilments, follow-ups, messages, newsletter, Send Pim, quotes, email log,
-- webhook events, admin users. RLS on every table: no public reads; admins (rows in admin_users) read everything;
-- writes come from server routes with the service role key. Run: supabase db push (or paste into the SQL editor).

create extension if not exists pgcrypto;

-- ---------- admin users: who may open /admin ----------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'admin' check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users a where a.user_id = auth.uid());
$$;

-- ---------- customers ----------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  phone text,
  country text,
  marketing_consent boolean not null default false,
  consent_at timestamptz,
  first_order_at timestamptz,
  last_order_at timestamptz,
  orders_count integer not null default 0,
  total_spent_cents bigint not null default 0,
  currency text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- orders ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,                      -- T-XXXXXXXX
  stripe_session_id text not null unique,
  stripe_payment_intent text,
  customer_id uuid references public.customers(id) on delete set null,
  email text not null,
  name text,
  phone text,
  address jsonb not null default '{}'::jsonb,
  country text,
  region text,                                      -- EU | UK | US | CA
  currency text not null,
  subtotal_cents bigint,
  shipping_cents bigint,
  tax_cents bigint,
  total_cents bigint not null,
  live boolean not null default false,
  status text not null default 'paid' check (status in ('paid', 'making', 'shipped', 'delivered', 'cancelled', 'refunded', 'returned')),
  notes text,
  placed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_placed_at on public.orders (placed_at desc);
create index if not exists orders_email on public.orders (email);
create index if not exists orders_status on public.orders (status);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sku text not null,
  variant text,
  name text not null,
  qty integer not null check (qty > 0),
  unit_cents bigint,
  amount_cents bigint,
  partner text,                                     -- server code only: lulu | printful | gelato | mixed
  print_file text
);
create index if not exists order_items_order on public.order_items (order_id);
create index if not exists order_items_sku on public.order_items (sku);

-- ---------- fulfilments: one per partner per order ----------
create table if not exists public.fulfilments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  partner text not null,
  partner_order_id text,
  status text not null default 'new' check (status in ('new', 'sent', 'accepted', 'making', 'shipped', 'delivered', 'rejected', 'cancelled', 'manual')),
  tracking_url text,
  tracking_number text,
  carrier text,
  items jsonb not null default '[]'::jsonb,
  last_update timestamptz not null default now(),
  error text,
  created_at timestamptz not null default now(),
  unique (order_id, partner)
);
create index if not exists fulfilments_status on public.fulfilments (status);

-- ---------- follow-ups: one inbox, from partners and from customers ----------
create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('partner', 'customer')),
  order_id uuid references public.orders(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  fulfilment_id uuid references public.fulfilments(id) on delete set null,
  subject text not null,
  note text,
  status text not null default 'open' check (status in ('open', 'waiting', 'done')),
  due_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists follow_ups_status on public.follow_ups (status, due_at);

-- ---------- messages: the contact form and return requests ----------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'contact' check (kind in ('contact', 'return', 'damage', 'other')),
  order_number text,
  email text not null,
  name text,
  body text not null,
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  created_at timestamptz not null default now()
);

-- ---------- newsletter ----------
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  list text not null default 'news',                -- news | guide | teacher
  consent boolean not null default false,
  consent_source text,
  confirm_token text,
  confirmed_at timestamptz,                         -- double opt-in time
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- Send Pim (the story card form: book, ending, first name, parent email; no photos) ----------
create table if not exists public.send_pim_submissions (
  id uuid primary key default gen_random_uuid(),
  parent_email text not null,
  child_first_name text,
  child_age integer,
  book_sku text,
  ending text,
  line text,
  status text not null default 'new' check (status in ('new', 'sent', 'skipped')),
  card_sent_at timestamptz,
  created_at timestamptz not null default now(),
  delete_after date not null default (current_date + 30)
);

-- ---------- organisation quotes ----------
create table if not exists public.org_quotes (
  id uuid primary key default gen_random_uuid(),
  organisation text not null,
  country text,
  children text,
  email text not null,
  wish text not null,
  invoice boolean not null default false,
  sample boolean not null default false,
  status text not null default 'new' check (status in ('new', 'quoted', 'invoiced', 'won', 'lost')),
  note text,
  created_at timestamptz not null default now()
);

-- ---------- email log ----------
create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  template text not null,
  to_email text not null,
  subject text not null,
  order_id uuid references public.orders(id) on delete set null,
  provider_id text,
  status text not null default 'sent' check (status in ('sent', 'failed', 'preview')),
  error text,
  created_at timestamptz not null default now()
);
create index if not exists email_log_created on public.email_log (created_at desc);

-- ---------- webhook events (Stripe and partners), for idempotency and debugging ----------
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,                             -- stripe | lulu | printful | gelato
  event_id text,
  type text,
  payload jsonb,
  processed boolean not null default false,
  error text,
  created_at timestamptz not null default now(),
  unique (source, event_id)
);

-- ---------- products (read-only list in the admin; status live / coming soon) ----------
create table if not exists public.products (
  sku text primary key,
  name text not null,
  type text not null,
  category text not null,
  url text,
  price_eur_cents integer,
  status text not null default 'live' check (status in ('live', 'coming_soon', 'retired')),
  updated_at timestamptz not null default now()
);

-- ---------- updated_at ----------
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['customers', 'orders', 'follow_ups'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s; create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at();', t);
  end loop;
end $$;

-- ---------- customer totals follow the orders ----------
create or replace function public.apply_order_to_customer() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.customer_id is null then return new; end if;
  update public.customers c set
    orders_count = (select count(*) from public.orders o where o.customer_id = c.id and o.status not in ('cancelled', 'refunded')),
    total_spent_cents = (select coalesce(sum(o.total_cents), 0) from public.orders o where o.customer_id = c.id and o.status not in ('cancelled', 'refunded')),
    first_order_at = least(coalesce(c.first_order_at, new.placed_at), new.placed_at),
    last_order_at = greatest(coalesce(c.last_order_at, new.placed_at), new.placed_at),
    currency = coalesce(c.currency, new.currency)
  where c.id = new.customer_id;
  return new;
end $$;
drop trigger if exists orders_apply_customer on public.orders;
create trigger orders_apply_customer after insert or update of status, total_cents on public.orders for each row execute function public.apply_order_to_customer();

-- ---------- follow-ups: a partner rejection opens one at once ----------
create or replace function public.fulfilment_follow_up() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'rejected' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    insert into public.follow_ups (type, order_id, fulfilment_id, subject, note, status, due_at)
    values ('partner', new.order_id, new.id, 'Partner rejected the order: ' || new.partner, coalesce(new.error, 'No reason given'), 'open', current_date);
  end if;
  return new;
end $$;
drop trigger if exists fulfilments_follow_up on public.fulfilments;
create trigger fulfilments_follow_up after insert or update on public.fulfilments for each row execute function public.fulfilment_follow_up();

-- ---------- follow-ups: no update from a partner for 3 days (call daily from pg_cron or the admin "check" button) ----------
create or replace function public.open_stale_fulfilment_follow_ups() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer := 0;
begin
  insert into public.follow_ups (type, order_id, fulfilment_id, subject, note, status, due_at)
  select 'partner', f.order_id, f.id, 'No update from the partner for 3 days: ' || f.partner, 'Last update ' || to_char(f.last_update, 'YYYY-MM-DD HH24:MI') || '. Check the partner dashboard.', 'open', current_date
  from public.fulfilments f
  where f.status in ('new', 'sent', 'accepted', 'making') and f.last_update < now() - interval '3 days'
    and not exists (select 1 from public.follow_ups u where u.fulfilment_id = f.id and u.status <> 'done' and u.subject like 'No update%');
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------- dashboard views (admins only through RLS on the base tables; views run as the caller) ----------
create or replace view public.v_revenue as
select currency,
  sum(total_cents) filter (where placed_at >= current_date) as today_cents,
  sum(total_cents) filter (where placed_at >= current_date - 6) as last7_cents,
  sum(total_cents) filter (where placed_at >= current_date - 29) as last30_cents,
  count(*) filter (where placed_at >= current_date - 29) as orders30,
  avg(total_cents) filter (where placed_at >= current_date - 29) as aov30_cents
from public.orders where status not in ('cancelled', 'refunded') group by currency;

create or replace view public.v_top_products as
select i.sku, i.name, sum(i.qty) as qty, count(distinct i.order_id) as orders
from public.order_items i join public.orders o on o.id = i.order_id
where o.placed_at >= current_date - 29 and o.status not in ('cancelled', 'refunded')
group by i.sku, i.name order by qty desc limit 10;

-- ---------- RLS: no public reads; admins read; the service role (server routes) writes ----------
do $$ declare t text; begin
  foreach t in array array['admin_users', 'customers', 'orders', 'order_items', 'fulfilments', 'follow_ups', 'messages', 'newsletter_subscribers', 'send_pim_submissions', 'org_quotes', 'email_log', 'webhook_events', 'products'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists admin_read on public.%I;', t);
    execute format('create policy admin_read on public.%I for select to authenticated using (public.is_admin());', t);
  end loop;
end $$;
-- admins may update the working tables from the admin panel (notes, statuses); inserts and deletes stay server-side
do $$ declare t text; begin
  foreach t in array array['orders', 'fulfilments', 'follow_ups', 'messages', 'org_quotes', 'customers'] loop
    execute format('drop policy if exists admin_update on public.%I;', t);
    execute format('create policy admin_update on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin());', t);
  end loop;
end $$;
drop policy if exists admin_insert_follow_ups on public.follow_ups;
create policy admin_insert_follow_ups on public.follow_ups for insert to authenticated with check (public.is_admin());

-- GDPR: export and delete one customer (admin only). Delete keeps the order rows the accounting law needs, but
-- removes the personal data from them.
create or replace function public.gdpr_export(p_customer uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare out jsonb;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  select jsonb_build_object(
    'customer', to_jsonb(c),
    'orders', (select coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb) from public.orders o where o.customer_id = c.id),
    'items', (select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb) from public.order_items i join public.orders o on o.id = i.order_id where o.customer_id = c.id),
    'emails', (select coalesce(jsonb_agg(to_jsonb(e)), '[]'::jsonb) from public.email_log e where e.to_email = c.email),
    'newsletter', (select to_jsonb(n) from public.newsletter_subscribers n where n.email = c.email),
    'messages', (select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) from public.messages m where m.email = c.email)
  ) into out from public.customers c where c.id = p_customer;
  return out;
end $$;

create or replace function public.gdpr_delete(p_customer uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  select email into v_email from public.customers where id = p_customer;
  update public.orders set email = 'deleted@invalid', name = null, phone = null, address = '{}'::jsonb, notes = null where customer_id = p_customer;
  delete from public.email_log where to_email = v_email;
  delete from public.messages where email = v_email;
  delete from public.newsletter_subscribers where email = v_email;
  delete from public.send_pim_submissions where parent_email = v_email;
  delete from public.follow_ups where customer_id = p_customer and type = 'customer';
  delete from public.customers where id = p_customer;
end $$;

-- pg_cron (enable the extension in the dashboard first): open stale follow-ups every morning
-- select cron.schedule('stale-fulfilments', '15 6 * * *', $$select public.open_stale_fulfilment_follow_ups()$$);
