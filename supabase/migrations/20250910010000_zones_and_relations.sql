-- Zones and relations for client/agent assignments
-- Ensure required extensions
create extension if not exists pgcrypto;
-- Create table: zones
create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Ensure unique constraints on user_id columns for FK targets (must be before FKs)
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'clients_user_id_unique'
  ) then
    alter table if exists public.clients
      add constraint clients_user_id_unique unique (user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'agents_user_id_unique'
  ) then
    alter table if exists public.agents
      add constraint agents_user_id_unique unique (user_id);
  end if;
end $$;

-- Client to zones (many-to-many)
create table if not exists public.client_zones (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references public.clients(user_id) on delete cascade,
  zone_id uuid not null references public.zones(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (client_user_id, zone_id)
);

-- Agent to zones (many-to-many)
create table if not exists public.agent_zones (
  id uuid primary key default gen_random_uuid(),
  agent_user_id uuid not null references public.agents(user_id) on delete cascade,
  zone_id uuid not null references public.zones(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (agent_user_id, zone_id)
);

-- Enable RLS
alter table public.zones enable row level security;
alter table public.client_zones enable row level security;
alter table public.agent_zones enable row level security;

-- Policies
-- zones: readable by authenticated users
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='zones' and policyname='zones_read_all_auth'
  ) then
    create policy "zones_read_all_auth" on public.zones
      for select to authenticated using (true);
  end if;
end $$;

-- client_zones: clients can read/write their own rows, admins can read/insert/delete all
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='client_zones' and policyname='client_zones_select_own'
  ) then
    create policy "client_zones_select_own" on public.client_zones
      for select to authenticated using (
        auth.uid() = client_user_id OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='client_zones' and policyname='client_zones_insert_own'
  ) then
    create policy "client_zones_insert_own" on public.client_zones
      for insert to authenticated with check (
        auth.uid() = client_user_id OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='client_zones' and policyname='client_zones_delete_own'
  ) then
    create policy "client_zones_delete_own" on public.client_zones
      for delete to authenticated using (
        auth.uid() = client_user_id OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
      );
  end if;
end $$;

-- agent_zones: agents can read/write their own rows
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='agent_zones' and policyname='agent_zones_select_own'
  ) then
    create policy "agent_zones_select_own" on public.agent_zones
      for select to authenticated using (
        auth.uid() = agent_user_id OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='agent_zones' and policyname='agent_zones_insert_own'
  ) then
    create policy "agent_zones_insert_own" on public.agent_zones
      for insert to authenticated with check (
        auth.uid() = agent_user_id OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='agent_zones' and policyname='agent_zones_delete_own'
  ) then
    create policy "agent_zones_delete_own" on public.agent_zones
      for delete to authenticated using (
        auth.uid() = agent_user_id OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
      );
  end if;
end $$;

-- Client last known position fields
alter table if exists public.clients
  add column if not exists last_latitude decimal(10,8),
  add column if not exists last_longitude decimal(11,8),
  add column if not exists last_position_at timestamptz;

-- Add phone numbers to users table (not null constraint)
alter table if exists public.users
  add column if not exists phone_number text;

-- Update existing users to have a default phone number if null
do $$ begin
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'users'
  ) then
    if exists (
      select 1 from information_schema.columns 
      where table_schema = 'public' and table_name = 'users' and column_name = 'phone_number'
    ) then
      update public.users 
      set phone_number = '+1234567890' 
      where phone_number is null;
    end if;
  end if;
end $$;

-- Add not null constraint to phone_number
do $$ begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'users' and column_name = 'phone_number'
  ) then
    alter table public.users 
    alter column phone_number set not null;
  end if;
end $$;

-- Agent-Client assignments
create table if not exists public.agent_client_assignments (
  id uuid primary key default gen_random_uuid(),
  agent_user_id uuid not null references public.agents(user_id) on delete cascade,
  client_user_id uuid not null references public.clients(user_id) on delete cascade,
  latitude decimal(10,8),
  longitude decimal(11,8),
  note text,
  statut text not null default 'assigne' check (statut in ('assigne','en_cours','termine','annule')),
  created_at timestamptz not null default now()
);

alter table public.agent_client_assignments enable row level security;

-- Policies: admin full access, agents read own, clients read own
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='agent_client_assignments' and policyname='aca_select'
  ) then
    create policy "aca_select" on public.agent_client_assignments
      for select to authenticated using (
        exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
        or agent_user_id = auth.uid()
        or client_user_id = auth.uid()
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='agent_client_assignments' and policyname='aca_insert_admin_or_agent'
  ) then
    create policy "aca_insert_admin_or_agent" on public.agent_client_assignments
      for insert to authenticated with check (
        exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
        or agent_user_id = auth.uid()
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='agent_client_assignments' and policyname='aca_delete_admin_or_owner'
  ) then
    create policy "aca_delete_admin_or_owner" on public.agent_client_assignments
      for delete to authenticated using (
        exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
        or agent_user_id = auth.uid()
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='agent_client_assignments' and policyname='aca_update_admin_or_owner'
  ) then
    create policy "aca_update_admin_or_owner" on public.agent_client_assignments
      for update to authenticated using (
        exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
        or agent_user_id = auth.uid()
      );
  end if;
end $$;

-- Insert default zones (localités/quartiers)
insert into public.zones (name, description) values
  ('Centre-ville', 'Centre historique et commercial'),
  ('Quartier des Affaires', 'Zone d''activités et bureaux'),
  ('Résidentiel Nord', 'Secteur résidentiel nord'),
  ('Résidentiel Sud', 'Secteur résidentiel sud'),
  ('Zone Industrielle', 'Parc industriel et entrepôts'),
  ('Université', 'Campus universitaire et environs'),
  ('Aéroport', 'Zone aéroportuaire et hôtels'),
  ('Plage', 'Zone côtière et touristique'),
  ('Montagne', 'Secteur montagneux et résidentiel'),
  ('Périphérie Est', 'Banlieue est de la ville')
on conflict do nothing;
