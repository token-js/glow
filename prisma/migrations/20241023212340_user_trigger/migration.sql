-- This trigger automatically creates a profile entry when a new user signs up via Supabase Auth.
-- See https://supabase.com/docs/guides/auth/managing-user-data#using-triggers for more details.

-- Create the 'auth' schema if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        CREATE SCHEMA auth;
    END IF;
END;
$$;

-- Create the 'auth.users' table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        CREATE TABLE auth.users (
            id UUID PRIMARY KEY,
            email TEXT,
            phone TEXT,
            raw_user_meta_data JSONB
        );
    END IF;
END;
$$;

-- FUNCTION TO HANDLE NEW USER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Insert into settings first to satisfy the foreign key constraint
    INSERT INTO public.settings (id, user_id, name, gender, voice)
    VALUES (
        NEW.id,
        NEW.id,
        'Default Name',     -- Modify as needed
        'nonbinary',        -- Modify as needed
        'temporary'
    );

    -- Insert into user_profiles
    INSERT INTO public.user_profiles (
        id, 
        full_name, 
        avatar_url, 
        email, 
        phone, 
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.email,
        NEW.phone,
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- FUNCTION TO UPDATE USER PROFILE AND SETTINGS
CREATE OR REPLACE FUNCTION public.handle_update_user() 
RETURNS trigger AS $$
BEGIN
    -- Update settings table
    UPDATE public.settings
    SET
        name = NEW.raw_user_meta_data->>'full_name', -- Example update
        gender = 'nonbinary',                        -- Modify as needed
        voice = 'temporary'                           -- Modify as needed
    WHERE user_id = NEW.id;

    -- Update user_profiles table
    UPDATE public.user_profiles
    SET
        email = NEW.email,
        phone = NEW.phone,
        updated_at = NOW()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_update_user();
