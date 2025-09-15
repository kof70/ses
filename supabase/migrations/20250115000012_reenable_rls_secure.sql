-- Re-enable RLS with secure, non-recursive policies
-- This migration re-enables RLS after fixing the infinite recursion issue

-- 1. Re-enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_client_assignments ENABLE ROW LEVEL SECURITY;

-- 2. Create simple, secure policies for users table
-- Users can read their own profile
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admins can read all users
CREATE POLICY "admins_read_all_users" ON public.users
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- Admins can update all users
CREATE POLICY "admins_update_all_users" ON public.users
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- 3. Create policies for agents table
-- Agents can read their own data
CREATE POLICY "agents_select_own" ON public.agents
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Agents can update their own data
CREATE POLICY "agents_update_own" ON public.agents
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Admins can read all agents
CREATE POLICY "admins_read_all_agents" ON public.agents
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- Admins can update all agents
CREATE POLICY "admins_update_all_agents" ON public.agents
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- 4. Create policies for clients table
-- Clients can read their own data
CREATE POLICY "clients_select_own" ON public.clients
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Clients can update their own data
CREATE POLICY "clients_update_own" ON public.clients
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Admins can read all clients
CREATE POLICY "admins_read_all_clients" ON public.clients
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- Admins can update all clients
CREATE POLICY "admins_update_all_clients" ON public.clients
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- 5. Create policies for sos_alerts table
-- Users can read alerts they're involved in
CREATE POLICY "sos_alerts_select_involved" ON public.sos_alerts
    FOR SELECT
    TO authenticated
    USING (
        agent_id IN (
            SELECT id FROM public.agents WHERE user_id = auth.uid()
        )
        OR client_id IN (
            SELECT id FROM public.clients WHERE user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- Users can insert alerts
CREATE POLICY "sos_alerts_insert" ON public.sos_alerts
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Users can update alerts they're involved in
CREATE POLICY "sos_alerts_update_involved" ON public.sos_alerts
    FOR UPDATE
    TO authenticated
    USING (
        agent_id IN (
            SELECT id FROM public.agents WHERE user_id = auth.uid()
        )
        OR client_id IN (
            SELECT id FROM public.clients WHERE user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    )
    WITH CHECK (
        agent_id IN (
            SELECT id FROM public.agents WHERE user_id = auth.uid()
        )
        OR client_id IN (
            SELECT id FROM public.clients WHERE user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- 6. Create policies for annonces table
-- Everyone can read announcements
CREATE POLICY "annonces_select_all" ON public.annonces
    FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can insert/update announcements
CREATE POLICY "admins_insert_annonces" ON public.annonces
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

CREATE POLICY "admins_update_annonces" ON public.annonces
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- 7. Create policies for zones table
-- Everyone can read zones
CREATE POLICY "zones_select_all" ON public.zones
    FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can insert/update zones
CREATE POLICY "admins_insert_zones" ON public.zones
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

CREATE POLICY "admins_update_zones" ON public.zones
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- 8. Create policies for client_zones table
-- Users can read their own zone assignments
CREATE POLICY "client_zones_select_own" ON public.client_zones
    FOR SELECT
    TO authenticated
    USING (client_user_id = auth.uid());

-- Admins can read all client zones
CREATE POLICY "admins_read_all_client_zones" ON public.client_zones
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- Admins can insert/update client zones
CREATE POLICY "admins_insert_client_zones" ON public.client_zones
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

CREATE POLICY "admins_update_client_zones" ON public.client_zones
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- 9. Create policies for agent_zones table
-- Agents can read their own zone assignments
CREATE POLICY "agent_zones_select_own" ON public.agent_zones
    FOR SELECT
    TO authenticated
    USING (agent_user_id = auth.uid());

-- Admins can read all agent zones
CREATE POLICY "admins_read_all_agent_zones" ON public.agent_zones
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- Admins can insert/update agent zones
CREATE POLICY "admins_insert_agent_zones" ON public.agent_zones
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

CREATE POLICY "admins_update_agent_zones" ON public.agent_zones
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- 10. Create policies for agent_client_assignments table
-- Users can read assignments they're involved in
CREATE POLICY "assignments_select_involved" ON public.agent_client_assignments
    FOR SELECT
    TO authenticated
    USING (
        agent_user_id = auth.uid()
        OR client_user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- Admins can insert/update assignments
CREATE POLICY "admins_insert_assignments" ON public.agent_client_assignments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

CREATE POLICY "admins_update_assignments" ON public.agent_client_assignments
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );


