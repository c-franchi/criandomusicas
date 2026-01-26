import { useState, useEffect } from "react";
import { useSearchParams, Navigate, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Music, Loader2, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

  const orderId = searchParams.get('order_id');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!orderId || !sessionId || !user) {
        setVerifying(false);
        return;
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke('verify-payment', {
          body: { sessionId, orderId }
        });

        if (fnError) throw fnError;

        if (data?.success) {
          setVerified(true);
          toast({
            title: 'Pagamento confirmado! 🎉',
            description: 'Sua música está sendo processada.',
          });
        } else {
          setError(data?.message || 'Erro ao verificar pagamento');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setError('Erro ao verificar pagamento. Tente novamente.');
      } finally {
        setVerifying(false);
      }
    };

    if (user) {
      verifyPayment();
    }
  }, [orderId, sessionId, user, toast]);

  // Auto-redirect countdown after verification success
  useEffect(() => {
    if (!verified) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [verified, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Music className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!orderId || !sessionId) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="max-w-md w-full p-8 text-center">
        {verifying ? (
          <>
            <Loader2 className="w-16 h-16 text-primary mx-auto mb-6 animate-spin" />
            <h1 className="text-2xl font-bold mb-2">Verificando pagamento...</h1>
            <p className="text-muted-foreground">
              Aguarde enquanto confirmamos seu pagamento.
            </p>
          </>
        ) : verified ? (
          <>
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Pagamento Confirmado! 🎉</h1>
            <p className="text-muted-foreground mb-4">
              Sua música personalizada está sendo criada. Você pode acompanhar o progresso em tempo real.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Redirecionando em {countdown}s...
            </p>
            <div className="space-y-3">
              <Button asChild className="w-full" size="lg">
                <Link to={`/acompanhar/${orderId}`}>
                  <Music className="w-4 h-4 mr-2" />
                  Acompanhar Pedido
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/dashboard">Ver Meus Pedidos</Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Ops! Algo deu errado</h1>
            <p className="text-muted-foreground mb-6">
              {error || 'Não foi possível verificar o pagamento.'}
            </p>
            <div className="space-y-3">
              <Button asChild className="w-full" size="lg">
                <Link to={`/pedido/${orderId}`}>Tentar Novamente</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/dashboard">Voltar ao Dashboard</Link>
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default PaymentSuccess;
