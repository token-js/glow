grant usage on schema public to postgres, anon, authenticated, service_role;

grant all privileges on all tables in schema public to postgres, anon, authenticated, service_role;
grant all privileges on all functions in schema public to postgres, anon, authenticated, service_role;
grant all privileges on all sequences in schema public to postgres, anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;


-- Create the 'public._prisma_migrations' table if it doesn't exist (which may be true in the shadow DB)
-- This covers this migration as well as all future ones.
CREATE TABLE IF NOT EXISTS _prisma_migrations (_ INT);
alter table "_prisma_migrations" enable row level security;
alter table "user_profiles" enable row level security;
alter table "settings" enable row level security;

-- The auth.uid() function doesn't exist in the shadow DB, so we have to create it.
-- This covers this migration as well as all future ones that may rely on the auth.uid() function.
DO $do$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_namespace n
        JOIN pg_catalog.pg_proc p ON p.pronamespace = n.oid
        WHERE n.nspname = 'auth' AND p.proname = 'uid'
    ) THEN
        CREATE FUNCTION auth.uid() RETURNS uuid AS $func$
            SELECT '00000000-0000-0000-0000-000000000000'::uuid;
        $func$ LANGUAGE sql STABLE;
    END IF;
END;
$do$;

create policy "Enable users to view their own profile only"
on "public"."user_profiles"
as PERMISSIVE
for SELECT
to authenticated
using (
  (select auth.uid()) = id
);

create policy "Enable users to view their own settings only"
on "public"."settings"
as PERMISSIVE
for SELECT
to authenticated
using (
  (select auth.uid()) = id
);

CREATE POLICY "Enable user to update their own settings"
ON "public"."settings"
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.uid()) = id
)
WITH CHECK (
  (SELECT auth.uid()) = id
);