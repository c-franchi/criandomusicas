-- Run in BEGIN/ROLLBACK. Synthetic orders and vouchers only; no external services.
do $$
declare uid uuid; adm uuid; source_id uuid; gid uuid; oid uuid; vid uuid; invalid_vid uuid; code text; bad_code text; data jsonb; result jsonb; plan text; price integer; applied integer; g public.musical_gifts; lease uuid; n integer; user_code text; expected text;
begin
 select id into uid from auth.users where not public.has_role(id,'admin') limit 1;
 select user_id into adm from public.user_roles where role='admin' limit 1;
 if uid is null or adm is null then raise exception 'Missing fixtures';end if;
 update public.pricing_config set is_active=true,price_cents=1000,price_promo_cents=null where id like 'gift_%';
 update public.gift_operations set physical_enabled=true,shipping_enabled=true,shipping_fee_cents=100,print_format='A5 fixture' where id=true;
 insert into public.orders(user_id,status,payment_status,is_preview) values(uid,'COMPLETED','PAID',false) returning id into source_id;
 insert into public.tracks(order_id,status,version,audio_url) values(source_id,'READY',1,'https://example.com/voucher-fixture.mp3');
 for n in 1..12 loop
  gid:=gen_random_uuid();
  data:=jsonb_build_object('product',case when n<=4 then 'digital' when n<=8 then 'physical' else 'short' end,'music_source',case when n in(1,5) then 'existing' else 'new' end,'source_order_id',case when n in(1,5) then source_id else null end,
   'duration_seconds',case when n in(2,6,9,11) then 15 when n in(3,7,10,12) then 30 else null end,'has_card',n not in(9,10),'recipient_name','Voucher fixture','sender_name','Fixture','dedication','A fixture dedication',
   'details',jsonb_build_object('music_type','homenagem','style','pop','language','Português','story','A sufficiently long fictional story for regression testing.','fulfillment',case when n=8 then 'shipping' else 'self_print' end,'address','Fixture street, city, state, 00000-000'));
  perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true);execute 'set local role authenticated';
  perform public.save_musical_gift(gid,data,0);
  result:=public.musical_gift_action(gid,'submit');oid:=(result->>'checkout_order_id')::uuid;
  select * into g from public.musical_gifts where id=gid;plan:=g.plan_id;price:=g.amount_cents;
  execute 'reset role';
  code:='GIFT-FIXTURE-'||replace(gen_random_uuid()::text,'-','');code:=upper(code);
  insert into public.vouchers(code,discount_type,discount_value,max_uses,max_uses_per_user,plan_ids) values(code,'percent',case when n%2=0 then 100 else 10 end,3,1,array[plan]) returning id into vid;
  if n=12 then user_code:=code;end if;
  bad_code:=upper('BAD-'||gen_random_uuid()::text);
  insert into public.vouchers(code,discount_type,discount_value,plan_ids) values(bad_code,'percent',50,array['single']) returning id into invalid_vid;
  perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true);execute 'set local role authenticated';
  begin perform public.apply_gift_voucher(oid,bad_code);raise exception 'Normal-only voucher accepted on gift';exception when others then if sqlerrm<>'gift_voucher_product' then raise;end if;end;
  result:=public.quote_gift_voucher(oid,code);
  if result->>'original_price'<>price::text then raise exception 'Quote did not include addon/shipping';end if;
  if (select count(*) from public.voucher_redemptions where order_id=oid)<>0 then raise exception 'Validation consumed a use';end if;
  if (select amount_cents from public.musical_gifts where id=gid)<>price then raise exception 'Validation mutated price';end if;
  result:=public.apply_gift_voucher(oid,code);applied:=(result->>'discount_amount')::integer;
  if applied<>round((price-g.shipping_cents)::numeric*(case when n%2=0 then 100 else 10 end)/100)::integer then raise exception 'Wrong discount';end if;
  if (select amount from public.orders where id=oid)<>price-applied then raise exception 'Order did not synchronize net quote';end if;
  if (select amount_cents from public.musical_gifts where id=gid)<>price-applied then raise exception 'Gift did not synchronize net quote';end if;
  perform public.apply_gift_voucher(oid,code);
  if (select count(*) from public.voucher_redemptions where order_id=oid)<>1 then raise exception 'Replay consumed another use';end if;
  if n%2=0 and n<>8 then
   if (select payment_status from public.orders where id=oid)<>'PAID' then raise exception 'Free voucher not paid';end if;
   if (select payment_confirmed_at from public.musical_gifts where id=gid) is null then raise exception 'Free gift not authorized for lyrics';end if;
   if (select status from public.orders where id=oid)<>'LYRICS_PENDING' then raise exception 'Free new music bypassed lyric approval';end if;
  else
   if (select payment_confirmed_at from public.musical_gifts where id=gid) is not null then raise exception 'Partial voucher activated unpaid gift';end if;
   begin update public.orders set payment_status='PAID' where id=oid;raise exception 'Owner can mark partial gift paid';exception when others then if sqlerrm<>'gift_payment_forbidden' then raise;end if;end;
  end if;
  begin update public.orders set amount=price+1 where id=oid;raise exception 'Owner changed the quote';exception when others then if sqlerrm<>'gift_order_mismatch' then raise;end if;end;
  begin update public.orders set voucher_code='FORGED' where id=oid;raise exception 'Owner changed voucher metadata';exception when others then if sqlerrm<>'gift_order_mismatch' then raise;end if;end;
  begin perform public.apply_gift_voucher(oid,bad_code);raise exception 'Second voucher stacked';exception when others then if sqlerrm<>'gift_voucher_already_applied' then raise;end if;end;
  execute 'reset role';
  if (select current_uses from public.vouchers where id=vid)<>1 then raise exception 'Wrong counter after replay';end if;
 end loop;
 -- A separate existing-song card exercises full fixed discount and checkout locking.
 gid:=gen_random_uuid();data:=data||jsonb_build_object('product','digital','music_source','existing','source_order_id',source_id,'duration_seconds',null,'has_card',true);
 perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true);execute 'set local role authenticated';
 perform public.save_musical_gift(gid,data,0);result:=public.musical_gift_action(gid,'submit');oid:=(result->>'checkout_order_id')::uuid;
 execute 'reset role';
 code:=upper('FIXED-'||gen_random_uuid()::text);insert into public.vouchers(code,discount_type,discount_value,max_uses) values(code,'fixed',999999,1) returning id into vid;
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);execute 'set local role service_role';
 result:=public.gift_checkout_action(oid,uid,'claim');lease:=(result->>'lease')::uuid;
 execute 'reset role';perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true);execute 'set local role authenticated';
 begin perform public.apply_gift_voucher(oid,code);raise exception 'Voucher raced checkout creation';exception when others then if sqlerrm<>'gift_checkout_busy' then raise;end if;end;
 begin perform public.gift_checkout_action(oid,uid,'release',lease);raise exception 'Customer cleared checkout lock';exception when insufficient_privilege then null;end;
 execute 'reset role';
 if (select current_uses from public.vouchers where id=vid)<>0 then raise exception 'Failed apply consumed global use';end if;
 if exists(select 1 from public.voucher_redemptions where order_id=oid) then raise exception 'Failed apply left redemption';end if;
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);execute 'set local role service_role';
 perform public.gift_checkout_action(oid,uid,'attach',lease,'cs_fixture_pending_voucher',now()+interval '30 minutes');
 perform public.gift_checkout_action(oid,uid,'release',lease,'cs_fixture_pending_voucher');
 execute 'reset role';perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true);execute 'set local role authenticated';
 result:=public.apply_gift_voucher(oid,code);
 if (result->>'final_price')::integer<>0 then raise exception 'Fixed discount was not capped';end if;
 if (select status from public.orders where id=oid)<>'COMPLETED' or (select status from public.musical_gifts where id=gid)<>'PAID' then raise exception 'Existing music incorrectly entered new production or auto-published';end if;
 execute 'reset role';
 for n in 0..6 loop
  gid:=gen_random_uuid();
  data:=data||jsonb_build_object('product',case when n=6 then 'short' else 'digital' end,'music_source',case when n=6 then 'new' else 'existing' end,'source_order_id',case when n=6 then null else source_id end,'duration_seconds',case when n=6 then 30 else null end);
  perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true);execute 'set local role authenticated';
  perform public.save_musical_gift(gid,data,0);result:=public.musical_gift_action(gid,'submit');oid:=(result->>'checkout_order_id')::uuid;
  execute 'reset role';
  bad_code:=case when n=0 then code when n=6 then user_code else upper('LIMIT-'||gen_random_uuid()::text) end;
  if n between 1 and 5 then
   insert into public.vouchers(code,discount_type,discount_value,valid_from,valid_until,is_active,max_uses,max_uses_per_user)
   values(bad_code,'percent',25,case when n=2 then now()+interval '1 day' else now()-interval '2 days' end,case when n=1 then now()-interval '1 day' else null end,n<>5,case when n=3 then 0 else null end,case when n=4 then 0 else null end);
  end if;
  expected:=case n when 0 then 'gift_voucher_limit' when 1 then 'gift_voucher_expired' when 2 then 'gift_voucher_not_started' when 3 then 'gift_voucher_limit' when 4 then 'gift_voucher_user_limit' when 5 then 'gift_voucher_invalid' when 6 then 'gift_voucher_user_limit' end;
  perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true);execute 'set local role authenticated';
  begin perform public.apply_gift_voucher(oid,bad_code);raise exception 'Expected voucher validity/usage failure';exception when others then if sqlerrm<>expected then raise;end if;end;
  if exists(select 1 from public.voucher_redemptions where order_id=oid) then raise exception 'Rejected voucher left a redemption';end if;
  execute 'reset role';
 end loop;
 perform set_config('request.jwt.claims',json_build_object('sub',adm,'role','authenticated')::text,true);execute 'set local role authenticated';
 begin perform public.quote_gift_voucher(oid,code);raise exception 'Other customer accessed voucher/order';exception when others then if sqlerrm<>'gift_forbidden' then raise;end if;end;
 execute 'reset role';execute 'set local role anon';
 begin perform public.apply_gift_voucher(oid,code);raise exception 'Anonymous voucher apply permitted';exception when insufficient_privilege then null;end;
 execute 'reset role';
end $$;
