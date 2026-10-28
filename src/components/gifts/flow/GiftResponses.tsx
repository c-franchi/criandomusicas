import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
export default function GiftResponses({ giftId }: { giftId: string }) {
  const [busy,setBusy]=useState<string|null>(null);
  const [notice,setNotice]=useState('');
  const { t, i18n } = useTranslation('home');
  const query = useQuery({ queryKey: ['gift-responses', giftId], queryFn: async () => {
    const { data, error } = await supabase.from('gift_responses').select('id,emoji,message,rating,created_at,email_status').eq('gift_id', giftId).order('created_at', { ascending: false });
    if (error) throw error; return data;
  }, refetchInterval: 30000 });
  const retry=async(id:string)=>{setBusy(id);setNotice('');try{const {data,error}=await supabase.functions.invoke('gift-response',{body:{retryResponseId:id}});if(error||data.emailStatus!=='sent') throw Error();setNotice(t('giftResponse.emailSent'));}catch{setNotice(t('giftResponse.emailFailed'));}finally{setBusy(null);void query.refetch();}};
  return <section id="respostas" className="my-7 space-y-3 border-t border-border pt-6">
    <h2 className="text-lg font-semibold">{t('giftResponse.inbox')}</h2>
    {query.isError ? <p role="alert">{t('giftFlow.loadError')}</p> : query.isPending ? <p>{t('giftFlow.loading')}</p> : query.data.length ? query.data.map(r => <div key={r.id} className="space-y-2"><p className="text-3xl">{r.emoji}</p><p className="whitespace-pre-line break-words">{r.message}</p>{r.rating && <p>{r.rating}/5 ★</p>}<p className="text-xs text-muted-foreground">{t("giftResponse.emailState")}: {t("giftResponse.emailStatus."+r.email_status)}</p>{["failed","pending"].includes(r.email_status)&&Date.now()-new Date(r.created_at).getTime()<23*60*60*1000&&<Button variant="outline" disabled={!!busy} onClick={()=>void retry(r.id)}>{t("giftResponse.retryEmail")}</Button>}<p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString(i18n.language)}</p></div>) : <p className="text-sm text-muted-foreground">{t('giftResponse.empty')}</p>}
    {notice&&<p role="status">{notice}</p>}
  </section>;
}