import { useRef } from 'react';
import { CheckCircle, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MusicUploadOrder } from '@/lib/music-upload';

export function MusicUploadControls({ order, uploading, onUpload }: {
  order: MusicUploadOrder & { uploadedVersions?: number[] };
  uploading: string | null;
  onUpload: (file: File, version: number) => void;
}) {
  const inputs = useRef<Record<number, HTMLInputElement | null>>({});
  if (!['MUSIC_GENERATING', 'MUSIC_READY', 'COMPLETED'].includes(order.status)
    || order.gift?.music_source === 'existing') return null;
  const versions = [1, 2].filter(version => order.status !== 'COMPLETED' || !order.uploadedVersions?.includes(version));
  if (!versions.length) return null;
  const primary = order.gift?.track_version || 1;
  return <div className="flex w-full flex-wrap gap-2">
    <p className="w-full text-xs text-muted-foreground">Envie uma música para concluir a produção. A segunda versão é opcional e pode ser adicionada depois, na aba Concluídos.</p>
    {versions.map(version => {
      const ready = order.uploadedVersions?.includes(version);
      const busy = uploading === `${order.id}-v${version}`;
      const needsPrimary = !!order.gift && version !== primary && !order.uploadedVersions?.includes(primary);
      return <div key={version} className="flex-1 sm:flex-none">
        <input type="file" accept="audio/*" className="hidden" aria-label={`Áudio da versão ${version}`}
          ref={el => { inputs.current[version] = el; }}
          onChange={e => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = '';
            if (file) onUpload(file, version);
          }} />
        <Button size="sm" className="h-auto min-h-9 w-full whitespace-normal text-xs sm:text-sm"
          variant={version === primary ? 'default' : 'outline'} disabled={!!uploading || needsPrimary}
          onClick={() => inputs.current[version]?.click()}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : ready ? <CheckCircle className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
          {busy ? 'Enviando…' : ready ? `Substituir versão ${version}` : version === primary ? 'Enviar música principal' : `Versão ${version} (opcional)`}
        </Button>
      </div>;
    })}
  </div>;
}
