import { useFlowBusy } from '@/hooks/useFlowBusy';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Send, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { giftResponseEmojis, validGiftResponse } from '../../../../supabase/functions/_shared/giftResponse';

export default function GiftResponseForm({ token }: { token: string }) {
  const { t } = useTranslation('home');
  const [emoji, setEmoji] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [notice, setNotice] = useState('');
  useFlowBusy(busy || (!sent && (!!emoji || !!message || !!rating)));
  const [requestId] = useState(() => crypto.randomUUID());
  const presets = t('giftResponse.presets', { returnObjects: true });
  const send = async () => {
    if (!validGiftResponse({ emoji, message, rating })) return;
    setBusy(true); setNotice('');
    try {
      const { data, error } = await supabase.functions.invoke('gift-response', { body: { token, requestId, emoji, message, rating } });
      if (error) {
        const detail = error instanceof FunctionsHttpError ? await error.context.json().catch(() => ({})) : {};
        if (detail.error === 'already_replied') { setSent(true); setNotice(t('giftResponse.already')); return; }
        throw error;
      }
      setSent(true);
      setNotice(t(data.emailStatus === 'failed' ? 'giftResponse.emailPending' : 'giftResponse.success'));
    } catch { setNotice(t('giftResponse.error')); }
    finally { setBusy(false); }
  };
  return <section id="responder" className="mt-6 space-y-4 border-t border-border pt-6 text-left text-foreground bg-background rounded-lg p-5" aria-label={t('giftResponse.title')}>
    <h2 className="text-lg font-semibold">{t('giftResponse.title')}</h2>
    {sent ? <p role="status">{notice}</p> : <>
      <div role="group" aria-label={t('giftResponse.emoji')} className="flex flex-wrap gap-2">
        {giftResponseEmojis.map(item => <Button key={item} variant={emoji === item ? 'default' : 'outline'} size="icon" className="h-12 w-12 text-2xl" aria-label={item} aria-pressed={emoji === item} onClick={() => setEmoji(item)}>{item}</Button>)}
      </div>
      <Label htmlFor="gift-response-message">{t('giftResponse.message')}</Label>
      <div className="flex flex-wrap gap-2">{Array.isArray(presets) && presets.filter((p): p is string => typeof p === 'string').map(p => <Button key={p} variant="outline" className="h-auto min-h-10 whitespace-normal text-left" onClick={() => setMessage(p)}>{p}</Button>)}</div>
      <Textarea id="gift-response-message" value={message} onChange={e => setMessage(e.target.value)} maxLength={500} rows={3} />
      <h3 className="font-semibold">{t('giftResponse.rate')}</h3>
      <div role="group" aria-label={t('giftResponse.rate')} className="flex gap-2">
        {[1,2,3,4,5].map(star => <Button key={star} variant="ghost" size="icon" className="h-10 w-10" aria-label={`${star}/5`} aria-pressed={rating === star} onClick={() => setRating(star)}><Star className={rating && star <= rating ? 'h-7 w-7 fill-primary text-primary' : 'h-7 w-7 text-muted-foreground'} /></Button>)}
      </div>
      <Button disabled={busy || !emoji} onClick={() => void send()} className="h-auto min-h-12 w-full whitespace-normal"><Send className="mr-2 h-4 w-4" />{t(busy ? 'giftResponse.sending' : 'giftResponse.send')}</Button>
      {notice && <p role="alert" className="text-sm">{notice}</p>}
    </>}
  </section>;
}