-- Enable Row Level Security
alter table "chat_messages" enable row level security;
alter table "chats" enable row level security;

GRANT ALL ON chats TO authenticated;
GRANT ALL ON chat_messages TO authenticated;

create policy "Enable users to view their own chats only"
on "public"."chats"
as PERMISSIVE
for SELECT
to authenticated
using (
  (select auth.uid()) = user_id
);

CREATE POLICY "Allow user to read messages of their own chats"
ON public.chat_messages
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chats
    WHERE chats.id = chat_id
      AND (select auth.uid()) = chats.user_id
  )
);