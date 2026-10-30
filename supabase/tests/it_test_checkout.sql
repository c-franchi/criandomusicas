-- Self-checking rollback test for the IT sandbox checkout; see docs/it-test-checkout.md. Expected: raises ROLLBACK_RESULT with no FAIL entries.
do $$
declare adm uuid; other_order uuid; o uuid; r jsonb; c1 uuid; res text; log text := ''; pc_before text; pc_after text;
 sess text; ev int := 0;
begin
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 select md5(string_agg(id||price_cents||coalesce(price_promo_cents,0)||coalesce(stripe_price_id,''),',' order by id)) into pc_before from public.pricing_config;
 select user_id into adm from public.user_roles where role='admin' limit 1;
 select id into other_order from public.orders where user_id<>adm limit 1;
 begin perform public.it_test_begin_checkout(other_order, adm); log:=log||'FAIL other;'; exception when others then log:=log||'other_owner:'||sqlerrm||';'; end;
 insert into public.orders(user_id,status,payment_status,amount,plan_id) values(adm,'AWAITING_PAYMENT','PENDING',1990,'single') returning id into o;
 -- wrong amount, wrong currency, livemode, unpaid, wrong price, expiry, then a valid paid event + redelivery
 r := public.it_test_begin_checkout(o, adm); c1 := (r->>'id')::uuid; perform public.it_test_attach_session(c1, adm, 'cs_test_a', now()+interval '30 min');
 log:=log||'wrong_amount:'||public.it_test_apply_event('evt_a','checkout.session.completed','cs_test_a',c1,'paid',1990,'eur',false,array['price_1UW1KyBI0iXvcrrHj1uN8OyX'])||';';
 r := public.it_test_begin_checkout(o, adm); c1 := (r->>'id')::uuid; perform public.it_test_attach_session(c1, adm, 'cs_test_b', now()+interval '30 min');
 log:=log||'expired:'||public.it_test_apply_event('evt_b','checkout.session.expired','cs_test_b',c1,'unpaid',999,'eur',false,array['price_1UW1KyBI0iXvcrrHj1uN8OyX'])||';';
 r := public.it_test_begin_checkout(o, adm); c1 := (r->>'id')::uuid; perform public.it_test_attach_session(c1, adm, 'cs_test_c', now()+interval '30 min');
 log:=log||'unpaid:'||public.it_test_apply_event('evt_c','checkout.session.completed','cs_test_c',c1,'unpaid',999,'eur',false,array['price_1UW1KyBI0iXvcrrHj1uN8OyX'])||';';
 log:=log||'paid:'||public.it_test_apply_event('evt_d','checkout.session.async_payment_succeeded','cs_test_c',c1,'paid',999,'eur',false,array['price_1UW1KyBI0iXvcrrHj1uN8OyX'])||';';
 log:=log||'redelivery:'||public.it_test_apply_event('evt_d','checkout.session.async_payment_succeeded','cs_test_c',c1,'paid',999,'eur',false,array['price_1UW1KyBI0iXvcrrHj1uN8OyX'])||';';
 select payment_status::text||'/'||coalesce(sandbox_market,'-')||'/'||amount into res from public.orders where id=o; log:=log||'order:'||res||';';
 select md5(string_agg(id||price_cents||coalesce(price_promo_cents,0)||coalesce(stripe_price_id,''),',' order by id)) into pc_after from public.pricing_config;
 log:=log||'br_prices_unchanged:'||(pc_before=pc_after)||';';
 raise exception 'ROLLBACK_RESULT %', log;
end $$;
