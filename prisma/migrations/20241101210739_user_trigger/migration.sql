-- FUNCTION TO HANDLE NEW USER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Insert into settings first to satisfy the foreign key constraint
    INSERT INTO public.settings (id)
    VALUES (
        NEW.id
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

    -- Insert into chats first to satisfy the foreign key constraint
    INSERT INTO public.chats (id, user_id, created, modified)
    VALUES (
        gen_random_uuid(),
        NEW.id,
        NOW(),
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- FUNCTION TO UPDATE USER PROFILE AND SETTINGS
CREATE OR REPLACE FUNCTION public.handle_update_user() 
RETURNS trigger AS $$
BEGIN
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

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_update_user();