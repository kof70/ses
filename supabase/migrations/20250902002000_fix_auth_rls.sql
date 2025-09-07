-- Fix RLS policies that are blocking authentication
-- This script fixes the authentication timeout issue

-- First, let's check if RLS is enabled on users table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'users' AND n.nspname = 'public'
    ) THEN
        RAISE NOTICE 'Table users does not exist, skipping RLS check';
        RETURN;
    END IF;
    
    -- Enable RLS on users table if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'users' AND n.nspname = 'public' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on users table';
    END IF;
END $$;

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.users;

-- Create clean, working RLS policies for users table
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Fix agents table RLS
DROP POLICY IF EXISTS "Agents can view own data" ON public.agents;
DROP POLICY IF EXISTS "Agents can update own data" ON public.agents;
DROP POLICY IF EXISTS "Agents can insert own data" ON public.agents;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.agents;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.agents;
DROP POLICY IF EXISTS "Enable update for agents based on user_id" ON public.agents;

CREATE POLICY "Agents can view own data" ON public.agents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Agents can insert own data" ON public.agents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Agents can update own data" ON public.agents
    FOR UPDATE USING (auth.uid() = user_id);

-- Fix clients table RLS
DROP POLICY IF EXISTS "Clients can view own data" ON public.clients;
DROP POLICY IF EXISTS "Clients can update own data" ON public.clients;
DROP POLICY IF EXISTS "Clients can insert own data" ON public.clients;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.clients;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.clients;
DROP POLICY IF EXISTS "Enable update for clients based on user_id" ON public.clients;

CREATE POLICY "Clients can view own data" ON public.clients
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Clients can insert own data" ON public.clients
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clients can update own data" ON public.clients
    FOR UPDATE USING (auth.uid() = user_id);

-- Fix sos_alerts table RLS
DROP POLICY IF EXISTS "Users can view own sos alerts" ON public.sos_alerts;
DROP POLICY IF EXISTS "Users can insert own sos alerts" ON public.sos_alerts;
DROP POLICY IF EXISTS "Users can update own sos alerts" ON public.sos_alerts;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.sos_alerts;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.sos_alerts;
DROP POLICY IF EXISTS "Enable update for sos_alerts based on user_id" ON public.sos_alerts;

CREATE POLICY "Users can view own sos alerts" ON public.sos_alerts
    FOR SELECT USING (
        auth.uid() = agent_id OR 
        auth.uid() = client_id
    );

CREATE POLICY "Users can insert own sos alerts" ON public.sos_alerts
    FOR INSERT WITH CHECK (
        auth.uid() = agent_id OR 
        auth.uid() = client_id
    );

CREATE POLICY "Users can update own sos alerts" ON public.sos_alerts
    FOR UPDATE USING (
        auth.uid() = agent_id OR 
        auth.uid() = client_id
    );

-- Fix annonces table RLS
DROP POLICY IF EXISTS "Users can view all annonces" ON public.annonces;
DROP POLICY IF EXISTS "Users can insert own annonces" ON public.annonces;
DROP POLICY IF EXISTS "Users can update own annonces" ON public.annonces;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.annonces;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.annonces;
DROP POLICY IF EXISTS "Enable update for annonces based on created_by" ON public.annonces;

CREATE POLICY "Users can view all annonces" ON public.annonces
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own annonces" ON public.annonces
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own annonces" ON public.annonces
    FOR UPDATE USING (auth.uid() = created_by);

-- Ensure the update_updated_at_column function is properly configured
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add triggers for updated_at columns
DO $$
BEGIN
    -- Add trigger to users table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON public.users
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Add trigger to agents table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS update_agents_updated_at ON public.agents;
        CREATE TRIGGER update_agents_updated_at
            BEFORE UPDATE ON public.agents
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Add trigger to clients table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
        CREATE TRIGGER update_clients_updated_at
            BEFORE UPDATE ON public.clients
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Add trigger to sos_alerts table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sos_alerts' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS update_sos_alerts_updated_at ON public.sos_alerts;
        CREATE TRIGGER update_sos_alerts_updated_at
            BEFORE UPDATE ON public.sos_alerts
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Add trigger to annonces table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'annonces' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS update_annonces_updated_at ON public.annonces;
        CREATE TRIGGER update_annonces_updated_at
            BEFORE UPDATE ON public.annonces
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Ensure the auth schema is accessible
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT SELECT ON auth.users TO anon, authenticated;

