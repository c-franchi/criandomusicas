import { useTranslation } from 'react-i18next';
import type { MusicalGift } from '@/lib/gifts';
import { useBriefingTranslations } from '@/hooks/useBriefingTranslations';

/** Review the same data that is saved for production; never summarize it with AI. */
export default function GiftBriefingSummary({ gift }: { gift: Partial<MusicalGift> }) {
  const { t } = useTranslation('home');
  const { styleOptions } = useBriefingTranslations();
  const d = gift.details || {};
  const rows = [
    ['sender', gift.sender_name], ['occasion', gift.occasion ? t('gifts.themes.' + gift.occasion, { defaultValue: gift.occasion }) : ''],
    ...(gift.music_source === 'new' ? [
      ['style', styleOptions.find(s => s.id === d.style)?.label || d.style],
      ['tone', d.tone ? t('giftFlow.tones.' + d.tone, { defaultValue: d.tone }) : ''],
      ['language', d.language], ['relationship', d.relationship],
      ['feelings', d.feelings], ['story', d.story], ['notes', d.notes],
    ] : []), ['dedication', gift.dedication],
  ].filter(([, value]) => typeof value === 'string' && value.trim());
  return <details open className="rounded-xl border border-border p-4">
    <summary className="cursor-pointer font-medium">{t('giftFlow.simplify.checkStory')}</summary>
    <p className="mt-3 text-sm text-muted-foreground">{t('giftFlow.simplify.contextHelp')}</p>
    <dl className="mt-4 space-y-4">{rows.map(([key, value]) => <div key={key}>
      <dt className="text-sm font-medium">{t('giftFlow.' + key)}</dt>
      <dd className="mt-1 whitespace-pre-line break-words text-sm text-muted-foreground">{value}</dd>
    </div>)}</dl>
  </details>;
}
