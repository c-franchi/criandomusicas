import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2, Mail, User, MessageSquare } from "lucide-react";

const contactSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: z.string().email("Email inválido").max(255),
  subject: z.string().min(3, "Assunto deve ter pelo menos 3 caracteres").max(200),
  message: z.string().min(10, "Mensagem deve ter pelo menos 10 caracteres").max(2000),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ContactFormModal = ({ open, onOpenChange }: ContactFormModalProps) => {
  const { t } = useTranslation('home');
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: data,
      });

      if (error) throw error;

      toast({
        title: t('contact.successTitle', 'Mensagem enviada!'),
        description: t('contact.successDescription', 'Responderemos em breve pelo email informado.'),
      });
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending contact form:', error);
      toast({
        title: t('contact.errorTitle', 'Erro ao enviar'),
        description: t('contact.errorDescription', 'Tente novamente ou entre em contato pelo WhatsApp.'),
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            {t('contact.title', 'Entre em Contato')}
          </DialogTitle>
          <DialogDescription>
            {t('contact.subtitle', 'Envie sua dúvida ou mensagem e responderemos por email.')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t('contact.name', 'Nome')}
            </Label>
            <Input
              id="name"
              placeholder={t('contact.namePlaceholder', 'Seu nome completo')}
              {...register('name')}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {t('contact.email', 'Email')}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={t('contact.emailPlaceholder', 'seu@email.com')}
              {...register('email')}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">
              {t('contact.subject', 'Assunto')}
            </Label>
            <Input
              id="subject"
              placeholder={t('contact.subjectPlaceholder', 'Sobre o que você quer falar?')}
              {...register('subject')}
              className={errors.subject ? 'border-destructive' : ''}
            />
            {errors.subject && (
              <p className="text-xs text-destructive">{errors.subject.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {t('contact.message', 'Mensagem')}
            </Label>
            <Textarea
              id="message"
              placeholder={t('contact.messagePlaceholder', 'Digite sua dúvida ou mensagem aqui...')}
              rows={4}
              {...register('message')}
              className={errors.message ? 'border-destructive' : ''}
            />
            {errors.message && (
              <p className="text-xs text-destructive">{errors.message.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('contact.sending', 'Enviando...')}
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {t('contact.send', 'Enviar Mensagem')}
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContactFormModal;
