import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { Gift, Send, Inbox, Clock, CheckCircle, XCircle, Loader2, AlertCircle, Copy, Share2, Link2, Key } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
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
  const { t: tu } = useTranslation('uiAccount');
  const { toast } = useToast();
  const { user } = useAuth();
  const { totalAvailable, refresh: refreshCredits } = useCredits();
  
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sentTransfers, setSentTransfers] = useState<CreditTransfer[]>([]);
  const [receivedTransfers, setReceivedTransfers] = useState<CreditTransfer[]>([]);
  const [confirmTransferId, setConfirmTransferId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'accept' | 'reject' | null>(null);
  const [processing, setProcessing] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  
  // Code sharing state
  const [shareMode, setShareMode] = useState<'email' | 'code'>('email');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Redeem code state
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

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
    // Validações para modo email
    if (shareMode === 'email') {
      if (!email) {
        toast({ title: tu('error'), description: tu('recipientEmail'), variant: 'destructive' });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast({ title: tu('error'), description: tu('validEmail'), variant: 'destructive' });
        return;
      }
    }

    // Transferência sempre é de 1 crédito
    const transferAmount = 1;

    if (totalAvailable < 1) {
      toast({ 
        title: tu('insufficient'), 
        description: tu('noTransferCredits'), 
        variant: 'destructive' 
      });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('transfer-credits', {
        body: { 
          toEmail: shareMode === 'email' ? email : null, // null = código compartilhável
          amount: transferAmount, // Sempre 1
          message: message.trim() || null
        },
      });

      // Handle edge function errors - extract message from response
      if (error) {
        // Try to parse error context for detailed message
        const errorContext = (error as any)?.context;
        if (errorContext?.body) {
          try {
            const parsed = JSON.parse(errorContext.body);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (parseErr) {
            // If parsing fails, use original error
          }
        }
        throw error;
      }

      if (!data?.success) {
        // Check for rate limit info
        if (data?.daysRemaining) {
          throw new Error(tu('transferLimit', { days: data.daysRemaining }));
        }
        throw new Error(data?.error || tu('transferFailed'));
      }

      if (shareMode === 'code') {
        // Modo código - mostrar código gerado
        setGeneratedCode(data.transfer?.code);
        toast({ 
          title: tu('codeGenerated'), 
          description: tu('shareCode') 
        });
      } else {
        // Modo email
        toast({ 
          title: tu('creditsSent'), 
          description: tu('creditSentTo', { email }) 
        });
        // Reset form
        setEmail('');
        setMessage('');
      }
      
      // Refresh data
      refreshCredits();
      fetchTransfers();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : tu('unknownError');
      toast({ title: tu('sendError'), description: errorMessage, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  // Copiar código
  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast({ title: tu('codeCopied') });
    setTimeout(() => setCopiedCode(false), 3000);
  };

  // Texto padrão para compartilhamento
  const getShareText = (code: string) => {
    return tu('shareGift', { code });
  };

  // Compartilhar via WhatsApp
  const shareWhatsApp = (code: string) => {
    const text = getShareText(code);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Compartilhar via Instagram (copia e abre Stories)
  const shareInstagram = async (code: string) => {
    const text = getShareText(code);
    await navigator.clipboard.writeText(text);
    toast({ 
      title: tu('textCopied'), 
      description: tu('instagramPaste') 
    });
    // Instagram doesn't have a share URL, so we just copy
  };

  // Compartilhar via Facebook
  const shareFacebook = (code: string) => {
    const url = 'https://criandomusicas.lovable.app/auth';
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(getShareText(code))}`, '_blank', 'width=600,height=400');
  };

  // Compartilhar via Telegram
  const shareTelegram = (code: string) => {
    const text = getShareText(code);
    window.open(`https://t.me/share/url?url=${encodeURIComponent('https://criandomusicas.lovable.app/auth')}&text=${encodeURIComponent(text)}`, '_blank');
  };

  // Usar Web Share API (se disponível)
  const shareNative = async (code: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: tu('musicalGift'),
          text: getShareText(code),
          url: 'https://criandomusicas.lovable.app/auth',
        });
      } catch (err) {
        // User cancelled or error
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(getShareText(code));
      toast({ title: tu('linkCopied') });
    }
  };

  // Resgatar código
  const handleRedeemCode = async () => {
    if (!redeemCode.trim()) {
      toast({ title: tu('error'), description: tu('enterTransferCode'), variant: 'destructive' });
      return;
    }

    setRedeeming(true);
    try {
      const { data, error } = await supabase.functions.invoke('accept-credit-transfer', {
        body: { transferCode: redeemCode.trim().toUpperCase(), action: 'accept' },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || tu('redeemCodeError'));
      }

      toast({ 
        title: tu('creditsRedeemed'), 
        description: tu('creditsAdded') 
      });

      setRedeemCode('');
      refreshCredits();
      fetchTransfers();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : tu('unknownError');
      toast({ title: tu('redeemError'), description: errorMessage, variant: 'destructive' });
    } finally {
      setRedeeming(false);
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
        throw new Error(data.error || tu('processTransferError'));
      }

      toast({ 
        title: action === 'accept' ? tu('creditsReceived') : tu('transferDeclined'),
        description: action === 'accept' 
          ? tu('creditsAdded') 
          : tu('transferWasDeclined') 
      });

      refreshCredits();
      fetchTransfers();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : tu('unknownError');
      toast({ title: tu('error'), description: errorMessage, variant: 'destructive' });
    } finally {
      setProcessing(false);
      setConfirmTransferId(null);
      setConfirmAction(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />{tu('pending')}</Badge>;
      case 'accepted':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />{tu('accepted')}</Badge>;
      case 'rejected':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />{tu('rejected')}</Badge>;
      case 'expired':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />{tu('expired')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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
              {confirmAction === 'accept' ? tu('acceptCredits') : tu('rejectTransfer')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'accept' 
                ? tu('willAddCredits')
                : tu('willCancelTransfer')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>{tu('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmTransferId && confirmAction && handleTransferAction(confirmTransferId, confirmAction)}
              disabled={processing}
              className={confirmAction === 'reject' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {confirmAction === 'accept' ? tu('accept') : tu('reject')}
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
            <h3 className="font-semibold text-lg">{tu('transferCredits')}</h3>
            <p className="text-sm text-muted-foreground">
              {tu('transferSubtitle')}
            </p>
          </div>
        </div>

        <Tabs defaultValue="send" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="send" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              {tu('send')}
            </TabsTrigger>
            <TabsTrigger value="received" className="flex items-center gap-2 relative">
              <Inbox className="w-4 h-4" />
              {tu('received')}
              {receivedTransfers.length > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {receivedTransfers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="redeem" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              {tu('redeem')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="space-y-4">
            {/* Note: Only package credits can be transferred, not subscription credits */}
            {totalAvailable === 0 ? (
              <div className="text-center py-8">
                <Gift className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {tu('noPackageCredits')}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {tu('creatorNote')}
                </p>
              </div>
            ) : generatedCode ? (
              // Mostrar código gerado com opções de compartilhamento
              <div className="space-y-4">
                <div className="text-center p-6 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5">
                  <Gift className="w-10 h-10 text-primary mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-2">{tu('transferCodeLabel')}</p>
                  <code className="text-2xl font-mono font-bold text-primary block mb-4">
                    {generatedCode}
                  </code>
                  
                  {/* Botão principal de copiar */}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => copyCode(generatedCode)}
                    className="mb-4"
                  >
                    {copiedCode ? <CheckCircle className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                    {tu('copyCode')}
                  </Button>
                  
                  {/* Redes Sociais */}
                  <p className="text-xs text-muted-foreground mb-3">{tu('shareInvite')}</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => shareWhatsApp(generatedCode)}
                      className="text-[#25D366] border-[#25D366]/50 hover:bg-[#25D366]/10"
                    >
                      <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => shareTelegram(generatedCode)}
                      className="text-[#0088cc] border-[#0088cc]/50 hover:bg-[#0088cc]/10"
                    >
                      <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                      </svg>
                      Telegram
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => shareInstagram(generatedCode)}
                      className="text-[#E4405F] border-[#E4405F]/50 hover:bg-[#E4405F]/10"
                    >
                      <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.757-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                      </svg>
                      Instagram
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => shareFacebook(generatedCode)}
                      className="text-[#1877F2] border-[#1877F2]/50 hover:bg-[#1877F2]/10"
                    >
                      <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook
                    </Button>
                    {typeof navigator !== 'undefined' && navigator.share && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => shareNative(generatedCode)}
                      >
                        <Share2 className="w-4 h-4 mr-1" />
                        {tu('more')}
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  {tu('codeExpiryInvite')}
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setGeneratedCode(null);
                    setMessage('');
                  }}
                >
                  {tu('newCode')}
                </Button>
              </div>
            ) : (
              <>
                {/* Toggle Email / Código */}
                <div className="flex gap-2 mb-4">
                  <Button 
                    variant={shareMode === 'email' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setShareMode('email')}
                    className="flex-1"
                  >
                    <Send className="w-4 h-4 mr-1" />
                    {tu('byEmail')}
                  </Button>
                  <Button 
                    variant={shareMode === 'code' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setShareMode('code')}
                    className="flex-1"
                  >
                    <Link2 className="w-4 h-4 mr-1" />
                    {tu('generateCode')}
                  </Button>
                </div>

                {shareMode === 'email' && (
                  <div className="space-y-2">
                    <Label htmlFor="email">{tu('friendEmail')}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={tu('friendEmailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{tu('availableCredits')}</Label>
                  <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-2xl font-bold text-primary">{totalAvailable}</p>
                    <p className="text-xs text-muted-foreground">{tu('creditsAvailable')}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{tu('transferAmount')}</Label>
                  <div className="text-center p-3 rounded-lg bg-muted/50 border">
                    <p className="text-2xl font-bold">1</p>
                    <p className="text-xs text-muted-foreground">{tu('creditPerTransfer')}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tu('oneSongCode')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">{tu('optionalMessage')}</Label>
                  <Textarea
                    id="message"
                    placeholder={tu('friendMessage')}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="resize-none"
                    rows={2}
                  />
                </div>

                <Button 
                  onClick={handleSendCredits} 
                  disabled={sending || (shareMode === 'email' && !email) || totalAvailable < 1}
                  className="w-full"
                >
                  {sending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{tu('processing')}</>
                  ) : shareMode === 'code' ? (
                    <><Link2 className="w-4 h-4 mr-2" />{tu('generateOneCredit')}</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" />{tu('sendOneCredit')}</>
                  )}
                </Button>

                {/* Sent transfers history */}
                {sentTransfers.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">{tu('sendHistory')}</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {sentTransfers.map((transfer) => (
                        <div key={transfer.id} className="p-3 rounded-lg border bg-muted/30 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{transfer.to_user_email}</span>
                            {getStatusBadge(transfer.status)}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {transfer.credits_amount} {tu('creditsUnit')} {transfer.credit_type} • {format(new Date(transfer.created_at), tu('transferDateFormat'), { locale: ptBR })}
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
                  {tu('noPendingTransfers')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {receivedTransfers.map((transfer) => (
                  <Card key={transfer.id} className="p-4 border-primary/30">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium">
                          {tu('youReceived')} {transfer.credits_amount} {tu('creditsUnit')} {transfer.credit_type}!
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {tu('codeLabel')} {transfer.transfer_code}
                        </p>
                        {transfer.message && (
                          <p className="text-sm mt-2 p-2 rounded bg-muted/50 italic">
                            "{transfer.message}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {tu('expiresOn')} {format(new Date(transfer.expires_at), "dd/MM/yyyy", { locale: ptBR })}
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
                          {tu('accept')}
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
                          {tu('reject')}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Aba Resgatar Código */}
          <TabsContent value="redeem" className="space-y-4">
            <div className="text-center mb-4">
              <Key className="w-10 h-10 text-primary mx-auto mb-2" />
              <h4 className="font-medium">{tu('redeemCreditsCode')}</h4>
              <p className="text-sm text-muted-foreground">
                {tu('redeemHelp')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="redeemCode">{tu('transferCode')}</Label>
              <Input
                id="redeemCode"
                placeholder="TRF-XXXXXXXX"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                className="font-mono text-center text-lg"
              />
            </div>

            <Button 
              onClick={handleRedeemCode} 
              disabled={redeeming || !redeemCode.trim()}
              className="w-full"
            >
              {redeeming ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{tu('redeeming')}</>
              ) : (
                <><Gift className="w-4 h-4 mr-2" />{tu('redeemCredits')}</>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              {tu('codesExpire')}
            </p>
          </TabsContent>
        </Tabs>
      </Card>
    </>
  );
}

export default CreditTransfer;
