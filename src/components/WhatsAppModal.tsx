import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageCircle, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WhatsAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  userId: string;
}

const WhatsAppModal = ({ open, onOpenChange, onConfirm, userId }: WhatsAppModalProps) => {
  const [whatsapp, setWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const formatPhone = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Formata como (11) 99999-9999
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setWhatsapp(formatted);
  };

  const isValidPhone = () => {
    const numbers = whatsapp.replace(/\D/g, '');
    return numbers.length >= 10 && numbers.length <= 11;
  };

  const handleSubmit = async () => {
    if (!isValidPhone()) {
      toast({
        title: "Número inválido",
        description: "Digite um número de WhatsApp válido",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      // Verificar se profile existe primeiro
      const { data: existingProfile, error: selectError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (selectError) {
        console.error('Error checking profile:', selectError);
        throw selectError;
      }

      if (!existingProfile) {
        // Se não existe perfil, criar um novo
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ user_id: userId, whatsapp });

        if (insertError) throw insertError;
      } else {
        // Se existe, fazer update
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ whatsapp, updated_at: new Date().toISOString() })
          .eq('user_id', userId);

        if (updateError) throw updateError;
      }

      toast({
        title: "WhatsApp salvo!",
        description: "Poderemos entrar em contato caso necessário.",
      });

      onConfirm();
    } catch (error) {
      console.error('Error saving whatsapp:', error);
      toast({
        title: "Erro ao salvar",
        description: "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Informe seu WhatsApp (opcional)
          </DialogTitle>
          <DialogDescription>
            Informe seu número para que possamos entrar em contato caso necessário. Sua música será entregue diretamente na plataforma.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp">Número do WhatsApp</Label>
            <Input
              id="whatsapp"
              type="tel"
              placeholder="(11) 99999-9999"
              value={whatsapp}
              onChange={handleChange}
              maxLength={16}
            />
            <p className="text-xs text-muted-foreground">
              Usado apenas para contato de suporte, se necessário
            </p>
          </div>
          
          <Button 
            onClick={handleSubmit} 
            className="w-full"
            disabled={!isValidPhone() || saving}
          >
            {saving ? (
              "Salvando..."
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Confirmar e Continuar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppModal;
