-- Consolidated Migration: Complete App Setup
-- This migration consolidates all necessary database setup in one file

-- 1. Add phone_number field to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS phone_number text;

-- 2. Update the statut check constraint to include 'en_attente'
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_statut_check;

ALTER TABLE public.users
ADD CONSTRAINT users_statut_check
CHECK (statut IN ('actif', 'inactif', 'en_attente'));

-- 3. Update the default statut to 'en_attente' for new users
ALTER TABLE public.users
ALTER COLUMN statut SET DEFAULT 'en_attente';

-- 4. Create user profile creation function
CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_user_id uuid,
  p_user_email text,
  p_user_nom text,
  p_user_phone text,
  p_user_role text
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  -- Insert user profile (with conflict handling)
  INSERT INTO public.users (id, email, nom, phone_number, role, statut, created_at, updated_at)
  VALUES (p_user_id, p_user_email, p_user_nom, p_user_phone, p_user_role, 'en_attente', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nom = EXCLUDED.nom,
    phone_number = EXCLUDED.phone_number,
    role = EXCLUDED.role,
    updated_at = NOW();

  -- Create role-specific record
  IF p_user_role = 'agent' THEN
    INSERT INTO public.agents (user_id, disponibilite, qr_code, created_at, updated_at)
    VALUES (p_user_id, 'disponible', 'agent_' || p_user_id || '_' || EXTRACT(EPOCH FROM NOW())::bigint, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    INSERT INTO public.clients (user_id, historique_scans, created_at, updated_at)
    VALUES (p_user_id, '[]'::jsonb, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Return success
  result := jsonb_build_object('success', true, 'user_id', p_user_id);
  RETURN result;

EXCEPTION WHEN OTHERS THEN
  -- Return error
  result := jsonb_build_object('success', false, 'error', SQLERRM);
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_user_profile TO anon, authenticated;

-- 5. Create function to get users by role (for admin access)
CREATE OR REPLACE FUNCTION public.get_users_by_role(user_role text)
RETURNS TABLE (
  id uuid,
  nom text,
  email text,
  role text,
  statut text,
  phone_number text,
  created_at timestamptz
) AS $$
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Return users with specified role
  RETURN QUERY
  SELECT 
    u.id,
    u.nom,
    u.email,
    u.role,
    u.statut,
    u.phone_number,
    u.created_at
  FROM public.users u
  WHERE u.role = user_role
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_users_by_role TO authenticated;

-- 6. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Ensure the auth schema is accessible
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT SELECT ON auth.users TO anon, authenticated;
