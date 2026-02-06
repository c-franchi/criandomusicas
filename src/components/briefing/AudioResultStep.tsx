import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Copy, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AudioResultStepProps {
  lyrics: string;
  onRegenerate: () => void;
  onBack: () => void;
  onComplete?: (lyrics: string) => void;
}

export const AudioResultStep = ({
  lyrics,
  onRegenerate,
  onBack,
  onComplete,
}: AudioResultStepProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(lyrics);
    setCopied(true);
    toast.success('Letra copiada!');
    setTimeout(() => setCopied(false), 2000);
  }, [lyrics]);

  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">🎉 Letra gerada!</h2>
        <p className="text-sm text-muted-foreground">
          Sua letra está pronta. Copie e cole no Suno para criar a música.
        </p>
      </div>

      {/* Lyrics display */}
      <div className="bg-muted/50 rounded-xl border border-border p-4">
        <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
          {lyrics}
        </pre>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <Button size="lg" onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="w-5 h-5 mr-2" />
              Copiado!
            </>
          ) : (
            <>
              <Copy className="w-5 h-5 mr-2" />
              Copiar para Suno
            </>
          )}
        </Button>

        {onComplete && (
          <Button
            variant="secondary"
            size="lg"
            onClick={() => onComplete(lyrics)}
          >
            Usar esta letra no meu pedido
          </Button>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onRegenerate}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Gerar novamente
          </Button>
          <Button variant="outline" className="flex-1" onClick={onBack}>
            Voltar ao início
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default AudioResultStep;
