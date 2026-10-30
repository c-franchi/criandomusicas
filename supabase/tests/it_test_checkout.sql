begin;
do $$
declare adm uuid; oid uuid; gid uuid; c uuid; result text; row public.it_test_checkouts; copy_order public.orders; copy_gift public.musical_gifts;
begin
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 select user_id into adm from public.user_roles where role='admin' limit 1;
 assert adm is not null,'admin fixture missing';
 -- Ordinary song: the Stripe sandbox purchase must not pay its real template.
 insert into public.orders(user_id,status,payment_status,amount,plan_id,story,song_title) values(adm,'AWAITING_PAYMENT','PENDING',1990,'single','Uma história que deve permanecer completa','Original brasileiro') returning id into oid;
 c:=(public.it_test_begin_checkout(oid,adm)->>'id')::uuid;
 assert (select payment_status='PENDING' from public.orders where id=oid),'begin altered original';
 perform public.it_test_attach_session(c,adm,'cs_test_isolation_full',now()+interval '30 min');
 result:=public.it_test_apply_event('evt_isolation_unpaid','checkout.session.completed','cs_test_isolation_full',c,'unpaid',999,'eur',false,array['price_1UW1KyBI0iXvcrrHj1uN8OyX']);
 assert result='not_paid','unpaid accepted';
 assert (select fulfillment_order_id is null from public.it_test_checkouts where id=c),'unpaid copy created';
 result:=public.it_test_apply_event('evt_isolation_paid','checkout.session.async_payment_succeeded','cs_test_isolation_full',c,'paid',999,'eur',false,array['price_1UW1KyBI0iXvcrrHj1uN8OyX']);
 assert result='paid','valid payment not applied';
 select * into row from public.it_test_checkouts where id=c;
 select * into copy_order from public.orders where id=row.fulfillment_order_id;
 assert copy_order.id<>oid and copy_order.is_preview and copy_order.sandbox_market='IT_TEST','copy isolation missing';
 assert copy_order.amount=999 and copy_order.currency='EUR' and copy_order.payment_status='PAID','copy quote incorrect';
 assert copy_order.story='Uma história que deve permanecer completa','story was lost';
 assert (select payment_status='PENDING' and amount=1990 and currency='BRL' and sandbox_market is null from public.orders where id=oid),'real order changed';
 result:=public.it_test_apply_event('evt_isolation_paid','checkout.session.async_payment_succeeded','cs_test_isolation_full',c,'paid',999,'eur',false,array['price_1UW1KyBI0iXvcrrHj1uN8OyX']);
 assert result='duplicate','duplicate not detected';
 begin update public.orders set sandbox_market=null where id=copy_order.id; raise exception 'sandbox marker cleared'; exception when others then assert sqlerrm='it_test_order_immutable'; end;
 -- Missing attachment must retry, not permanently consume the webhook event.
 insert into public.orders(user_id,status,payment_status,amount,plan_id) values(adm,'AWAITING_PAYMENT','PENDING',1990,'single') returning id into oid;
 c:=(public.it_test_begin_checkout(oid,adm)->>'id')::uuid;
 begin
  perform public.it_test_apply_event('evt_attach_race','checkout.session.completed','cs_test_attach_race',c,'paid',999,'eur',false,array['price_1UW1KyBI0iXvcrrHj1uN8OyX']);
  raise exception 'event consumed before attach';
 exception when others then assert sqlerrm='it_test_session_not_attached'; end;
 assert not exists(select 1 from public.it_test_webhook_events where event_id='evt_attach_race'),'event persisted before attach';
 perform public.it_test_attach_session(c,adm,'cs_test_attach_race',now()+interval '30 min');
 result:=public.it_test_apply_event('evt_attach_race','checkout.session.completed','cs_test_attach_race',c,'paid',999,'eur',false,array['price_1UW1KyBI0iXvcrrHj1uN8OyX']);
 assert result='paid','event retry failed';
 -- Wrong currency cannot create a paid copy.
 insert into public.orders(user_id,status,payment_status,amount,plan_id) values(adm,'AWAITING_PAYMENT','PENDING',1990,'single') returning id into oid;
 c:=(public.it_test_begin_checkout(oid,adm)->>'id')::uuid;
 perform public.it_test_attach_session(c,adm,'cs_test_wrong_currency',now()+interval '30 min');
 result:=public.it_test_apply_event('evt_wrong_currency','checkout.session.completed','cs_test_wrong_currency',c,'paid',999,'brl',false,array['price_1UW1KyBI0iXvcrrHj1uN8OyX']);
 assert result='mismatch','wrong currency accepted';
 assert (select fulfillment_order_id is null and status='failed' from public.it_test_checkouts where id=c),'wrong currency fulfilled';
 begin perform public.it_test_begin_checkout(oid,'00000000-0000-4000-8000-000000000001');raise exception 'non-admin accepted';exception when others then assert sqlerrm='it_test_forbidden';end;
 -- Short card: exact story, sender/photo and test marker survive into a new gift.
 insert into public.orders(user_id,status,payment_status,amount,plan_id,story) values(adm,'AWAITING_PAYMENT','PENDING',990,'gift_short_15','História curta preservada') returning id into oid;
 insert into public.musical_gifts(owner_id,product,music_source,recipient_name,sender_name,dedication,has_card,duration_seconds,status,plan_id,amount_cents,production_order_id,checkout_order_id,photo_data,details)
 values(adm,'short','new','Pessoa teste','Remetente','Dedicatória intacta',true,15,'AWAITING_PAYMENT','gift_short_15',990,oid,oid,'data:image/png;base64,YQ==','{"story":"História curta preservada","style":"pop"}') returning id into gid;
 c:=(public.it_test_begin_checkout(oid,adm)->>'id')::uuid;
 assert (select amount_cents=499 and jsonb_array_length(items)=2 from public.it_test_checkouts where id=c),'short card double priced';
 assert (select checkout_lease is null from public.musical_gifts where id=gid),'real gift was locked';
 perform public.it_test_attach_session(c,adm,'cs_test_isolation_gift',now()+interval '30 min');
 result:=public.it_test_apply_event('evt_isolation_gift','checkout.session.completed','cs_test_isolation_gift',c,'paid',499,'eur',false,array['price_1UW1IzBI0iXvcrrHjJUx7MD3','price_1UW1L3BI0iXvcrrHW0dQLM69']);
 assert result='paid','card payment failed';
 select * into row from public.it_test_checkouts where id=c;
 select * into copy_order from public.orders where id=row.fulfillment_order_id;
 select * into copy_gift from public.musical_gifts where id=row.fulfillment_gift_id;
 assert copy_gift.id<>gid and copy_gift.is_test and copy_gift.status='PRODUCTION','gift copy invalid';
 assert copy_gift.photo_data='data:image/png;base64,YQ==' and copy_order.cover_url=copy_gift.photo_data,'photo not preserved';
 assert copy_gift.dedication='Dedicatória intacta' and copy_gift.details->>'story'='História curta preservada','gift context lost';
 assert copy_gift.amount_cents=499 and copy_order.amount=499 and copy_order.currency='EUR','gift quote mismatch';
 assert copy_gift.public_token<>(select public_token from public.musical_gifts where id=gid),'private link reused';
 assert (select payment_confirmed_at is null and not is_test and status='AWAITING_PAYMENT' from public.musical_gifts where id=gid),'real gift released';
 assert (select payment_status='PENDING' from public.orders where id=oid),'real card order paid';
 begin update public.musical_gifts set is_test=false where id=copy_gift.id; raise exception 'test gift marker cleared'; exception when others then assert sqlerrm='it_test_gift_immutable'; end;
end $$;
rollback;
