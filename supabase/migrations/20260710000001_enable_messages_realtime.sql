-- Enable Realtime broadcasts for Mate Room messages.
-- Supabase may already have the table in the publication; ignore duplicate_object.
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;