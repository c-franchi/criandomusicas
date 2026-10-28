import Stripe from "https://esm.sh/stripe@18.5.0";
// Only a verified, owned order may reach this helper. Expire an unpaid old session
// before allowing its amount to change; never discard a completed payment.
export async function closeGiftCheckout(client: any, gift: {stripe_session_id: string|null; checkout_lease: string|null}, orderId: string, ownerId: string, reconcileLegacy = false) {
 const key=Deno.env.get('STRIPE_SECRET_KEY');
 if(!gift.stripe_session_id){
  // Older deployed checkout code did not persist its session ID. Reconcile those
  // live sessions before changing an existing order, while allowing PIX-only setups.
  if(!reconcileLegacy || gift.checkout_lease || !key) return;
  const legacyStripe=new Stripe(key,{apiVersion:'2025-08-27.basil'});
  for await (const session of legacyStripe.checkout.sessions.list({limit:100,created:{gte:Math.floor(Date.now()/1000)-48*3600}})){
   if(session.metadata?.order_id!==orderId || session.metadata?.user_id!==ownerId)continue;
   if(session.payment_status==='paid' || session.status==='complete')throw Error('O pagamento já foi concluído. Atualize a página para confirmar o pedido.');
   if(session.status==='open')await legacyStripe.checkout.sessions.expire(session.id);
  }
  return;
 }
 const stripe=new Stripe(key||'',{apiVersion:'2025-08-27.basil'});
 const session=await stripe.checkout.sessions.retrieve(gift.stripe_session_id);
 if(session.metadata?.order_id!==orderId || session.metadata?.user_id!==ownerId) throw Error('gift_order_mismatch');
 if(session.payment_status==='paid' || session.status==='complete') throw Error('O pagamento já foi concluído. Atualize a página para confirmar o pedido.');
 if(session.status==='open') await stripe.checkout.sessions.expire(session.id);
 const {error}=await client.rpc('gift_checkout_action',{p_order_id:orderId,p_owner:ownerId,p_action:'release',p_lease:gift.checkout_lease,p_session:session.id});
 if(error) throw error;
}
