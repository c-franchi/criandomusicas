import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../integrations/supabase/types';
import { musicUploadFetch, uploadRequest } from './upload-request.ts';

export async function createMusicUploadClient(client: SupabaseClient<Database>, signal: AbortSignal, config = {
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  transport: fetch,
}) {
  const { data, error } = await uploadRequest(() => client.auth.getSession(), {
    signal, message: 'Não foi possível confirmar sua sessão. Entre novamente no ADM e tente enviar a música.',
  });
  if (error || !data.session?.access_token) throw new Error('Sua sessão expirou. Entre novamente no ADM.');
  // Same user JWT and RLS, without repeatedly waiting for the shared auth lock.
  // No new session is persisted; the main client remains the session owner.
  return createClient<Database>(config.url, config.key, {
    accessToken: async () => data.session!.access_token,
    global: { fetch: musicUploadFetch(signal, config.transport) },
  });
}
