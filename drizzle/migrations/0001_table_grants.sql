grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on
  public.team_invites, public.customers, public.properties, public.leads, public.jobs, public.quotes,
  public.invoices, public.activities, public.tasks, public.commissions, public.blocked_slots, public.settings
  to authenticated;
grant select on public.team_members to authenticated;
grant select, insert on public.site_events to authenticated;
grant insert on public.site_events to anon;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant usage on sequence public.site_events_id_seq to anon;