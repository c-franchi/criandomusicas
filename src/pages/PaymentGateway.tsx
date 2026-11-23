import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePaymentAccess } from "@/hooks/usePaymentAccess";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  CreditCard,
  QrCode,
  Ticket,
  Loader2,
  CheckCircle2,
  ShoppingBag,
  Music,
} from "lucide-react";

interface OrderInfo {
  id: string;
  music_style: string | null;
  song_title: string | null;
  purpose: string | null;
  amount: number | null;
  payment_status: string | null;
  is_instrumental: boolean | null;
  has_custom_lyric: boolean | null;
}

const PaymentGateway = () => {
  const { t: tu } = useTranslation('uiPayments');
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { pixAvailable, brazilCardAvailable, unavailableReason } = usePaymentAccess();
  const { t, i18n } = useTranslation('checkout');
  const isPt = (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('pt');
  const { toast } = useToast();

  const planIdFromUrl = searchParams.get("planId") || "single";

  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [voucherCode, setVoucherCode] = useState("");
  const [applyingVoucher, setApplyingVoucher] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (!orderId) {
      navigate("/dashboard");
      return;
    }

    const fetchOrder = async () => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("id, music_style, song_title, purpose, amount, payment_status, is_instrumental, has_custom_lyric")
          .eq("id", orderId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          toast({
            title: t("voucherToast.notFound"),
            description: t("voucherToast.notFoundDesc"),
            variant: "destructive",
          });
          navigate("/dashboard");
          return;
        }

        // If already paid, send to dashboard
        if (data.payment_status === "PAID") {
          toast({
            title: t("voucherToast.alreadyPaid"),
            description: t("voucherToast.alreadyPaidDesc"),
          });
          navigate("/dashboard");
          return;
        }

        setOrder(data as OrderInfo);
      } catch (err) {
        console.error("[PaymentGateway] fetch order error:", err);
        toast({
          title: t("voucherToast.loadError"),
          description: tu('tryAgain'),
          variant: "destructive",
        });
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [authLoading, user, orderId, navigate, toast]);

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim() || !orderId) return;
    setApplyingVoucher(true);
    try {
      const { data, error } = await supabase.functions.invoke("apply-voucher", {
        body: {
          code: voucherCode.trim().toUpperCase(),
          orderId,
          planId: planIdFromUrl,
        },
      });

      // Try to extract real backend error message even when invoke throws
      let backendError: string | null = null;
      if (error) {
        try {
          const ctxResp = (error as any)?.context;
          if (ctxResp && typeof ctxResp.json === "function") {
            const body = await ctxResp.json();
            backendError = body?.error || null;
          } else if (ctxResp?.body?.error) {
            backendError = ctxResp.body.error;
          }
        } catch {
          // ignore
        }
      }

      if (data?.success) {
        toast({
          title: t("voucherToast.appliedTitle"),
          description: isPt ? (data.message || t("voucherToast.appliedDesc")) : t("voucherToast.appliedDesc"),
        });
        navigate(`/criar-musica?orderId=${orderId}`);
      } else {
        toast({
          title: t("voucherToast.invalidTitle"),
          description: isPt ? (backendError || data?.error || t("voucherToast.invalidDesc")) : t("voucherToast.invalidDesc"),
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("[PaymentGateway] voucher error:", err);
      let description = t("voucherToast.retry");
      try {
        const ctxResp = err?.context;
        if (ctxResp && typeof ctxResp.json === "function") {
          const body = await ctxResp.json();
          if (body?.error && isPt) description = body.error;
        }
      } catch { /* ignore */ }
      toast({
        title: t("voucherToast.errorTitle"),
        description,
        variant: "destructive",
      });
    } finally {
      setApplyingVoucher(false);
    }
  };

  const goToCardCheckout = () => {
    if (!brazilCardAvailable) return;
    navigate(`/checkout/${orderId}?planId=${planIdFromUrl}`);
  };

  const goToPixCheckout = () => {
    if (!pixAvailable) return;
    navigate(`/checkout/${orderId}?planId=${planIdFromUrl}&method=pix`);
  };

  const goToPlans = () => {
    navigate("/planos");
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 px-4 py-6 sm:py-10">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {tu('gateway.back')}
        </Button>

        <Card className="premium-card">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Music className="h-7 w-7 text-primary" />
              <span className="text-lg font-bold gradient-text">Criando Músicas</span>
            </div>
            <CardTitle className="text-2xl">{tu('gateway.title')}</CardTitle>
            <CardDescription>
              {tu('gateway.description')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Order summary */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{tu('gateway.order')}</span>
                <span className="font-mono">#{order.id.slice(0, 8)}</span>
              </div>
              {order.song_title && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tu('gateway.song')}</span>
                  <span className="font-medium">{order.song_title}</span>
                </div>
              )}
              {order.music_style && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tu('gateway.style')}</span>
                  <span className="font-medium">{order.music_style}</span>
                </div>
              )}
              {order.purpose && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tu('gateway.purpose')}</span>
                  <span className="font-medium">{order.purpose}</span>
                </div>
              )}
            </div>

            {/* Voucher */}
            <div className="space-y-2">
              <Label htmlFor="voucher" className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-primary" />
                {tu('gateway.voucher')}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="voucher"
                  placeholder={tu('gateway.code')}
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  disabled={applyingVoucher}
                  className="uppercase"
                />
                <Button
                  onClick={handleApplyVoucher}
                  disabled={!voucherCode.trim() || applyingVoucher}
                  variant="secondary"
                >
                  {applyingVoucher ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">{tu('gateway.apply')}</span>
                </Button>
              </div>
            </div>

            <Separator />

            {/* Payment options */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                {tu('gateway.payment')}
              </p>

              <Button
                onClick={goToCardCheckout}
                disabled={!brazilCardAvailable}
                className="w-full h-12"
                size="lg"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                {tu('gateway.card')}
              </Button>
              {!brazilCardAvailable && <p role="status" className="text-sm text-muted-foreground">{t(unavailableReason)}</p>}

              {pixAvailable && <Button
                onClick={goToPixCheckout}
                className="w-full h-12"
                size="lg"
                variant="outline"
              >
                <QrCode className="w-5 h-5 mr-2" />
                {tu('gateway.pix')}
              </Button>}

              <Button
                onClick={goToPlans}
                className="w-full h-12"
                size="lg"
                variant="ghost"
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                {tu('gateway.plans')}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground pt-2">
              {tu('gateway.saved')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentGateway;
