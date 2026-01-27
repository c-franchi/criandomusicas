import { useState, useEffect } from "react";
import { useSearchParams, Navigate, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Music, Loader2, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PaymentSuccess = () => {
  const { t } = useTranslation('checkout');
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
            title: t('toast.paymentConfirmed'),
            description: t('success.confirmedDescription'),
          });
        } else {
          setError(data?.message || t('errors.verificationFailed'));
        }
      } catch (err) {
        console.error('Verification error:', err);
        setError(t('errors.verificationFailed'));
      } finally {
        setVerifying(false);
      }
    };

    if (user) {
      verifyPayment();
    }
  }, [orderId, sessionId, user, toast, t]);

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
          <p className="text-muted-foreground">{t('loading')}</p>
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
            <h1 className="text-2xl font-bold mb-2">{t('success.verifying')}</h1>
            <p className="text-muted-foreground">
              {t('success.verifyingDescription')}
            </p>
          </>
        ) : verified ? (
          <>
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">{t('success.confirmed')} 🎉</h1>
            <p className="text-muted-foreground mb-4">
              {t('success.confirmedDescription')}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {t('success.redirecting', { seconds: countdown })}
            </p>
            <div className="space-y-3">
              <Button asChild className="w-full" size="lg">
                <Link to={`/acompanhar/${orderId}`}>
                  <Music className="w-4 h-4 mr-2" />
                  {t('success.trackOrder')}
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/dashboard">{t('success.viewOrders')}</Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">{t('errors.somethingWrong')}</h1>
            <p className="text-muted-foreground mb-6">
              {error || t('errors.verificationFailed')}
            </p>
            <div className="space-y-3">
              <Button asChild className="w-full" size="lg">
                <Link to={`/pedido/${orderId}`}>{t('errors.tryAgain')}</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/dashboard">{t('errors.backToDashboard')}</Link>
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default PaymentSuccess;
