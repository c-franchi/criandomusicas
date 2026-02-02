import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tag, CreditCard, CheckCircle, Music, ArrowLeft, Sparkles, Gift, QrCode, Copy, Clock, Upload, ImageIcon, Loader2, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useVIPAccess, bypassPaymentForVIP } from '@/hooks/useVIPAccess';
import { useCredits, getPlanLabel } from '@/hooks/useCredits';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/i18n-format';

interface PixConfigData {
  pix_key: string;
  pix_name: string;
  qr_code_url: string;
  is_active: boolean;
}

interface OrderData {
  id: string;
  user_id: string;
  music_type: string | null;
  music_style: string | null;
  emotion: string | null;
  story: string | null;
  payment_status: string;
  amount: number;
  voucher_code: string | null;
  discount_applied: number;
  payment_method: string | null;
  is_instrumental: boolean | null;
  has_custom_lyric: boolean | null;
}

// Get plan ID from URL params
const getPlanIdFromUrl = (): string => {
  const params = new URLSearchParams(window.location.search);
  return params.get('planId') || 'single';
};

interface VoucherValidation {
  valid: boolean;
  error?: string;
  voucher?: {
    id: string;
    code: string;
    discount_type: string;
    discount_value: number;
  };
  original_price: number;
  discount_amount: number;
  final_price: number;
  is_free: boolean;
}

export default function Checkout() {
  const { t, i18n } = useTranslation(['checkout', 'common']);
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isVIP, loading: vipLoading } = useVIPAccess(user?.id, user?.email || undefined);
  const { hasCredits, totalCredits, activePackage, loading: creditsLoading, refresh: refreshCredits } = useCredits();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [voucherCode, setVoucherCode] = useState('');
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [voucherResult, setVoucherResult] = useState<VoucherValidation | null>(null);
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [processingVIP, setProcessingVIP] = useState(false);
  const [processingCredit, setProcessingCredit] = useState(false);
  const [showPixSection, setShowPixSection] = useState(false);
  const [pixConfirmed, setPixConfirmed] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [pixConfig, setPixConfig] = useState<PixConfigData | null>(null);
  const [currentPlanInfo, setCurrentPlanInfo] = useState<{ id: string; name: string; credits: number } | null>(null);
  
  // PIX Receipt Upload States
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  // Plan labels for display - dynamically translated
  const getPlanLabel = (planId: string): string => {
    const labels: Record<string, string> = {
      'single': t('summary.personalizedMusic'),
      'single_instrumental': t('summary.instrumental'),
      'single_custom_lyric': t('summary.customLyric'),
      'package': t('summary.personalizedMusic'),
      'package_instrumental': t('summary.instrumental'),
      'subscription': t('summary.personalizedMusic'),
      'subscription_instrumental': t('summary.instrumental'),
    };
    return labels[planId] || planId;
  };

  const getPlanCredits = (planId: string): number => {
    const credits: Record<string, number> = {
      'single': 1,
      'single_instrumental': 1,
      'single_custom_lyric': 1,
      'package': 3,
      'package_instrumental': 3,
      'subscription': 5,
      'subscription_instrumental': 5,
    };
    return credits[planId] || 1;
  };

  // Fetch PIX config
  useEffect(() => {
    const fetchPixConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('pix_config')
          .select('*')
          .eq('id', 'main')
          .single();

        if (!error && data) {
          setPixConfig(data);
        }
      } catch (error) {
        console.error('Error fetching PIX config:', error);
      }
    };

    fetchPixConfig();
  }, []);

  // Fetch order data
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId || !user) return;

      try {
        // First fetch the order to determine type
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (error) throw error;

        if (data.user_id !== user.id) {
          toast.error(t('errors.orderNotYours'));
          navigate('/');
          return;
        }

        // If already paid, redirect based on order type
        if (data.payment_status === 'PAID') {
          if (data.is_instrumental) {
            navigate('/dashboard');
          } else {
            navigate(`/criar-musica?orderId=${orderId}`);
          }
          return;
        }

        // If awaiting PIX, show waiting state
        if (data.payment_status === 'AWAITING_PIX') {
          setShowPixSection(true);
          setPixConfirmed(true);
        }

        // Determine correct pricing based on planId from URL
        const urlPlanId = getPlanIdFromUrl();
        let pricingId = urlPlanId;
        
        // Fallback: if planId not set correctly, determine from order type
        if (!pricingId || pricingId === 'single') {
          if (data.has_custom_lyric) {
            pricingId = 'single_custom_lyric';
          } else if (data.is_instrumental) {
            pricingId = 'single_instrumental';
          } else {
            pricingId = 'single';
          }
        }

        // Fetch correct pricing
        const { data: pricingData } = await supabase
          .from('pricing_config')
          .select('price_cents, price_promo_cents, name')
          .eq('id', pricingId)
          .single();
        
        const basePrice = pricingData?.price_promo_cents || pricingData?.price_cents || 1990;

        // Set plan info for display
        setCurrentPlanInfo({
          id: pricingId,
          name: getPlanLabel(pricingId),
          credits: getPlanCredits(pricingId)
        });

        // If amount is 0 or different from expected, update it
        if (data.amount === 0 || data.amount !== basePrice) {
          await supabase.from('orders').update({ amount: basePrice }).eq('id', orderId);
          data.amount = basePrice;
        }

        setOrder(data);
      } catch (error) {
        console.error('Error fetching order:', error);
        toast.error(t('errors.loadingOrder'));
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchOrder();
    }
  }, [orderId, user, authLoading, navigate]);

  // Auto-process VIP access
  useEffect(() => {
    const processVIPAccess = async () => {
      if (!vipLoading && isVIP && order && user && !processingVIP && order.payment_status !== 'AWAITING_PIX') {
        setProcessingVIP(true);
        toast.info(t('toast.vipDetected'));
        
        const success = await bypassPaymentForVIP(order.id, user.id);
        
        if (success) {
          // Fetch full order data to get briefing info
          const { data: orderData } = await supabase
            .from('orders')
            .select('*')
            .eq('id', order.id)
            .single();
            
          if (orderData) {
            const isInstrumental = orderData.is_instrumental === true;
            const hasCustomLyric = orderData.has_custom_lyric === true;
            
            // Build briefing from order data
            const briefing = {
              musicType: orderData.music_type || 'homenagem',
              emotion: orderData.emotion || 'alegria',
              emotionIntensity: orderData.emotion_intensity || 3,
              style: orderData.music_style || 'pop',
              rhythm: orderData.rhythm || 'moderado',
              atmosphere: orderData.atmosphere || 'festivo',
              structure: orderData.music_structure?.split(',') || ['verse', 'chorus'],
              hasMonologue: orderData.has_monologue || false,
              monologuePosition: orderData.monologue_position || 'bridge',
              mandatoryWords: orderData.mandatory_words || '',
              restrictedWords: orderData.restricted_words || '',
              voiceType: orderData.voice_type || 'feminina',
              instruments: orderData.instruments || [],
              soloInstrument: orderData.solo_instrument || null,
              soloMoment: orderData.solo_moment || null,
              instrumentationNotes: orderData.instrumentation_notes || ''
            };

            // Trigger generation based on type
            try {
              if (isInstrumental) {
                // For instrumental, skip lyrics and generate style prompt directly
                await supabase.functions.invoke('generate-style-prompt', {
                  body: {
                    orderId: order.id,
                    isInstrumental: true,
                    briefing
                  }
                });
                toast.success(t('toast.paymentConfirmed'));
                setTimeout(() => navigate('/dashboard'), 1500);
              } else if (hasCustomLyric) {
                // For custom lyrics, redirect to approval page
                toast.success(t('toast.paymentConfirmed'));
                setTimeout(() => navigate(`/criar-musica?orderId=${order.id}`), 1500);
              } else {
                // For vocal music, generate lyrics first
                await supabase.functions.invoke('generate-lyrics', {
                  body: {
                    orderId: order.id,
                    story: orderData.story,
                    briefing
                  }
                });
                toast.success(t('toast.generatingLyrics'));
                setTimeout(() => navigate(`/criar-musica?orderId=${order.id}`), 1500);
              }
            } catch (genError) {
              console.error('VIP generation error:', genError);
              // Still redirect even if generation fails
              if (isInstrumental) {
                navigate('/dashboard');
              } else {
                navigate(`/criar-musica?orderId=${order.id}`);
              }
            }
          } else {
            toast.success(t('toast.paymentConfirmed'));
            setTimeout(() => {
              if (order.is_instrumental) {
                navigate('/dashboard');
              } else {
                navigate(`/criar-musica?orderId=${order.id}`);
              }
            }, 1500);
          }
        } else {
          setProcessingVIP(false);
          toast.error(t('errors.paymentFailed'));
        }
      }
    };

    processVIPAccess();
  }, [isVIP, vipLoading, order, user, navigate, processingVIP]);

  // Calculate effective planId based on order type for universal credits
  const getEffectivePlanId = (): string => {
    if (!order) return currentPlanInfo?.id || 'single';
    
    if (order.has_custom_lyric) return 'single_custom_lyric';
    if (order.is_instrumental) return 'single_instrumental';
    
    return currentPlanInfo?.id || 'single';
  };

  const validateVoucher = async () => {
    if (!voucherCode.trim()) {
      toast.error(t('voucher.placeholder'));
      return;
    }

    setValidatingVoucher(true);
    setVoucherResult(null);

    try {
      const effectivePlanId = getEffectivePlanId();
      const { data, error } = await supabase.functions.invoke('validate-voucher', {
        body: { code: voucherCode, planId: effectivePlanId },
      });

      if (error) throw error;

      setVoucherResult(data);

      if (data.valid) {
        toast.success(t('toast.voucherValid'));
      } else {
        toast.error(data.error || t('voucher.invalid'));
      }
    } catch (error) {
      console.error('Error validating voucher:', error);
      toast.error(t('errors.voucherValidation'));
    } finally {
      setValidatingVoucher(false);
    }
  };

  const applyVoucher = async () => {
    if (!voucherResult?.valid || !order) return;

    setApplyingVoucher(true);

    try {
      const effectivePlanId = getEffectivePlanId();
      const { data, error } = await supabase.functions.invoke('apply-voucher', {
        body: { code: voucherCode, orderId: order.id, planId: effectivePlanId },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);

        if (data.is_free) {
          // For 100% discount, trigger generation automatically based on order type
          const isInstrumental = order.is_instrumental === true;
          const hasCustomLyric = order.has_custom_lyric === true;
          
          // For custom lyrics, redirect directly to CreateSong page for approval
          // The prompt will be generated when the user approves the lyrics there
          if (hasCustomLyric) {
            toast.success(t('toast.voucherApplied'));
            setTimeout(() => {
              navigate(`/criar-musica?orderId=${order.id}`);
            }, 1000);
            return;
          }
          
          toast.info(isInstrumental 
            ? t('toast.preparingInstrumental') 
            : t('toast.generatingLyrics'));
          
          // Fetch full order data for briefing
          const { data: orderData } = await supabase
            .from('orders')
            .select('*')
            .eq('id', order.id)
            .single();

          if (orderData) {
            // Build briefing from order data
            const briefing = {
              musicType: orderData.music_type || 'homenagem',
              emotion: orderData.emotion || 'alegria',
              emotionIntensity: orderData.emotion_intensity || 3,
              style: orderData.music_style || 'pop',
              rhythm: orderData.rhythm || 'moderado',
              atmosphere: orderData.atmosphere || 'festivo',
              structure: orderData.music_structure?.split(',') || ['verse', 'chorus'],
              hasMonologue: orderData.has_monologue || false,
              monologuePosition: orderData.monologue_position || 'bridge',
              mandatoryWords: orderData.mandatory_words || '',
              restrictedWords: orderData.restricted_words || '',
              voiceType: orderData.voice_type || 'feminina',
              instruments: orderData.instruments || [],
              soloInstrument: orderData.solo_instrument || null,
              soloMoment: orderData.solo_moment || null,
              instrumentationNotes: orderData.instrumentation_notes || ''
            };

            // Trigger automatic generation based on type
            try {
              if (isInstrumental) {
                // For instrumental, skip lyrics and generate style prompt directly
                await supabase.functions.invoke('generate-style-prompt', {
                  body: {
                    orderId: order.id,
                    isInstrumental: true,
                    briefing
                  }
                });
              } else {
                // For vocal music, generate lyrics first
                await supabase.functions.invoke('generate-lyrics', {
                  body: {
                    orderId: order.id,
                    story: orderData.story,
                    briefing
                  }
                });
              }
            } catch (genError) {
              console.error('Generation error:', genError);
            }
          }

          setTimeout(() => {
            if (isInstrumental) {
              toast.success(t('toast.preparingInstrumental'));
              navigate('/dashboard');
            } else {
              navigate(`/criar-musica?orderId=${order.id}`);
            }
          }, 1500);
        } else {
          setOrder(prev => prev ? {
            ...prev,
            amount: data.final_price,
            voucher_code: voucherCode,
            discount_applied: data.discount_amount,
          } : null);
          setVoucherResult(null);
          setVoucherCode('');
        }
      } else {
        // Show the specific error from the server
        const errorMsg = data.error || 'Erro ao aplicar voucher';
        toast.error(errorMsg);
        setVoucherResult(null);
        setVoucherCode('');
      }
    } catch (error: any) {
      // Extract error message from response if available
      const errorDetail = error?.message || error?.error || t('errors.voucherApply');
      toast.error(errorDetail);
      console.error('Error applying voucher:', error);
    } finally {
      setApplyingVoucher(false);
    }
  };

  // Handle card payment via Stripe
  const handleCardPayment = async () => {
    if (!order) return;

    setProcessingPayment(true);

    try {
      // Update payment method to card
      await supabase.from('orders').update({ payment_method: 'card' }).eq('id', order.id);

      // Get plan ID from URL or determine based on order type
      let planId = getPlanIdFromUrl();
      if (order.has_custom_lyric) {
        planId = 'single_custom_lyric';
      } else if (order.is_instrumental && !planId.includes('instrumental')) {
        planId = `${planId}_instrumental`;
      }

      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { orderId: order.id, planId },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error(t('errors.paymentFailed'));
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error(t('errors.paymentFailed'));
      setProcessingPayment(false);
    }
  };

  // Handle PIX payment selection
  const handlePixPayment = async () => {
    if (!order) return;

    setShowPixSection(true);

    try {
      // Update order to AWAITING_PIX status
      const { error } = await supabase
        .from('orders')
        .update({
          payment_method: 'pix',
          payment_status: 'AWAITING_PIX'
        })
        .eq('id', order.id);

      if (error) throw error;

      setOrder({
        ...order,
        payment_method: 'pix',
        payment_status: 'AWAITING_PIX'
      });
    } catch (error) {
      console.error('PIX update error:', error);
    }
  };

  // Copy PIX key to clipboard
  const copyPixKey = () => {
    if (!pixConfig) return;
    navigator.clipboard.writeText(pixConfig.pix_key);
    setCopiedKey(true);
    toast.success(t('toast.pixKeyCopied'));
    setTimeout(() => setCopiedKey(false), 3000);
  };

  // Handle receipt file selection
  const handleReceiptSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload receipt and confirm PIX payment
  const confirmWithReceipt = async () => {
    if (!receiptFile || !order || !user) return;
    
    setUploadingReceipt(true);
    
    try {
      // Upload receipt to pix-receipts bucket
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${user.id}/${order.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('pix-receipts')
        .upload(fileName, receiptFile);
      
      if (uploadError) throw uploadError;
      
      // Get signed URL for private bucket (admins access via has_role policy)
      const { data: urlData } = await supabase.storage
        .from('pix-receipts')
        .createSignedUrl(fileName, 60 * 60 * 24 * 30); // 30 days validity
      
      const receiptUrl = urlData?.signedUrl || `pix-receipts/${fileName}`;
      
      // Update order with receipt URL and status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          pix_receipt_url: receiptUrl,
          payment_status: 'AWAITING_PIX',
          payment_method: 'pix',
          pix_rejection_reason: null // Clear any previous rejection
        })
        .eq('id', order.id);
      
      if (updateError) throw updateError;
      
      // Notify admins about new PIX receipt
      try {
        await supabase.functions.invoke('notify-admin-order', {
          body: {
            orderId: order.id,
            userId: user.id,
            orderType: order.is_instrumental ? 'instrumental' : 'vocal',
            userName: 'Cliente',
            musicType: order.music_type || 'personalizada',
            isPixReceipt: true
          }
        });
      } catch (notifyError) {
        console.error('Failed to notify admin:', notifyError);
        // Don't fail the whole request for this
      }
      
      setPixConfirmed(true);
      setShowReceiptUpload(false);
      toast.success(t('toast.receiptSent'));
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast.error(t('errors.receiptUpload'));
    } finally {
      setUploadingReceipt(false);
    }
  };

  // Confirm PIX payment was made - now opens receipt upload modal
  const confirmPixPayment = () => {
    setShowReceiptUpload(true);
  };

  const formatPrice = (cents: number) => {
    return formatCurrency(cents, i18n.language);
  };

  // Handle using credits to pay
  const handleUseCredit = async () => {
    if (!order) return;

    setProcessingCredit(true);

    try {
      const { data, error } = await supabase.functions.invoke('use-credit', {
        body: { orderId: order.id },
      });

      if (error) throw error;

      if (!data.success) {
        if (data.wrong_type) {
          toast.error(data.error);
        } else if (data.needs_purchase) {
          toast.error(t('errors.incompatibleCredits'));
        } else {
          toast.error(data.error || t('errors.creditUse'));
        }
        setProcessingCredit(false);
        return;
      }

      toast.success(t('toast.creditUsed'));

      // CRITICAL: Fetch full order data for generation
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('id', order.id)
        .single();

      const isInstrumental = order.is_instrumental === true;
      const hasCustomLyric = order.has_custom_lyric === true;

      // Build briefing and trigger generation (same logic as Briefing.tsx and VIP flow)
      if (orderData) {
        const briefing = {
          musicType: orderData.music_type || 'homenagem',
          emotion: orderData.emotion || 'alegria',
          emotionIntensity: orderData.emotion_intensity || 3,
          style: orderData.music_style || 'pop',
          rhythm: orderData.rhythm || 'moderado',
          atmosphere: orderData.atmosphere || 'festivo',
          structure: orderData.music_structure?.split(',') || ['verse', 'chorus'],
          hasMonologue: orderData.has_monologue || false,
          monologuePosition: orderData.monologue_position || 'bridge',
          mandatoryWords: orderData.mandatory_words || '',
          restrictedWords: orderData.restricted_words || '',
          voiceType: orderData.voice_type || 'feminina',
          instruments: orderData.instruments || [],
          soloInstrument: orderData.solo_instrument || null,
          soloMoment: orderData.solo_moment || null,
          instrumentationNotes: orderData.instrumentation_notes || ''
        };

        try {
          if (isInstrumental) {
            // Instrumental: generate style prompt directly
            toast.info(t('toast.preparingInstrumental'));
            await supabase.functions.invoke('generate-style-prompt', {
              body: { orderId: order.id, isInstrumental: true, briefing }
            });
            navigate('/dashboard');
            return;
          } else if (hasCustomLyric) {
            // Custom lyric: already has text, go to approval
            navigate(`/criar-musica?orderId=${order.id}`);
            return;
          } else {
            // Vocal: GENERATE LYRICS VIA AI
            toast.info(t('toast.generatingLyrics'));
            await supabase.functions.invoke('generate-lyrics', {
              body: { orderId: order.id, story: orderData.story, briefing }
            });
          }
        } catch (genError) {
          console.error('Credit generation error:', genError);
          // Continue to redirect even if generation fails
        }
      }

      // Redirect based on order type
      if (isInstrumental) {
        navigate('/dashboard');
      } else {
        navigate(`/criar-musica?orderId=${order.id}`);
      }
    } catch (error) {
      console.error('Error using credit:', error);
      toast.error(t('errors.creditUse'));
      setProcessingCredit(false);
    }
  };

  // Universal credits - always compatible
  const isCreditsCompatible = (): boolean => {
    return hasCredits;
  };

  if (authLoading || vipLoading || loading || processingVIP) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Music className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">
            {processingVIP ? t('processingVIP') : t('loading')}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t('orderNotFound')}</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              {t('backToHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPrice = order.amount || 1990;
  const hasDiscount = order.discount_applied > 0;
  const originalPrice = hasDiscount ? (currentPrice + order.discount_applied) : 1990;

  // PIX Waiting State
  if (showPixSection && pixConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-card/50 to-background py-8 px-4">
        <div className="max-w-lg mx-auto">
          <Card className="text-center p-6 premium-card">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{t('pixWaiting.title')}</h2>
            <p className="text-muted-foreground mb-6">
              {t('pixWaiting.description')}
            </p>

            {/* QR Code First */}
            <div className="bg-white p-4 rounded-xl mx-auto w-fit mb-6">
              <img 
                src={pixConfig?.qr_code_url || '/images/pix-qrcode.jpg'} 
                alt="QR Code PIX" 
                className="w-48 h-48 object-contain"
              />
            </div>

            {/* Price and PIX Key */}
            <Card className="p-4 bg-muted/50 mb-6 text-left">
              <div className="mb-4">
                <Label className="text-xs text-muted-foreground">{t('payment.pix.amountToPay')}</Label>
                <div className="flex items-center gap-2">
                  {hasDiscount && (
                    <span className="text-sm text-muted-foreground line-through">{formatPrice(originalPrice)}</span>
                  )}
                  <span className="text-2xl font-bold text-primary">{formatPrice(currentPrice)}</span>
                  {hasDiscount && (
                    <Badge variant="secondary" className="bg-success/20 text-success text-xs">
                      -{formatPrice(order.discount_applied)}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{t('payment.pix.pixKey')}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-background rounded text-sm font-mono">{pixConfig?.pix_key || '14.389.841/0001-47'}</code>
                    <Button variant="outline" size="sm" onClick={copyPixKey}>
                      {copiedKey ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t('payment.pix.name')}</Label>
                  <p className="font-medium">{pixConfig?.pix_name || 'Criando Músicas'}</p>
                </div>
              </div>
            </Card>

            <div className="flex flex-col gap-3">
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('pixWaiting.backToDashboard')}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t('pixWaiting.trackStatus')}
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card/50 to-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">{t('subtitle')}</p>
          </div>
          {/* Plan Badge */}
          {currentPlanInfo && (
            <Badge variant="outline" className="text-sm px-3 py-1 border-primary/50 bg-primary/10">
              {currentPlanInfo.name}
              {currentPlanInfo.credits > 1 && (
                <span className="ml-1 text-muted-foreground">({currentPlanInfo.credits}x)</span>
              )}
            </Badge>
          )}
        </div>

        {/* Order Summary */}
        <Card className="premium-card border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5 text-primary" />
              {t('summary.title')}
              {order.has_custom_lyric && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                  📝 {t('summary.customLyric')}
                </Badge>
              )}
              {order.is_instrumental && !order.has_custom_lyric && (
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                  🎹 {t('summary.instrumental')}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">{t('summary.type')}</p>
                <p className="font-medium">{order.music_type || t('summary.personalizedMusic')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('summary.style')}</p>
                <p className="font-medium">{order.music_style || t('summary.toDefine')}</p>
              </div>
              {order.emotion && (
                <div>
                  <p className="text-muted-foreground">{t('summary.emotion')}</p>
                  <p className="font-medium">{order.emotion}</p>
                </div>
              )}
            </div>

            {order.story && (
              <div className="pt-4 border-t border-border/50">
                <p className="text-muted-foreground text-sm mb-2">
                  {order.has_custom_lyric ? t('summary.yourLyric') : t('summary.story')}
                </p>
                <p className="text-sm line-clamp-3">{order.story}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Credits Payment Option - Show if user has credits */}
        {!showPixSection && hasCredits && !creditsLoading && (
          <Card className="border-2 border-green-500/50 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-green-400" />
                {t('credits.title')}
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 ml-2">
                  {t('credits.available', { count: totalCredits })}
                </Badge>
              </CardTitle>
              <CardDescription>
                {t('credits.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                <Music className="h-5 w-5 text-green-400" />
                <div className="flex-1">
                  <p className="font-medium text-green-400">
                    {activePackage && getPlanLabel(activePackage.plan_id)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('credits.used', { used: activePackage?.used_credits || 0, total: activePackage?.total_credits || 0 })} • 
                    {t('credits.remaining', { remaining: (activePackage?.total_credits || 0) - (activePackage?.used_credits || 0) - 1 })}
                  </p>
                </div>
              </div>
              
              <Button 
                onClick={handleUseCredit} 
                disabled={processingCredit}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white"
              >
                {processingCredit ? (
                  <>
                    <Music className="h-4 w-4 mr-2 animate-spin" />
                    {t('credits.processing')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {t('credits.useButton')}
                  </>
                )}
              </Button>
              
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('credits.orPayBelow')}</p>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Voucher Section - Only show if not in PIX mode */}
        {!showPixSection && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Gift className="h-5 w-5 text-accent" />
                {t('voucher.title')}
              </CardTitle>
              <CardDescription>
                {t('voucher.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasDiscount ? (
                <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg border border-success/30">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium text-success">{t('voucher.applied')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('voucher.code')}: {order.voucher_code} • {t('voucher.discount')}: {formatPrice(order.discount_applied)}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('voucher.placeholder')}
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      className="uppercase"
                      disabled={validatingVoucher || applyingVoucher}
                    />
                    <Button
                      variant="outline"
                      onClick={validateVoucher}
                      disabled={validatingVoucher || !voucherCode.trim()}
                      className="shrink-0"
                    >
                      {validatingVoucher ? (
                        <Music className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Tag className="h-4 w-4 mr-2" />
                          <span>{t('voucher.apply')}</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {voucherResult && (
                    <div className={`p-4 rounded-lg border ${
                      voucherResult.valid 
                        ? 'bg-success/10 border-success/30' 
                        : 'bg-destructive/10 border-destructive/30'
                    }`}>
                      {voucherResult.valid ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-success" />
                            <span className="font-medium text-success">{t('voucher.valid')}</span>
                          </div>
                          <div className="text-sm space-y-1">
                            <p>
                              <span className="text-muted-foreground">{t('voucher.discount')}:</span>{' '}
                              {voucherResult.voucher?.discount_type === 'percent' 
                                ? `${voucherResult.voucher?.discount_value}%`
                                : formatPrice(voucherResult.discount_amount)}
                            </p>
                            <p>
                              <span className="text-muted-foreground">{t('voucher.finalPrice')}:</span>{' '}
                              <span className="font-bold text-lg">
                                {voucherResult.is_free ? t('voucher.free') : formatPrice(voucherResult.final_price)}
                              </span>
                            </p>
                          </div>
                          <Button 
                            onClick={applyVoucher} 
                            disabled={applyingVoucher}
                            className="w-full"
                          >
                            {applyingVoucher ? (
                              <Music className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Sparkles className="h-4 w-4 mr-2" />
                            )}
                            {voucherResult.is_free ? t('voucher.generateFree') : t('voucher.applyDiscount')}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-destructive">{voucherResult.error}</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Section */}
        {!showPixSection && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  {t('payment.title')}
                </span>
                <div className="text-right">
                  {hasDiscount && (
                    <p className="text-sm text-muted-foreground line-through">
                      {formatPrice(1990)}
                    </p>
                  )}
                  <p className="text-2xl font-bold text-primary">
                    {formatPrice(currentPrice)}
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Card Payment */}
              <Button
                onClick={handleCardPayment}
                disabled={processingPayment}
                className="w-full h-14 justify-start gap-4"
                variant="hero"
              >
                {processingPayment ? (
                  <Music className="h-5 w-5 animate-spin" />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )}
                <div className="flex-1 text-left">
                  <p className="font-medium">{t('payment.card.title')}</p>
                  <p className="text-xs opacity-80">{t('payment.card.description')}</p>
                </div>
              </Button>

              {/* PIX Payment */}
              <Button
                onClick={handlePixPayment}
                variant="outline"
                className="w-full h-14 justify-start gap-4 border-2 border-emerald-600/50 hover:border-emerald-600 hover:bg-emerald-600/10"
              >
                <QrCode className="h-5 w-5 text-emerald-600" />
                <div className="flex-1 text-left">
                  <p className="font-medium">{t('payment.pix.title')}</p>
                  <p className="text-xs text-muted-foreground">{t('payment.pix.description')}</p>
                </div>
              </Button>

              {/* PIX Flow Instructions */}
              <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <p className="text-xs text-emerald-400 font-medium mb-1">📋 {t('payment.pix.howItWorks')}</p>
                <ol className="text-[10px] sm:text-xs text-muted-foreground space-y-1">
                  <li>1. {t('payment.pix.step1')}</li>
                  <li>2. {t('payment.pix.step2')}</li>
                  <li>3. <strong>{t('payment.pix.step3')}</strong></li>
                  <li>4. {t('payment.pix.step4')}</li>
                </ol>
              </div>

              <p className="text-xs text-center text-muted-foreground mt-3">
                {t('payment.securePayment')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* PIX Payment Details */}
        {showPixSection && !pixConfirmed && (
          <Card className="border-emerald-600/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-emerald-600" />
                {t('payment.pix.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* QR Code - Clean Display */}
              <div className="text-center">
                <div className="bg-white p-4 rounded-xl mx-auto w-fit mb-3">
                  <img 
                    src={pixConfig?.qr_code_url || '/images/pix-qrcode.jpg'} 
                    alt="QR Code PIX" 
                    className="w-48 h-48 object-contain"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('payment.pix.scanOrCopy')}
                </p>
              </div>

              {/* Price with Discount Display */}
              <Card className="p-4 bg-muted/50">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('payment.pix.amountToPay')}</Label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {hasDiscount && (
                        <span className="text-sm text-muted-foreground line-through">{formatPrice(originalPrice)}</span>
                      )}
                      <span className="text-2xl font-bold text-primary">{formatPrice(currentPrice)}</span>
                      {hasDiscount && (
                        <Badge variant="secondary" className="bg-success/20 text-success text-xs">
                          -{formatPrice(order.discount_applied)}
                        </Badge>
                      )}
                    </div>
                    {hasDiscount && order.voucher_code && (
                      <p className="text-xs text-success mt-1">
                        {t('voucher.applied')} - {order.voucher_code}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('payment.pix.pixKey')}</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 p-2 bg-background rounded text-sm font-mono">{pixConfig?.pix_key || '14.389.841/0001-47'}</code>
                      <Button variant="outline" size="sm" onClick={copyPixKey}>
                        {copiedKey ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('payment.pix.name')}</Label>
                    <p className="font-medium">{pixConfig?.pix_name || 'Criando Músicas'}</p>
                  </div>
                </div>
              </Card>

              <Button className="w-full" onClick={confirmPixPayment}>
                <CheckCircle className="w-4 h-4 mr-2" />
                {t('payment.pix.alreadyPaid')}
              </Button>

              {/* Receipt Upload Modal - ÁREA TODA CLICÁVEL */}
              {showReceiptUpload && (
                <Card className="mt-4 p-4 border-2 border-primary/30 bg-primary/5">
                  <div className="space-y-4">
                    {/* Área clicável para selecionar arquivo */}
                    <div 
                      className={`cursor-pointer rounded-lg border-2 border-dashed p-6 transition-all hover:border-primary/50 hover:bg-primary/10 ${
                        receiptPreview ? 'border-green-500/50' : 'border-muted-foreground/30'
                      }`}
                      onClick={() => receiptInputRef.current?.click()}
                    >
                      <input
                        ref={receiptInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptSelect}
                        className="hidden"
                      />
                      
                      {receiptPreview ? (
                        <div className="flex flex-col items-center gap-3">
                          <img 
                            src={receiptPreview} 
                            alt={t('receipt.title')} 
                            className="max-w-[200px] max-h-[200px] rounded-lg border object-contain"
                          />
                          <p className="text-sm text-muted-foreground">
                            {t('receipt.clickToChange')}
                          </p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="w-10 h-10 mx-auto text-primary mb-3" />
                          <h3 className="font-semibold mb-1">{t('receipt.title')}</h3>
                          <p className="text-sm text-muted-foreground">
                            {t('receipt.description')}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <Button 
                      className="w-full" 
                      onClick={confirmWithReceipt}
                      disabled={!receiptFile || uploadingReceipt}
                    >
                      {uploadingReceipt ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('receipt.uploading')}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {t('receipt.confirm')}
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              )}

              <Button 
                variant="ghost" 
                className="w-full" 
                onClick={() => {
                  setShowPixSection(false);
                  setShowReceiptUpload(false);
                  setReceiptFile(null);
                  setReceiptPreview(null);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('payment.pix.backToOptions')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Security badges */}
        <div className="flex justify-center gap-4">
          <Badge variant="secondary" className="text-xs">
            🔒 {t('badges.secure')}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            ⚡ {t('badges.fast')}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            ✨ {t('badges.premium')}
          </Badge>
        </div>
      </div>
    </div>
  );
}
