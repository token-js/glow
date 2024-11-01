-- -- Create the 'auth' schema if it doesn't exist
-- DO $$
-- BEGIN
--     IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
--         CREATE SCHEMA auth;
--     END IF;
-- END;
-- $$;

-- -- Create the 'auth.users' table if it doesn't exist
-- DO $$
-- BEGIN
--     IF NOT EXISTS (
--         SELECT 1 FROM information_schema.tables
--         WHERE table_schema = 'auth' AND table_name = 'users'
--     ) THEN
--         CREATE TABLE auth.users (
--             id UUID PRIMARY KEY,
--             email TEXT,
--             phone TEXT,
--             raw_user_meta_data JSONB
--         );
--     END IF;
-- END;
-- $$;

-- -- Create the 'public._prisma_migrations' table if it doesn't exist (which may be true in the shadow DB)
-- -- This covers this migration as well as all future ones.
-- CREATE TABLE IF NOT EXISTS _prisma_migrations (_ INT);
-- alter table "_prisma_migrations" enable row level security;

-- grant usage on schema "public" to anon;
-- grant usage on schema "public" to authenticated;
-- GRANT ALL ON settings TO authenticated;

-- alter table "user_profiles" enable row level security;
-- alter table "settings" enable row level security;
-- alter table "chats" enable row level security;
-- alter table "chat_messages" enable row level security;

-- -- FUNCTION TO HANDLE NEW USER
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS trigger AS $$
-- BEGIN
--     -- Insert into settings first to satisfy the foreign key constraint
--     INSERT INTO public.settings (id, user_id)
--     VALUES (
--         gen_random_uuid(),
--         NEW.id
--     );

--     -- Insert into user_profiles
--     INSERT INTO public.user_profiles (
--         id, 
--         full_name, 
--         avatar_url, 
--         email, 
--         phone, 
--         updated_at
--     )
--     VALUES (
--         NEW.id,
--         NEW.raw_user_meta_data->>'full_name',
--         NEW.raw_user_meta_data->>'avatar_url',
--         NEW.email,
--         NEW.phone,
--         NOW()
--     );

--     -- Insert into chats
--     INSERT INTO public.chats (id, user_id, created, modified)
--     VALUES (
--         gen_random_uuid(),
--         NEW.id,
--         NOW(),
--         NOW()
--     );

--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- -- FUNCTION TO UPDATE USER PROFILE AND SETTINGS
-- CREATE OR REPLACE FUNCTION public.handle_update_user() 
-- RETURNS trigger AS $$
-- BEGIN
--     -- Update user_profiles table
--     UPDATE public.user_profiles
--     SET
--         email = NEW.email,
--         phone = NEW.phone,
--         updated_at = NOW()
--     WHERE id = NEW.id;

--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- CREATE TRIGGER on_auth_user_updated
--     AFTER UPDATE ON auth.users
--     FOR EACH ROW EXECUTE PROCEDURE public.handle_update_user();

-- -- The auth.uid() function doesn't exist in the shadow DB, so we have to create it.
-- -- This covers this migration as well as all future ones that may rely on the auth.uid() function.
-- DO $do$
-- BEGIN
--     IF NOT EXISTS (
--         SELECT 1
--         FROM pg_catalog.pg_namespace n
--         JOIN pg_catalog.pg_proc p ON p.pronamespace = n.oid
--         WHERE n.nspname = 'auth' AND p.proname = 'uid'
--     ) THEN
--         CREATE FUNCTION auth.uid() RETURNS uuid AS $func$
--             SELECT '00000000-0000-0000-0000-000000000000'::uuid;
--         $func$ LANGUAGE sql STABLE;
--     END IF;
-- END;
-- $do$;

-- create policy "Enable users to view their own profile only"
-- on "public"."user_profiles"
-- as PERMISSIVE
-- for SELECT
-- to authenticated
-- using (
--   (select auth.uid()) = id
-- );

-- create policy "Enable users to view their own settings only"
-- on "public"."settings"
-- as PERMISSIVE
-- for SELECT
-- to authenticated
-- using (
--   (select auth.uid()) = user_id
-- );

-- CREATE POLICY "Enable user to update their own settings"
-- ON "public"."settings"
-- AS PERMISSIVE
-- FOR UPDATE
-- TO public
-- USING (
--   (SELECT auth.uid()) = user_id
-- )
-- WITH CHECK (
--   (SELECT auth.uid()) = user_id
-- );