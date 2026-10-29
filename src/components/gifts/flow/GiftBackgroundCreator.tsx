import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { backgroundDesigns, backgroundPalettes, backgroundPreviewUrl, type BackgroundDesign, type BackgroundPalette } from '@/lib/gift-background-art';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
export default function GiftBackgroundCreator({ busy, onCreate }: { busy: boolean; onCreate: (design: BackgroundDesign, palette: BackgroundPalette) => Promise<void> }) {
 const {t}=useTranslation('home');
 const [design,setDesign]=useState<BackgroundDesign>('flowers');const [palette,setPalette]=useState<BackgroundPalette>('rose');
 return <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
  <h3 className="font-semibold">{t('giftFlow.backgroundCreator.title')}</h3>
  <p className="text-sm text-muted-foreground">{t('giftFlow.backgroundCreator.help')}</p>
  <div className="grid gap-4 sm:grid-cols-2">
   <div className="space-y-3">
    <Label htmlFor="background-design">{t('giftFlow.cardDesign')}</Label>
    <select id="background-design" value={design} disabled={busy} onChange={e=>setDesign(e.target.value as BackgroundDesign)} className="min-h-11 w-full rounded-lg border border-input bg-background p-3 text-sm">
     {backgroundDesigns.map(d=><option value={d} key={d}>{t('giftFlow.designs.'+d)}</option>)}
    </select>
    <Label htmlFor="background-palette">{t('giftFlow.backgroundCreator.palette')}</Label>
    <select id="background-palette" value={palette} disabled={busy} onChange={e=>setPalette(e.target.value as BackgroundPalette)} className="min-h-11 w-full rounded-lg border border-input bg-background p-3 text-sm">
     {backgroundPalettes.map(p=><option value={p} key={p}>{t('giftFlow.backgroundCreator.palettes.'+p)}</option>)}
    </select>
    <Button type="button" className="min-h-11" disabled={busy} onClick={()=>void onCreate(design,palette)}>{t('giftFlow.backgroundCreator.create')}</Button>
   </div>
   <div className="relative mx-auto w-40 overflow-hidden rounded-xl border bg-white text-slate-700">
    <img src={backgroundPreviewUrl(design,palette)} alt={t('giftFlow.backgroundCreator.preview')} width="720" height="960" className="aspect-[3/4] w-full" />
    <p className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-xs">{t('giftFlow.backgroundCreator.safeArea')}</p>
   </div>
  </div>
 </div>;
}
