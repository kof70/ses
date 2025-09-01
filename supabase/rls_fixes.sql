-- Fix 'infinite recursion detected in policy for relation users'
-- Ensure policies don't self-reference via views or call the same policy function recursively.
-- Example safe policies for table users (adjust to your schema):

-- Disable RLS temporarily to edit policies safely
alter table public.users disable row level security;

-- Drop problematic policies if exist
drop policy if exists Users
