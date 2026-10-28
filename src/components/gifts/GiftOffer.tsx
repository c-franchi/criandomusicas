import { useTranslation } from 'react-i18next';
import { useGiftCatalog } from '@/hooks/useMusicalGifts';
import { quoteGift } from '@/lib/gifts';
import { getLocalizedPrice } from '@/lib/i18n-format';
import type { GiftProduct } from './products';
import { Button } from '@/components/ui/button';
export default function GiftOffer({product,source,duration,onSource,onDuration}:{product:GiftProduct;source:'new'|'existing';duration:number|null;onSource:(s:'new'|'existing')=>void;onDuration:(d:number|null)=>void}) {
 const {t,i18n}=useTranslation('home');const catalog=useGiftCatalog();
 const amount=catalog.data?quoteGift({product,music_source:source,duration_seconds:source==='existing'?null:duration,has_card:product!=='short',details:{fulfillment:'self_print'}},catalog.data.prices,catalog.data.operations):null;
 return <section className="mt-6 space-y-4 rounded-2xl border border-primary/30 bg-card p-5" aria-label={t('gifts.offer.title')}>
  {product!=='short' && <fieldset><legend className="mb-2 text-sm font-medium">{t('gifts.modalities.title')}</legend><div className="grid grid-cols-2 gap-2">{(['new','existing'] as const).map(mode=><Button key={mode} variant={source===mode?'default':'outline'} className="h-auto min-h-12 whitespace-normal py-2 text-xs" aria-pressed={source===mode} onClick={()=>onSource(mode)}>{t(`gifts.modalities.${mode}.title`)}</Button>)}</div></fieldset>}
  {source==='new' && <fieldset><legend className="mb-2 text-sm font-medium">{t('giftFlow.duration')}</legend><div className="flex flex-wrap gap-2">{(product==='short'?[15,30]:[15,30,null]).map(seconds=><Button key={seconds||'full'} variant={duration===seconds?'default':'outline'} size="sm" className="h-auto min-h-11 whitespace-normal" aria-pressed={duration===seconds} onClick={()=>onDuration(seconds)}>{seconds?t('gifts.upTo',{seconds}):t('giftFlow.fullSong')}</Button>)}</div></fieldset>}
  <p className="text-xl font-semibold" aria-live="polite">{catalog.isPending?t('giftFlow.loading'):amount===null?t('giftFlow.pricePending'):getLocalizedPrice(amount,i18n.language,'BRL').formatted}</p>
  {catalog.isError && <Button variant="outline" onClick={()=>void catalog.refetch()}>{t('giftFlow.retry')}</Button>}
  <p className="text-sm text-muted-foreground">{t('gifts.offer.summary')}</p>
  <p className="text-sm"><strong>{t('gifts.offer.production')}: </strong>{catalog.data?.operations.production_estimate?.trim() || t('gifts.offer.productionPending')}</p>
  {product==='physical' && <p className="text-sm text-muted-foreground">{t('giftFlow.selfPrintHelp')}</p>}
 </section>;
}
