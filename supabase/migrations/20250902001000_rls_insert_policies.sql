-- RLS INSERT policies to allow users to create their own records
-- Apply this in Supabase SQL editor or via migration runner

-- Ensure RLS is enabled (safe if already enabled)
alter table if exists public.users enable row level security;
alter table if exists public.agents enable row level security;
alter table if exists public.clients enable row level security;

-- Users: allow inserting own profile
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users' and policyname = 'users_insert_own'
  ) then
    create policy "users_insert_own"
      on public.users
      for insert
      to authenticated
      with check (auth.uid() = id);
  end if;
end $$;

-- Agents: allow inserting own agent row
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'agents' and policyname = 'agents_insert_own'
  ) then
    create policy "agents_insert_own"
      on public.agents
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;
end $$;

-- Clients: allow inserting own client row
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'clients' and policyname = 'clients_insert_own'
  ) then
    create policy "clients_insert_own"
      on public.clients
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;
end $$;


