grant usage on schema "public" to anon;
grant usage on schema "public" to authenticated;
GRANT ALL ON settings TO authenticated;

alter table "_prisma_migrations" enable row level security;
alter table "user_profiles" enable row level security;
alter table "settings" enable row level security;

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
TO public
USING (
  (SELECT auth.uid()) = id
)
WITH CHECK (
  (SELECT auth.uid()) = id
);