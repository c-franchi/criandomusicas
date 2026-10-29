import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { MusicalGift } from '@/lib/gifts';
import { giftAdminStage, type LyricApprovalState } from '@/lib/gift-production-state';
export default function GiftOrderSummary({order}: {order:{id:string;status:string;song_title?:string|null;lyric_title?:string|null;user_name?:string|null;track_url?:string|null;lyric_approval_state?:LyricApprovalState;gift?:Pick<MusicalGift,'id'|'product'|'recipient_name'|'status'|'is_test'|'duration_seconds'|'music_source'>}}) {
 const {t}=useTranslation('home'), g=order.gift;
 if(!g) return null;
 const stage=giftAdminStage(g.status,g.music_source==='existing',order.lyric_approval_state,!!order.track_url);
 return <Card className="min-w-0 space-y-3 p-4">
  <p className="text-xs font-medium text-primary">{t(`gifts.products.${g.product}.name`)}{g.is_test?' · TESTE':''}</p>
  <h2 className="break-words text-lg font-semibold">{order.lyric_title || order.song_title || g.recipient_name}</h2>
  <p className="text-sm text-muted-foreground">{g.recipient_name}{order.user_name?' · '+order.user_name:''}</p>
  <p className="text-sm font-medium">{t('giftFlow.adminSync.stages.'+stage)}</p>
  <Button asChild className="h-auto min-h-12 w-full whitespace-normal"><Link to={`/admin/presentes?presente=${g.id}`}>{t('giftFlow.adminSync.manage')}</Link></Button>
  <p className="break-all text-xs text-muted-foreground">#{order.id.slice(0,8)}</p>
 </Card>;
}
