import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGiftAudio } from '@/hooks/useMusicalGifts';
import { MusicUploadControls } from '@/components/admin/MusicUploadControls';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { readAudioDuration } from '@/lib/audio-duration';
import { saveMusicUpload } from '@/lib/music-upload';
import type { MusicalGift } from '@/lib/gifts';

export default function GiftProductionPanel({gift:g,onBusyChange}: {gift:MusicalGift;onBusyChange?:(busy:boolean)=>void}) {
  const audio = useGiftAudio(g);
  const qc = useQueryClient();
  const {t} = useTranslation('home');
  const {user} = useAuth();
  const [uploading,setUploading] = useState<string|null>(null);
  const uploadBusy=useRef(false);
  const [error,setError] = useState('');
  const [saved,setSaved] = useState(false);
  const paid = !!g.payment_confirmed_at || g.is_test;
  const approved = g.music_source === 'existing' || !!audio.data?.approved_lyric_id;
  return <section className="space-y-4 rounded-xl border border-primary/30 p-4">
    <h3 className="font-semibold">{t('giftFlow.workflowTitle')}</h3>
    <ol className="grid gap-2 text-sm sm:grid-cols-2">
      {[[paid,'paymentStep'],[approved,'lyricStep'],[!!audio.data?.audio_url,'audioStep'],[g.status==='ACTIVE','releaseStep']].map(([done,key])=><li key={String(key)} className={done?'text-primary':'text-muted-foreground'}>{done?'✓':'○'} {t(`giftFlow.${key}`)}</li>)}
    </ol>
    {audio.isError ? <div role="alert" className="space-y-2"><p>{t('giftFlow.audioQueryError')}</p><Button variant="outline" size="sm" onClick={()=>void audio.refetch()}>{t('giftFlow.retryAudio')}</Button></div> : audio.isPending ? <p role="status">{t('giftFlow.loading')}</p> : <>
      {!approved && <p>{t('giftFlow.approvalPending')}</p>}
      {!approved && g.owner_id===user?.id && g.production_order_id && <Button asChild variant="outline"><Link to={`/criar-musica?orderId=${g.production_order_id}`}>{t('giftFlow.reviewLyrics')}</Link></Button>}
      {paid && approved && g.music_source==='new' && g.production_order_id && g.status!=='ACTIVE' && <MusicUploadControls
        helpText={t('giftFlow.uploadHere')}
        order={{id:g.production_order_id,user_id:g.owner_id,status:['LYRICS_APPROVED','COMPLETED'].includes(audio.data?.status || '')?'MUSIC_GENERATING':audio.data?.status || 'MUSIC_GENERATING',approved_lyric_id:audio.data?.approved_lyric_id || null,gift:g,uploadedVersions:audio.data?.uploadedVersions}}
        uploading={uploading}
        onUpload={async(file,version)=>{
          if(uploadBusy.current) return;
          uploadBusy.current=true;onBusyChange?.(true);
          setUploading(`${g.production_order_id}-v${version}`);setError('');setSaved(false);
          try {
            await saveMusicUpload(supabase,file,{id:g.production_order_id!,user_id:g.owner_id,status:audio.data!.status,approved_lyric_id:audio.data!.approved_lyric_id,gift:g},version,g.duration_seconds?await readAudioDuration(file):null);
            await qc.invalidateQueries({queryKey:['gift-audio']});
            setSaved(true);
          } catch(e){setError(e instanceof Error?e.message:t('giftFlow.genericError'));}
          finally{uploadBusy.current=false;setUploading(null);onBusyChange?.(false);}
        }} />}
      {saved && <p role="status">{t('giftFlow.uploadSaved')}</p>}
      {audio.data?.audio_url && <><p className="font-medium">{t(g.status==='ACTIVE'?'giftFlow.status.ACTIVE':'giftFlow.awaitingRelease')}</p><audio key={audio.data.audio_url} controls preload="metadata" src={audio.data.audio_url} className="w-full" /></>}
    </>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
  </section>;
}
