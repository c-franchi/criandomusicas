-- Global presentation setting. Public reads contain no personal data.
-- Only existing admin roles may edit it; no client inserts/deletes are granted.
create table if not exists public.site_maintenance (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  title text not null default 'Estamos preparando novas emoções.' check (length(btrim(title)) between 1 and 120),
  message text not null default 'A Criando Músicas está em manutenção para receber novidades. Em breve estaremos de volta para transformar sentimentos em presentes que podem ser ouvidos.' check (length(btrim(message)) between 1 and 1200),
  updated_at timestamptz not null default now()
);
alter table public.site_maintenance enable row level security;
revoke all on public.site_maintenance from public, anon, authenticated;
grant select on public.site_maintenance to anon, authenticated;
grant update (enabled, title, message) on public.site_maintenance to authenticated;
grant all on public.site_maintenance to service_role;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='site_maintenance' and policyname='Public maintenance display') then
    create policy "Public maintenance display" on public.site_maintenance for select to anon, authenticated using (id = true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='site_maintenance' and policyname='Admins manage maintenance') then
    create policy "Admins manage maintenance" on public.site_maintenance for update to authenticated
      using (public.has_role((select auth.uid()), 'admin'::public.app_role))
      with check (id = true and public.has_role((select auth.uid()), 'admin'::public.app_role));
  end if;
end;
$$;

create or replace trigger site_maintenance_updated_at before update on public.site_maintenance
  for each row execute function public.update_updated_at_column();

-- Requested initial activation. Reapplying never overrides later admin choices.
insert into public.site_maintenance (id, enabled) values (true, true) on conflict (id) do nothing;
