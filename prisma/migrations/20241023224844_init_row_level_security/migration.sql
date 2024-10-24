alter table "_prisma_migrations" enable row level security;
alter table "user_profiles" enable row level security;
alter table "settings" enable row level security;

-- Create policy for reading their profile
create policy "Enable users to view their own data only"
on "public"."user_profiles"
as PERMISSIVE
for SELECT
to authenticated
using (
  (select auth.uid()) = id
);