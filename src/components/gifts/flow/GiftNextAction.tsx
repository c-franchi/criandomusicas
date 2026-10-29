import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { giftNextStep } from '@/lib/gift-next-step';
import type { MusicalGift } from '@/lib/gifts';
export default function GiftNextAction({gift:g,audio,loading,error,onRetry}:{gift:MusicalGift;audio?:{approved_lyric_id:string|null;audio_url?:string|null};loading:boolean;error:boolean;onRetry:()=>void}) {
 const {t}=useTranslation('home');
 const needsAudio=!['DRAFT','CANCELLED','AWAITING_PAYMENT','RECEIPT_SENT','ACTIVE'].includes(g.status);
 const step=needsAudio&&(loading||error)?'load':giftNextStep(g.status,g.music_source==='existing',!!audio?.approved_lyric_id,!!audio?.audio_url);
 const target=step==='draft'?`/presentes/${g.id}/editar`:step==='pay'?(g.checkout_order_id?`/checkout/${g.checkout_order_id}`:'#pagamento-presente'):step==='lyrics'&&g.production_order_id?`/criar-musica?orderId=${g.production_order_id}`:step==='share'?'#compartilhar-presente':null;
 return <section className="mb-6 rounded-2xl border border-primary/40 bg-primary/5 p-5" aria-labelledby="gift-next-action">
  <p className="text-sm font-medium text-muted-foreground">{t('giftFlow.nextAction.title')}</p>
  <h2 id="gift-next-action" className="mt-2 text-xl font-semibold" role="status">{t('giftFlow.nextAction.'+step)}</h2>
  {step==='lyrics' && <p className="mt-3 text-sm">{t('giftFlow.customerApprovalBody')}</p>}
  {step==='audio' && <p className="mt-3 text-sm">{t('giftFlow.musicProductionPending')}</p>}
  {step==='release' && <p className="mt-3 text-sm">{t('giftFlow.releaseNextStep')}</p>}
  {target && <Button asChild className="mt-4 min-h-12 h-auto whitespace-normal py-3">{target.startsWith('#')?<a href={target}>{t('giftFlow.nextAction.'+step)}</a>:<Link to={target}>{t('giftFlow.nextAction.'+step)}</Link>}</Button>}
  {error&&needsAudio&&<Button variant="outline" className="mt-4" onClick={onRetry}>{t('giftFlow.retry')}</Button>}
  {g.available_from&&<p className="mt-3 text-sm">{t('giftFlow.scheduledAccess',{date:new Date(g.available_from).toLocaleString()})}</p>}
 </section>;
}
