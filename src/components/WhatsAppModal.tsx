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
import { useTranslation } from "react-i18next";

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
  const { t, i18n } = useTranslation("briefing");
  const isBR = (i18n.resolvedLanguage || i18n.language || "pt").startsWith("pt");

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
    const formatted = isBR ? formatPhone(e.target.value) : e.target.value.replace(/[^\d+ ]/g, '');
    setWhatsapp(formatted);
  };

  const isValidPhone = () => {
    const numbers = whatsapp.replace(/\D/g, '');
    return isBR ? numbers.length >= 10 && numbers.length <= 11 : numbers.length >= 8 && numbers.length <= 15;
  };

  const handleSubmit = async () => {
    if (!isValidPhone()) {
      toast({
        title: t("whatsappModal.invalidTitle"),
        description: t("whatsappModal.invalidDesc"),
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
        title: t("whatsappModal.savedTitle"),
        description: t("whatsappModal.savedDesc"),
      });

      onConfirm();
    } catch (error) {
      console.error('Error saving whatsapp:', error);
      toast({
        title: t("whatsappModal.errorTitle"),
        description: t("whatsappModal.errorDesc"),
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md z-[100]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            {t("whatsappModal.title")}
          </DialogTitle>
          <DialogDescription>
            {t("whatsappModal.description")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp">{t("whatsappModal.label")}</Label>
            <Input
              id="whatsapp"
              type="tel"
              placeholder={isBR ? "(11) 99999-9999" : "+39 333 123 4567"}
              value={whatsapp}
              onChange={handleChange}
              maxLength={16}
            />
            <p className="text-xs text-muted-foreground">
              {t("whatsappModal.hint")}
            </p>
          </div>
          
          <Button 
            onClick={handleSubmit} 
            className="w-full"
            disabled={!isValidPhone() || saving}
          >
            {saving ? (
              t("whatsappModal.saving")
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {t("whatsappModal.confirm")}
              </>
            )}
          </Button>
          <Button variant="ghost" className="w-full" onClick={onConfirm} disabled={saving}>
            {t("whatsappModal.skip")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppModal;
