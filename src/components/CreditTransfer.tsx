import { useState, useEffect, useCallback } from 'react';
import { Gift, Send, Inbox, Clock, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useCredits } from '@/hooks/useCredits';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CreditTransfer {
  id: string;
  from_user_id: string;
  to_user_email: string;
  to_user_id: string | null;
  credits_amount: number;
  credit_type: string;
  status: string;
  transfer_code: string;
  message: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

interface CreditTransferProps {
  className?: string;
}

export function CreditTransfer({ className = '' }: CreditTransferProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { totalAvailable, totalVocal, totalInstrumental, refresh: refreshCredits } = useCredits();
  
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sentTransfers, setSentTransfers] = useState<CreditTransfer[]>([]);
  const [receivedTransfers, setReceivedTransfers] = useState<CreditTransfer[]>([]);
  const [confirmTransferId, setConfirmTransferId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'accept' | 'reject' | null>(null);
  const [processing, setProcessing] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [creditType, setCreditType] = useState<'vocal' | 'instrumental'>('vocal');
  const [amount, setAmount] = useState(1);
  const [message, setMessage] = useState('');

  const fetchTransfers = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch sent transfers
      const { data: sent, error: sentError } = await supabase
        .from('credit_transfers')
        .select('*')
        .eq('from_user_id', user.id)
        .order('created_at', { ascending: false });

      if (sentError) throw sentError;
      setSentTransfers((sent || []) as CreditTransfer[]);

      // Fetch received transfers - by user_id
      const { data: received, error: receivedError } = await supabase
        .from('credit_transfers')
        .select('*')
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (receivedError) throw receivedError;
      setReceivedTransfers((received || []) as CreditTransfer[]);
    } catch (error) {
      console.error('Error fetching transfers:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const handleSendCredits = async () => {
    if (!email || !amount || amount <= 0) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: 'Erro', description: 'Digite um email válido.', variant: 'destructive' });
      return;
    }

    const availableForType = creditType === 'vocal' ? totalVocal : totalInstrumental;
    if (amount > availableForType) {
      toast({ 
        title: 'Créditos insuficientes', 
        description: `Você tem apenas ${availableForType} crédito(s) ${creditType === 'vocal' ? 'vocal' : 'instrumental'} disponível.`, 
        variant: 'destructive' 
      });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('transfer-credits', {
        body: { 
          toEmail: email, 
          amount, 
          creditType,
          message: message.trim() || null
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao transferir créditos');
      }

      toast({ 
        title: 'Créditos enviados!', 
        description: `${amount} crédito(s) enviado(s) para ${email}` 
      });
      
      // Reset form
      setEmail('');
      setAmount(1);
      setMessage('');
      
      // Refresh data
      refreshCredits();
      fetchTransfers();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro ao enviar', description: errorMessage, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleTransferAction = async (transferId: string, action: 'accept' | 'reject') => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('accept-credit-transfer', {
        body: { transferId, action },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao processar transferência');
      }

      toast({ 
        title: action === 'accept' ? 'Créditos recebidos!' : 'Transferência recusada',
        description: action === 'accept' 
          ? 'Os créditos foram adicionados à sua conta.' 
          : 'A transferência foi recusada.' 
      });

      refreshCredits();
      fetchTransfers();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro', description: errorMessage, variant: 'destructive' });
    } finally {
      setProcessing(false);
      setConfirmTransferId(null);
      setConfirmAction(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'accepted':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Aceito</Badge>;
      case 'rejected':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Recusado</Badge>;
      case 'expired':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Expirado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const availableForType = creditType === 'vocal' ? totalVocal : totalInstrumental;

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  return (
    <>
      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmTransferId} onOpenChange={(open) => !open && setConfirmTransferId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'accept' ? 'Aceitar Créditos' : 'Recusar Transferência'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'accept' 
                ? 'Os créditos serão adicionados à sua conta.'
                : 'A transferência será cancelada e os créditos voltarão para o remetente.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmTransferId && confirmAction && handleTransferAction(confirmTransferId, confirmAction)}
              disabled={processing}
              className={confirmAction === 'reject' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {confirmAction === 'accept' ? 'Aceitar' : 'Recusar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className={`p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-full bg-primary/20">
            <Gift className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Transferir Créditos</h3>
            <p className="text-sm text-muted-foreground">
              Envie créditos para amigos ou aceite transferências
            </p>
          </div>
        </div>

        <Tabs defaultValue="send" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="send" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Enviar
            </TabsTrigger>
            <TabsTrigger value="received" className="flex items-center gap-2 relative">
              <Inbox className="w-4 h-4" />
              Recebidas
              {receivedTransfers.length > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {receivedTransfers.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="space-y-4">
            {totalAvailable === 0 ? (
              <div className="text-center py-8">
                <Gift className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Você não tem créditos disponíveis para transferir.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email do amigo</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="amigo@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de crédito</Label>
                    <Select value={creditType} onValueChange={(v) => setCreditType(v as 'vocal' | 'instrumental')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vocal" disabled={totalVocal === 0}>
                          Vocal ({totalVocal} disp.)
                        </SelectItem>
                        <SelectItem value="instrumental" disabled={totalInstrumental === 0}>
                          Instrumental ({totalInstrumental} disp.)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Quantidade</Label>
                    <Input
                      id="amount"
                      type="number"
                      min={1}
                      max={availableForType}
                      value={amount}
                      onChange={(e) => setAmount(Math.min(parseInt(e.target.value) || 1, availableForType))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem (opcional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Escreva uma mensagem para seu amigo..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="resize-none"
                    rows={2}
                  />
                </div>

                <Button 
                  onClick={handleSendCredits} 
                  disabled={sending || !email || amount > availableForType}
                  className="w-full"
                >
                  {sending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" />Enviar {amount} Crédito(s)</>
                  )}
                </Button>

                {/* Sent transfers history */}
                {sentTransfers.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Histórico de Envios</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {sentTransfers.map((transfer) => (
                        <div key={transfer.id} className="p-3 rounded-lg border bg-muted/30 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{transfer.to_user_email}</span>
                            {getStatusBadge(transfer.status)}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {transfer.credits_amount} crédito(s) {transfer.credit_type} • {format(new Date(transfer.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="received" className="space-y-4">
            {receivedTransfers.length === 0 ? (
              <div className="text-center py-8">
                <Inbox className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Você não tem transferências pendentes.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {receivedTransfers.map((transfer) => (
                  <Card key={transfer.id} className="p-4 border-primary/30">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium">
                          Você recebeu {transfer.credits_amount} crédito(s) {transfer.credit_type}!
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Código: {transfer.transfer_code}
                        </p>
                        {transfer.message && (
                          <p className="text-sm mt-2 p-2 rounded bg-muted/50 italic">
                            "{transfer.message}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Expira em: {format(new Date(transfer.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setConfirmTransferId(transfer.id);
                            setConfirmAction('accept');
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Aceitar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setConfirmTransferId(transfer.id);
                            setConfirmAction('reject');
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Recusar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </>
  );
}

export default CreditTransfer;
