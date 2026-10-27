-- Physical cards are opt-in. Preserve historical gifts and any paid fulfillment.
update public.gift_operations set physical_enabled=false where id=true;

create or replace function gift_private.require_physical_gifts_enabled()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.product='physical' and not coalesce((select physical_enabled from public.gift_operations where id=true),false) then
  if tg_op='INSERT' then raise exception 'gift_physical_disabled'; end if;
  if new.product is distinct from old.product or
     (old.status in ('DRAFT','APPROVED_TEST') and new.status is distinct from old.status and new.status<>'CANCELLED') then
   raise exception 'gift_physical_disabled';
  end if;
 end if;
 return new;
end $$;
revoke all on function gift_private.require_physical_gifts_enabled() from public,anon,authenticated;
create or replace trigger musical_gifts_physical_enabled
before insert or update of product,status on public.musical_gifts
for each row execute function gift_private.require_physical_gifts_enabled();
