import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Volume2, Loader2 } from "lucide-react";

interface Pronunciation {
  term: string;
  phonetic: string;
}

interface PronunciationModalProps {
  open: boolean;
  onClose: () => void;
  missingTerms: string[];
  onSubmit: (pronunciations: Pronunciation[]) => void;
  loading?: boolean;
}

const PronunciationModal = ({
  open,
  onClose,
  missingTerms,
  onSubmit,
  loading = false
}: PronunciationModalProps) => {
  const [pronunciations, setPronunciations] = useState<Record<string, string>>(
    Object.fromEntries(missingTerms.map(term => [term, '']))
  );

  const handleSubmit = () => {
    const result: Pronunciation[] = missingTerms.map(term => ({
      term,
      phonetic: pronunciations[term] || term
    }));
    onSubmit(result);
  };

  const allFilled = missingTerms.every(term => pronunciations[term]?.trim());

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Pronúncia Especial Necessária
          </DialogTitle>
          <DialogDescription className="text-left">
            <span className="block mb-2">
              Detectamos termos especiais que precisam de pronúncia definida para que o cantor pronuncie corretamente.
            </span>
            <span className="block text-primary font-medium">
              ⚠️ Sem essa informação, não conseguimos produzir sua música.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {missingTerms.map((term) => (
            <div key={term} className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
              <Label className="flex items-center gap-2">
                <span className="font-mono bg-primary/20 px-3 py-1.5 rounded text-primary font-bold text-lg">{term}</span>
                <Volume2 className="w-4 h-4 text-muted-foreground" />
              </Label>
              <Input
                placeholder={`Como pronunciar "${term}"?`}
                value={pronunciations[term] || ''}
                onChange={(e) => setPronunciations(prev => ({
                  ...prev,
                  [term]: e.target.value
                }))}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                Escreva <strong>exatamente como se pronuncia verbalmente</strong>
              </p>
            </div>
          ))}
        </div>

        <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg text-sm space-y-2">
          <p className="font-medium text-foreground">💡 Exemplos de pronúncia:</p>
          <ul className="text-muted-foreground space-y-1 list-disc list-inside">
            <li><strong>NYV8</strong> → "ene ipsolon vê oito"</li>
            <li><strong>iPhone</strong> → "aifón"</li>
            <li><strong>Wi-Fi</strong> → "uái-fái"</li>
            <li><strong>ABC</strong> → "a bê cê"</li>
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!allFilled || loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              'Confirmar e Aprovar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PronunciationModal;
