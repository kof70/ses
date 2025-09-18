-- Fix user profile creation and RLS policies
-- This migration fixes the issue where users can't access their profiles

-- 1. Allow users to insert their own profile if it doesn't exist
CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- 2. Allow users to read their own profile even if it doesn't exist yet
-- This prevents the "profile not found" error from triggering offline mode
CREATE POLICY "users_select_own_or_none" ON public.users
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = id
        OR NOT EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
        )
    );

-- 3. Create a function to safely get or create user profile
CREATE OR REPLACE FUNCTION public.get_or_create_user_profile()
RETURNS jsonb AS $$
DECLARE
  user_profile jsonb;
  user_id uuid;
  user_email text;
BEGIN
  -- Get current user info
  user_id := auth.uid();
  user_email := auth.jwt() ->> 'email';
  
  IF user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;
  
  -- Try to get existing profile
  SELECT to_jsonb(u.*) INTO user_profile
  FROM public.users u
  WHERE u.id = user_id;
  
  -- If profile exists, return it
  IF user_profile IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'profile', user_profile);
  END IF;
  
  -- If no profile exists, create a basic one
  INSERT INTO public.users (id, email, nom, role, statut, created_at, updated_at)
  VALUES (
    user_id,
    user_email,
    COALESCE(user_email, 'User'),
    'client', -- Default role
    'en_attente', -- Default status
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Return the created profile
  SELECT to_jsonb(u.*) INTO user_profile
  FROM public.users u
  WHERE u.id = user_id;
  
  RETURN jsonb_build_object('success', true, 'profile', user_profile);
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_or_create_user_profile TO authenticated;

-- 4. Update the existing select policy to be more permissive
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);



