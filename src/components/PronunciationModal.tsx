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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Definir Pronúncia
          </DialogTitle>
          <DialogDescription>
            Detectamos termos especiais na sua letra que podem ser pronunciados de forma diferente. 
            Por favor, defina como cada um deve ser falado/cantado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {missingTerms.map((term) => (
            <div key={term} className="space-y-2">
              <Label className="flex items-center gap-2">
                <span className="font-mono bg-muted px-2 py-1 rounded text-primary">{term}</span>
                <Volume2 className="w-4 h-4 text-muted-foreground" />
              </Label>
              <Input
                placeholder={`Como pronunciar "${term}"? Ex: én-i-vê-óito`}
                value={pronunciations[term] || ''}
                onChange={(e) => setPronunciations(prev => ({
                  ...prev,
                  [term]: e.target.value
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Escreva foneticamente como o cantor deve pronunciar
              </p>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 p-3 rounded-lg text-sm">
          <p className="text-muted-foreground">
            <strong>Dica:</strong> Para siglas, escreva letra por letra (ex: NYV8 → "én-i-vê-óito"). 
            Para nomes próprios, escreva como se fala (ex: iPhone → "aifon").
          </p>
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
