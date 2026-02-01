import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Gift, ArrowRight, Music, Loader2 } from "lucide-react";

interface PendingTransfer {
  id: string;
  credits_amount: number;
  transfer_code: string;
  message: string | null;
  from_user_id: string;
  created_at: string;
  sender_name?: string;
  sender_email?: string;
}

interface ReceivedCreditsNotificationProps {
  variant?: 'banner' | 'card';
  className?: string;
}

const ReceivedCreditsNotification = ({ 
  variant = 'banner',
  className = '' 
}: ReceivedCreditsNotificationProps) => {
  const { t } = useTranslation('dashboard');
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [pendingTransfers, setPendingTransfers] = useState<PendingTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchPendingTransfers();
    }
  }, [user]);

  const fetchPendingTransfers = async () => {
    if (!user) return;

    try {
      // Fetch pending transfers for this user
      const { data: transfers, error } = await supabase
        .from('credit_transfers')
        .select('*')
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch sender profiles for each transfer
      if (transfers && transfers.length > 0) {
        const senderIds = [...new Set(transfers.map(t => t.from_user_id))];
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name')
          .in('user_id', senderIds);

        // Get sender emails from auth if profiles don't have names
        const transfersWithSenders = transfers.map(transfer => {
          const profile = profiles?.find(p => p.user_id === transfer.from_user_id);
          return {
            ...transfer,
            sender_name: profile?.name || null,
          };
        });

        setPendingTransfers(transfersWithSenders);
      } else {
        setPendingTransfers([]);
      }
    } catch (error) {
      console.error('Error fetching pending transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTransfer = async (transfer: PendingTransfer) => {
    setAccepting(transfer.id);
    try {
      const { data, error } = await supabase.functions.invoke('accept-credit-transfer', {
        body: { transferId: transfer.id },
      });

      if (error) throw error;

      toast({
        title: '🎉 ' + t('receivedCredits.accepted', 'Crédito recebido!'),
        description: t('receivedCredits.acceptedDesc', 'O crédito foi adicionado à sua conta.'),
      });

      // Remove from list
      setPendingTransfers(prev => prev.filter(t => t.id !== transfer.id));
    } catch (error) {
      console.error('Error accepting transfer:', error);
      toast({
        title: t('receivedCredits.errorTitle', 'Erro ao aceitar'),
        description: t('receivedCredits.errorDesc', 'Tente novamente ou contate o suporte.'),
        variant: 'destructive',
      });
    } finally {
      setAccepting(null);
    }
  };

  if (loading || pendingTransfers.length === 0) {
    return null;
  }

  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 border border-primary/30 rounded-xl p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Gift className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">
              {t('receivedCredits.youHave', 'Você tem')} {pendingTransfers.length} {pendingTransfers.length === 1 
                ? t('receivedCredits.creditPending', 'crédito pendente') 
                : t('receivedCredits.creditsPending', 'créditos pendentes')}!
            </p>
            <p className="text-xs text-muted-foreground">
              {pendingTransfers[0].sender_name 
                ? t('receivedCredits.fromUser', 'De: {{name}}', { name: pendingTransfers[0].sender_name })
                : t('receivedCredits.fromSomeone', 'Alguém enviou créditos para você')}
            </p>
          </div>
          <Button 
            size="sm" 
            onClick={() => navigate('/profile?tab=transfer')}
            className="flex-shrink-0"
          >
            {t('receivedCredits.view', 'Ver')}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {pendingTransfers.map((transfer) => (
        <Card key={transfer.id} className="p-4 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-lg">{transfer.credits_amount}</span>
                <Music className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  {transfer.credits_amount === 1 
                    ? t('receivedCredits.credit', 'crédito')
                    : t('receivedCredits.credits', 'créditos')}
                </span>
              </div>
              
              {transfer.sender_name && (
                <p className="text-sm font-medium">
                  {t('receivedCredits.from', 'De:')} {transfer.sender_name}
                </p>
              )}
              
              {transfer.message && (
                <p className="text-sm text-muted-foreground mt-1 italic">
                  "{transfer.message}"
                </p>
              )}
              
              <p className="text-xs text-muted-foreground mt-2">
                {t('receivedCredits.code', 'Código:')} {transfer.transfer_code}
              </p>
            </div>
            
            <Button
              onClick={() => handleAcceptTransfer(transfer)}
              disabled={accepting === transfer.id}
              size="sm"
              className="flex-shrink-0"
            >
              {accepting === transfer.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('receivedCredits.accept', 'Aceitar')
              )}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ReceivedCreditsNotification;
