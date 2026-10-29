import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../integrations/supabase/types';
import { giftAudioLimit } from './gift-duration.ts';

export interface MusicUploadOrder {
  id: string;
  user_id: string;
  status: string;
  approved_lyric_id: string | null;
  gift?: { duration_seconds: number | null; track_version: number; music_source: string };
}

export interface MusicUploadOptions {
  signal?: AbortSignal;
  onStage?: (stage: string) => void;
}

/** One ready recording completes production. A second recording is optional. */
export async function saveMusicUpload(
  client: SupabaseClient<Database>, file: File, order: MusicUploadOrder,
  version: number, durationSeconds: number | null,
  options: MusicUploadOptions = {},
) {
  const stage = (label: string) => {
    if (options.signal?.aborted) throw new Error('Envio cancelado. Confira o pedido antes de tentar novamente.');
    options.onStage?.(label);
  };
  if (!file.size) throw new Error('O arquivo está vazio. Selecione um MP3 ou WAV válido.');
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp3';
  if (!['mp3', 'wav'].includes(extension) && !file.type.startsWith('audio/')) {
    throw new Error('Selecione um arquivo de áudio MP3 ou WAV.');
  }
  if (![1, 2].includes(version)) throw new Error('Versão de áudio inválida.');
  if (order.gift && !order.approved_lyric_id) throw new Error('Aguarde a aprovação da letra pelo cliente.');
  if (order.gift?.duration_seconds) {
    const limit = giftAudioLimit(order.gift.duration_seconds);
    if (!durationSeconds || durationSeconds <= 0 || !Number.isFinite(durationSeconds) || durationSeconds > limit + 0.05) {
      throw new Error(`Este pedido permite um áudio de até ${limit}s. Envie um arquivo válido dentro desse limite.`);
    }
  }
  const path = `${order.user_id}/${order.id}-v${version}-${crypto.randomUUID()}.${extension}`;
  const bucket = client.storage.from('music-tracks');
  stage('Enviando arquivo…');
  // Files selected on mobile/Windows can carry an empty or generic MIME type.
  const contentType = extension === 'mp3' ? 'audio/mpeg' : extension === 'wav' ? 'audio/wav' : file.type;
  const { error: uploadError } = await bucket.upload(path, new File([file], file.name, { type: contentType }), { contentType });
  if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`);
  const audioUrl = bucket.getPublicUrl(path).data.publicUrl;
  stage('Salvando faixa…');
  const { error: trackError } = await client.from('tracks').upsert({
    order_id: order.id, audio_url: audioUrl, status: 'READY', version,
    ...(durationSeconds !== null ? { duration_seconds: durationSeconds } : {}),
  }, { onConflict: 'order_id,version' });
  if (trackError) {
    // A disconnected response does not prove the write failed. Keep the uploaded
    // file: removing it could break a track committed just before the timeout.
    throw new Error(`Arquivo enviado, mas não foi possível confirmar a faixa: ${trackError.message}. Atualize o pedido antes de reenviar.`);
  }
  stage('Conferindo faixa…');
  const { data: tracks, error: tracksError } = await client.from('tracks')
    .select('version,audio_url').eq('order_id', order.id).eq('status', 'READY');
  if (tracksError) throw new Error(`O áudio foi salvo, mas a conferência falhou: ${tracksError.message}. Atualize o pedido.`);
  const ready = (tracks || []).filter(t => t.audio_url && t.version !== null);
  const primary = order.gift
    ? ready.find(t => t.version === order.gift!.track_version)
    : ready.find(t => t.version === 1) || ready[0];
  if (!primary) throw new Error('Envie a música principal selecionada para o cartão antes de concluir. O áudio adicional foi salvo.');
  // Completion never publishes a gift: the existing ADM release checks still apply.
  stage('Concluindo produção…');
  const { error: orderError } = await client.from('orders').update({
    status: 'COMPLETED', ...(order.status !== 'COMPLETED' ? { music_ready_at: new Date().toISOString() } : {}),
  }).eq('id', order.id);
  if (orderError) throw new Error(`O áudio foi salvo, mas o pedido não foi concluído: ${orderError.message}. Atualize o pedido e tente concluir novamente.`);
  return {
    audioUrl: primary.audio_url!,
    uploadedVersions: ready.map(t => t.version!),
    newlyCompleted: order.status !== 'COMPLETED',
  };
}
