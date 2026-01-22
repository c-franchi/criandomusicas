import { useState, useEffect, useCallback, useRef } from "react";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Music, 
  Search, 
  ExternalLink, 
  RefreshCw, 
  PlayCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  Settings,
  Save,
  DollarSign,
  Copy,
  Archive,
  Trash2,
  Plus,
  Headphones,
  Edit,
  Upload,
  Percent,
  Gift,
  QrCode,
  MessageCircle,
  Video,
  Camera,
  Loader2
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminStatsCards, AudioSampleManager, type AudioSample, type PricingConfig, type Voucher, type PixConfig } from "@/components/admin";
import VideoOrdersManager from "@/components/admin/VideoOrdersManager";
import ReactionVideosManager from "@/components/admin/ReactionVideosManager";

interface AdminOrder {
  id: string;
  status: string;
  created_at: string;
  music_type: string;
  music_style: string;
  story: string;
  user_id: string;
  final_prompt: string | null;
  style_prompt: string | null;
  approved_lyric_id: string | null;
  payment_status?: string;
  payment_method?: string;
  user_email?: string;
  lyric_title?: string;
  track_url?: string | null;
  user_whatsapp?: string | null;
  user_name?: string | null;
  is_instrumental?: boolean | null;
  instruments?: string[] | null;
  solo_instrument?: string | null;
  solo_moment?: string | null;
  song_title?: string | null;
}

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole(user?.id);
  const { toast } = useToast();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [pricingConfigs, setPricingConfigs] = useState<PricingConfig[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configTab, setConfigTab] = useState<'pricing' | 'vouchers' | 'audio' | 'pix' | 'videos' | 'reactions'>('pricing');
  
  // PIX Config
  const [pixConfig, setPixConfig] = useState<PixConfig | null>(null);
  const [loadingPix, setLoadingPix] = useState(false);
  const [savingPix, setSavingPix] = useState(false);
  const [uploadingQrCode, setUploadingQrCode] = useState(false);
  const qrCodeInputRef = useRef<HTMLInputElement>(null);
  
  // Audio Samples
  const [audioSamples, setAudioSamples] = useState<AudioSample[]>([]);
  const [loadingAudio, setLoadingAudio] = useState(false);

  // Vouchers
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [newVoucher, setNewVoucher] = useState<Partial<Voucher & { max_uses_per_user?: number | null }>>({
    code: '',
    discount_type: 'percent',
    discount_value: 10,
    max_uses: null,
    max_uses_per_user: null,
    valid_until: null,
    plan_ids: null,
    is_active: true
  });
  const [savingVoucher, setSavingVoucher] = useState(false);

  // Music upload
  const [uploadingMusic, setUploadingMusic] = useState<string | null>(null);
  const musicInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Confirmation dialogs
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [deleteAudioId, setDeleteAudioId] = useState<string | null>(null);
  const [deleteVoucherId, setDeleteVoucherId] = useState<string | null>(null);
  
  // PIX confirmation loading
  const [confirmingPix, setConfirmingPix] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      // Fetch orders with approved lyrics and payment info
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          payment_status,
          payment_method,
          created_at,
          music_type,
          music_style,
          story,
          user_id,
          final_prompt,
          style_prompt,
          approved_lyric_id,
          is_instrumental,
          instruments,
          solo_instrument,
          solo_moment,
          song_title
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch lyrics titles, tracks, and profiles for each order
      const ordersWithDetails = await Promise.all(
        (ordersData || []).map(async (order) => {
          let lyric_title = null;
          let track_url = null;
          let user_whatsapp = null;
          let user_name = null;
          
          // Fetch lyric title
          if (order.approved_lyric_id) {
            const { data: lyricData } = await supabase
              .from('lyrics')
              .select('title')
              .eq('id', order.approved_lyric_id)
              .maybeSingle();
            lyric_title = lyricData?.title;
          }
          
          // Fetch track URL
          const { data: trackData } = await supabase
            .from('tracks')
            .select('audio_url')
            .eq('order_id', order.id)
            .eq('status', 'READY')
            .maybeSingle();
          track_url = trackData?.audio_url;
          
          // Fetch user profile (whatsapp)
          const { data: profileData } = await supabase
            .from('profiles')
            .select('whatsapp, name')
            .eq('user_id', order.user_id)
            .maybeSingle();
          user_whatsapp = profileData?.whatsapp;
          user_name = profileData?.name;
          
          return { ...order, lyric_title, track_url, user_whatsapp, user_name };
        })
      );

      setOrders(ordersWithDetails);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao carregar pedidos',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoadingOrders(false);
    }
  }, [toast]);

  const fetchPricing = useCallback(async () => {
    setLoadingPricing(true);
    try {
      const { data, error } = await supabase
        .from('pricing_config')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setPricingConfigs(data || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao carregar preços',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoadingPricing(false);
    }
  }, [toast]);

  const fetchAudioSamples = useCallback(async () => {
    setLoadingAudio(true);
    try {
      const { data, error } = await supabase
        .from('audio_samples')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setAudioSamples(data || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao carregar áudios',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoadingAudio(false);
    }
  }, [toast]);

  const fetchVouchers = useCallback(async () => {
    setLoadingVouchers(true);
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVouchers(data || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao carregar vouchers',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoadingVouchers(false);
    }
  }, [toast]);

  const saveVoucher = async () => {
    setSavingVoucher(true);
    try {
      const voucherData = editingVoucher || newVoucher;
      if (!voucherData.code || !voucherData.discount_value) {
        toast({ title: 'Erro', description: 'Código e valor do desconto são obrigatórios.', variant: 'destructive' });
        return;
      }

      if (editingVoucher) {
        const { error } = await supabase
          .from('vouchers')
          .update({
            code: voucherData.code?.toUpperCase(),
            discount_type: voucherData.discount_type,
            discount_value: voucherData.discount_value,
            max_uses: voucherData.max_uses,
            max_uses_per_user: (voucherData as any).max_uses_per_user ?? null,
            valid_until: voucherData.valid_until,
            plan_ids: voucherData.plan_ids,
            is_active: voucherData.is_active ?? true,
          })
          .eq('id', editingVoucher.id);

        if (error) throw error;
        toast({ title: 'Voucher atualizado!', description: 'As alterações foram salvas.' });
      } else {
        const { error } = await supabase
          .from('vouchers')
          .insert({
            code: voucherData.code?.toUpperCase(),
            discount_type: voucherData.discount_type || 'percent',
            discount_value: voucherData.discount_value,
            max_uses: voucherData.max_uses,
            max_uses_per_user: (voucherData as any).max_uses_per_user ?? null,
            valid_until: voucherData.valid_until,
            plan_ids: voucherData.plan_ids,
            is_active: voucherData.is_active ?? true,
            created_by: user?.id,
          });

        if (error) throw error;
        toast({ title: 'Voucher criado!', description: 'O novo voucher está ativo.' });
      }

      setVoucherDialogOpen(false);
      setEditingVoucher(null);
      setNewVoucher({ code: '', discount_type: 'percent', discount_value: 10, max_uses: null, max_uses_per_user: null, valid_until: null, plan_ids: null, is_active: true });
      fetchVouchers();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro ao salvar voucher', description: errorMessage, variant: 'destructive' });
    } finally {
      setSavingVoucher(false);
    }
  };

  const confirmDeleteVoucher = async () => {
    if (!deleteVoucherId) return;
    try {
      const { error } = await supabase
        .from('vouchers')
        .delete()
        .eq('id', deleteVoucherId);

      if (error) throw error;
      toast({ title: 'Voucher apagado', description: 'O voucher foi removido.' });
      setVouchers(prev => prev.filter(v => v.id !== deleteVoucherId));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro ao apagar voucher', description: errorMessage, variant: 'destructive' });
    } finally {
      setDeleteVoucherId(null);
    }
  };

  const fetchPixConfig = useCallback(async () => {
    setLoadingPix(true);
    try {
      const { data, error } = await supabase
        .from('pix_config')
        .select('*')
        .eq('id', 'main')
        .single();

      if (error) throw error;
      setPixConfig(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao carregar config PIX',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoadingPix(false);
    }
  }, [toast]);

  const savePixConfig = async () => {
    if (!pixConfig) return;
    setSavingPix(true);
    try {
      const { error } = await supabase
        .from('pix_config')
        .update({
          pix_key: pixConfig.pix_key,
          pix_name: pixConfig.pix_name,
          qr_code_url: pixConfig.qr_code_url,
          is_active: pixConfig.is_active,
        })
        .eq('id', 'main');

      if (error) throw error;

      toast({
        title: 'Config PIX atualizada!',
        description: 'As novas configurações de PIX estão ativas.',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao salvar config PIX',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSavingPix(false);
    }
  };

  const handleQrCodeUpload = async (file: File) => {
    if (!file) return;
    setUploadingQrCode(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `pix-qrcode-${Date.now()}.${fileExt}`;
      const filePath = `pix/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-samples')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('audio-samples')
        .getPublicUrl(filePath);

      const qrCodeUrl = publicUrlData.publicUrl;

      setPixConfig(prev => prev ? { ...prev, qr_code_url: qrCodeUrl } : null);

      toast({ title: 'QR Code enviado!', description: 'A nova imagem foi salva.' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro ao enviar QR Code', description: errorMessage, variant: 'destructive' });
    } finally {
      setUploadingQrCode(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (isAdmin) {
      fetchOrders();
      fetchPricing();
      fetchAudioSamples();
      fetchVouchers();
      fetchPixConfig();
    }
  }, [isAdmin, fetchOrders, fetchPricing, fetchAudioSamples, fetchVouchers, fetchPixConfig]);

  // Auto-refresh orders every 30 seconds
  useEffect(() => {
    if (!isAdmin) return;
    
    const intervalId = setInterval(() => {
      fetchOrders();
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [isAdmin, fetchOrders]);

  const updatePricingConfig = (id: string, field: keyof PricingConfig, value: any) => {
    setPricingConfigs(prev => prev.map(config => 
      config.id === id ? { ...config, [field]: value } : config
    ));
  };

  const savePricingConfigs = async () => {
    setSavingPricing(true);
    try {
      for (const config of pricingConfigs) {
        // Update price_display based on price_cents
        const priceDisplay = `R$ ${(config.price_cents / 100).toFixed(2).replace('.', ',')}`;
        
        const { error } = await supabase
          .from('pricing_config')
          .update({
            price_display: priceDisplay,
            price_cents: config.price_cents,
            price_promo_cents: config.price_promo_cents,
            stripe_price_id: config.stripe_price_id,
            is_active: config.is_active,
            is_popular: config.is_popular,
          })
          .eq('id', config.id);

        if (error) throw error;
      }

      toast({
        title: 'Preços atualizados!',
        description: 'Os novos preços já estão ativos.',
      });
      
      setConfigDialogOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao salvar preços',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSavingPricing(false);
    }
  };

  const confirmDeleteOrder = async () => {
    if (!deleteOrderId) return;
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', deleteOrderId);

      if (error) throw error;

      toast({
        title: 'Pedido apagado',
        description: 'O pedido foi removido com sucesso.',
      });

      setOrders(prev => prev.filter(o => o.id !== deleteOrderId));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao apagar pedido',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setDeleteOrderId(null);
    }
  };


  const confirmDeleteAudio = async () => {
    if (!deleteAudioId) return;
    try {
      const { error } = await supabase.from('audio_samples').delete().eq('id', deleteAudioId);
      if (error) throw error;
      
      // Remove from local state immediately
      setAudioSamples(prev => prev.filter(a => a.id !== deleteAudioId));
      
      toast({ title: 'Áudio removido!', description: 'O áudio foi excluído com sucesso.' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro ao remover áudio', description: errorMessage, variant: 'destructive' });
    } finally {
      setDeleteAudioId(null);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: "DRAFT" | "AWAITING_PAYMENT" | "PAID" | "BRIEFING_COMPLETE" | "LYRICS_PENDING" | "LYRICS_GENERATED" | "LYRICS_APPROVED" | "MUSIC_GENERATING" | "MUSIC_READY" | "COMPLETED" | "CANCELLED") => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: 'Status atualizado',
        description: `Pedido atualizado para: ${getStatusText(newStatus)}`,
      });

      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status: newStatus } : o
      ));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao atualizar status',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // Confirm PIX payment and auto-generate lyrics/style
  const confirmPixPayment = async (orderId: string, userId: string) => {
    setConfirmingPix(orderId);
    try {
      // 1. Fetch order details for generation
      const { data: orderData, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      const isInstrumental = orderData.is_instrumental === true;

      // 2. Update payment status to PAID
      // For instrumental: skip to LYRICS_APPROVED (ready for music generation)
      // For vocal: go to LYRICS_PENDING (start lyrics generation)
      const { error } = await supabase
        .from('orders')
        .update({ 
          payment_status: 'PAID', 
          status: isInstrumental ? 'LYRICS_APPROVED' : 'LYRICS_PENDING' 
        })
        .eq('id', orderId);

      if (error) throw error;

      // 3. Build briefing from order data
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

      // 4. Trigger automatic generation based on type
      try {
        if (isInstrumental) {
          // For instrumental, skip lyrics and generate style prompt directly
          await supabase.functions.invoke('generate-style-prompt', {
            body: {
              orderId,
              isInstrumental: true,
              briefing
            }
          });
        } else {
          // For vocal music, generate lyrics first
          await supabase.functions.invoke('generate-lyrics', {
            body: {
              orderId,
              story: orderData.story,
              briefing
            }
          });
        }
      } catch (genError: unknown) {
        console.error('Generation error:', genError);
        
        // Check if it's a pronunciation error
        const errorMessage = genError instanceof Error ? genError.message : '';
        const errorBody = (genError as any)?.context?.body;
        let parsedError = '';
        
        if (errorBody) {
          try {
            const parsed = JSON.parse(errorBody);
            parsedError = parsed?.error || '';
          } catch {
            // ignore parse error
          }
        }
        
        if (parsedError.includes('sem pronúncia definida') || 
            parsedError.includes('missingPronunciations') ||
            errorMessage.includes('sem pronúncia definida')) {
          toast({
            title: '⚠️ Pronúncia necessária',
            description: 'Este pedido contém termos especiais (siglas, nomes) que precisam de pronúncia definida. O cliente deve aprovar a letra com as pronúncias na página /criar-musica.',
            variant: 'default',
            duration: 10000
          });
        }
        // Continue - can be regenerated manually
      }

      // 5. Send push notification to user
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: userId,
            order_id: orderId,
            title: '✅ Pagamento PIX confirmado!',
            body: isInstrumental 
              ? 'Seu pagamento foi recebido. Sua música instrumental está sendo preparada!'
              : 'Seu pagamento foi recebido. As letras da sua música estão sendo geradas!',
            url: `/criar-musica?orderId=${orderId}`
          }
        });
      } catch (pushError) {
        console.error('Push notification error:', pushError);
      }

      toast({
        title: '✅ Pagamento confirmado!',
        description: isInstrumental 
          ? 'Prompt de estilo gerado. O cliente foi notificado.'
          : 'Letras em geração automática. O cliente foi notificado.',
      });

      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, payment_status: 'PAID', status: isInstrumental ? 'LYRICS_APPROVED' : 'LYRICS_PENDING' } : o
      ));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao confirmar pagamento',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setConfirmingPix(null);
    }
  };

  // Upload music file and mark as ready
  const handleMusicUpload = async (file: File, order: AdminOrder) => {
    if (!file) return;
    setUploadingMusic(order.id);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${order.id}-${Date.now()}.${fileExt}`;
      const filePath = `${order.user_id}/${fileName}`;

      console.log('Iniciando upload para:', filePath);

      // Upload to storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('music-tracks')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Erro no upload do storage:', uploadError);
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      console.log('Upload concluído:', uploadData);

      const { data: publicUrlData } = supabase.storage
        .from('music-tracks')
        .getPublicUrl(filePath);

      const audioUrl = publicUrlData.publicUrl;
      console.log('URL pública:', audioUrl);

      // Upsert track record
      const { error: trackError } = await supabase
        .from('tracks')
        .upsert({
          order_id: order.id,
          audio_url: audioUrl,
          status: 'READY'
        }, {
          onConflict: 'order_id'
        });

      if (trackError) {
        console.error('Erro ao salvar track:', trackError);
        throw new Error(`Erro ao salvar track: ${trackError.message}`);
      }

      console.log('Track salva com sucesso');

      // Update order status to COMPLETED (Entregue)
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          status: 'COMPLETED',
          music_ready_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (orderError) {
        console.error('Erro ao atualizar status:', orderError);
        throw new Error(`Erro ao atualizar pedido: ${orderError.message}`);
      }

      // Send push notification
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: order.user_id,
            order_id: order.id,
            title: '🎵 Sua música está pronta!',
            body: 'A produção da sua música foi concluída. Acesse agora para ouvir e baixar!',
            url: `/pedido/${order.id}`
          }
        });
      } catch (pushError) {
        console.error('Push notification error:', pushError);
      }

      // Update local state
      setOrders(prev => prev.map(o => 
        o.id === order.id ? { ...o, status: 'COMPLETED', track_url: audioUrl } : o
      ));

      toast({
        title: '🎵 Música enviada!',
        description: 'O cliente foi notificado por push.',
      });
    } catch (error) {
      console.error('Erro completo no upload:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao enviar música';
      toast({
        title: 'Erro ao enviar música',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUploadingMusic(null);
    }
  };

  // Generate WhatsApp link for notifying user
  const getWhatsAppLink = (order: AdminOrder) => {
    if (!order.user_whatsapp) return null;
    const phone = order.user_whatsapp.replace(/\D/g, '');
    const phoneFormatted = phone.startsWith('55') ? phone : `55${phone}`;
    const songTitle = order.lyric_title || 'sua música personalizada';
    const message = encodeURIComponent(
      `🎵 Olá${order.user_name ? ` ${order.user_name.split(' ')[0]}` : ''}! ` +
      `Sua música "${songTitle}" está pronta! 🎉\n\n` +
      `Acesse agora para ouvir e baixar:\n` +
      `${window.location.origin}/pedido/${order.id}\n\n` +
      `Obrigado por escolher a Criando Músicas! 💜`
    );
    return `https://wa.me/${phoneFormatted}?text=${message}`;
  };

  const getStatusText = (status: string, paymentStatus?: string) => {
    // Check for PIX status first
    if (paymentStatus === 'AWAITING_PIX') {
      return 'Aguardando PIX';
    }
    const statusMap: Record<string, string> = {
      'DRAFT': 'Rascunho',
      'AWAITING_PAYMENT': 'Aguardando Pagamento',
      'PAID': 'Pago',
      'BRIEFING_COMPLETE': 'Briefing Completo',
      'LYRICS_PENDING': 'Gerando Letras',
      'LYRICS_GENERATED': 'Letras Geradas',
      'LYRICS_APPROVED': 'Letras Aprovadas',
      'MUSIC_GENERATING': 'Gerando Música',
      'MUSIC_READY': 'Música Pronta',
      'COMPLETED': 'Concluído',
      'CANCELLED': 'Cancelado'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string, paymentStatus?: string) => {
    // Check for PIX status first
    if (paymentStatus === 'AWAITING_PIX') {
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
    switch (status) {
      case 'LYRICS_APPROVED':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'MUSIC_GENERATING':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'MUSIC_READY':
      case 'COMPLETED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'CANCELLED':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'LYRICS_APPROVED':
        return <CheckCircle className="w-4 h-4" />;
      case 'MUSIC_GENERATING':
        return <PlayCircle className="w-4 h-4 animate-pulse" />;
      case 'MUSIC_READY':
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4" />;
      case 'CANCELLED':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Separar pedidos ativos e concluídos
  const activeOrders = orders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status));
  const completedOrders = orders.filter(o => ['COMPLETED', 'CANCELLED'].includes(o.status));

  // Filtrar pedidos
  const filterOrders = (ordersList: AdminOrder[]) => ordersList.filter(order => {
    const matchesSearch = 
      order.lyric_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.music_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.music_style?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.story?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Handle AWAITING_PIX filter
    if (filterStatus === 'AWAITING_PIX') {
      return matchesSearch && order.payment_status === 'AWAITING_PIX';
    }
    
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const filteredActiveOrders = filterOrders(activeOrders);
  const filteredCompletedOrders = filterOrders(completedOrders);

  // Contagens por status
  const statusCounts = {
    ready: orders.filter(o => o.status === 'LYRICS_APPROVED').length,
    generating: orders.filter(o => o.status === 'MUSIC_GENERATING').length,
    completed: completedOrders.length,
    total: orders.length,
    awaitingPix: orders.filter(o => o.payment_status === 'AWAITING_PIX').length
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado!`, description: 'Pronto para colar no Suno/Udio' });
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Music className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground mb-4">
            Você não tem permissão para acessar esta página.
          </p>
          <Button asChild>
            <Link to="/dashboard">Voltar ao Dashboard</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Delete Order Confirmation */}
      <AlertDialog open={!!deleteOrderId} onOpenChange={(open) => !open && setDeleteOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja apagar este pedido? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteOrder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Audio Confirmation */}
      <AlertDialog open={!!deleteAudioId} onOpenChange={(open) => !open && setDeleteAudioId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja apagar este áudio de exemplo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAudio} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Voucher Delete Confirmation */}
      <AlertDialog open={!!deleteVoucherId} onOpenChange={(open) => !open && setDeleteVoucherId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja apagar este voucher?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteVoucher} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center shadow-lg">
                <Music className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-lg sm:text-xl gradient-text">Painel Admin</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Gerenciar produção de músicas</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => { fetchPricing(); fetchVouchers(); fetchPixConfig(); }} className="flex-1 sm:flex-none text-xs sm:text-sm">
                    <Settings className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Configurações</span>
                    <span className="sm:hidden">Config</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Configurações do Sistema
                    </DialogTitle>
                    <DialogDescription>
                      Gerencie preços, vouchers, áudios de exemplo e configurações PIX.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Tabs value={configTab} onValueChange={(v) => setConfigTab(v as any)} className="mt-4">
                    <TabsList className="grid grid-cols-6 w-full">
                      <TabsTrigger value="pricing" className="text-xs sm:text-sm">
                        <DollarSign className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Preços</span>
                      </TabsTrigger>
                      <TabsTrigger value="vouchers" className="text-xs sm:text-sm">
                        <Gift className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Vouchers</span>
                      </TabsTrigger>
                      <TabsTrigger value="audio" className="text-xs sm:text-sm">
                        <Headphones className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Áudios</span>
                      </TabsTrigger>
                      <TabsTrigger value="pix" className="text-xs sm:text-sm">
                        <QrCode className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">PIX</span>
                      </TabsTrigger>
                      <TabsTrigger value="videos" className="text-xs sm:text-sm">
                        <Video className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Vídeos</span>
                      </TabsTrigger>
                      <TabsTrigger value="reactions" className="text-xs sm:text-sm">
                        <Camera className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Reações</span>
                      </TabsTrigger>
                    </TabsList>
                    
                    {/* PRICING TAB */}
                    <TabsContent value="pricing" className="space-y-4 mt-4">
                      {loadingPricing ? (
                        <div className="flex items-center justify-center py-8">
                          <Music className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : (
                        <>
                          {pricingConfigs.map((config) => (
                            <Card key={config.id} className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold">{config.name}</h3>
                                <Badge variant={config.is_active ? "default" : "secondary"}>
                                  {config.is_active ? "Ativo" : "Inativo"}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs">Preço (centavos)</Label>
                                  <Input
                                    type="number"
                                    value={config.price_cents}
                                    onChange={(e) => updatePricingConfig(config.id, 'price_cents', parseInt(e.target.value) || 0)}
                                    className="h-9"
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    = R$ {(config.price_cents / 100).toFixed(2).replace('.', ',')}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-xs">Preço Promo (centavos)</Label>
                                  <Input
                                    type="number"
                                    value={config.price_promo_cents || ''}
                                    onChange={(e) => updatePricingConfig(config.id, 'price_promo_cents', e.target.value ? parseInt(e.target.value) : null)}
                                    className="h-9"
                                  />
                                  {config.price_promo_cents && (
                                    <p className="text-xs text-success">
                                      Promo: R$ {(config.price_promo_cents / 100).toFixed(2).replace('.', ',')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </Card>
                          ))}
                          <Button onClick={savePricingConfigs} className="w-full" disabled={savingPricing}>
                            {savingPricing ? <Music className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            Salvar Preços
                          </Button>
                        </>
                      )}
                    </TabsContent>
                    
                    {/* VOUCHERS TAB */}
                    <TabsContent value="vouchers" className="space-y-4 mt-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold">Cupons de Desconto</h3>
                        <Dialog open={voucherDialogOpen} onOpenChange={(open) => {
                          setVoucherDialogOpen(open);
                          if (!open) {
                            setEditingVoucher(null);
                            setNewVoucher({ code: '', discount_type: 'percent', discount_value: 10, max_uses: null, valid_until: null, plan_ids: null, is_active: true });
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm">
                              <Plus className="w-4 h-4 mr-1" />
                              Novo Voucher
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{editingVoucher ? 'Editar Voucher' : 'Novo Voucher'}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div>
                                <Label>Código *</Label>
                                <Input
                                  value={(editingVoucher || newVoucher).code || ''}
                                  onChange={(e) => editingVoucher 
                                    ? setEditingVoucher({ ...editingVoucher, code: e.target.value.toUpperCase() })
                                    : setNewVoucher({ ...newVoucher, code: e.target.value.toUpperCase() })}
                                  placeholder="DESCONTO10"
                                  className="uppercase"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Tipo de Desconto</Label>
                                  <Select
                                    value={(editingVoucher || newVoucher).discount_type || 'percent'}
                                    onValueChange={(v) => editingVoucher 
                                      ? setEditingVoucher({ ...editingVoucher, discount_type: v })
                                      : setNewVoucher({ ...newVoucher, discount_type: v as any })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="percent">Porcentagem (%)</SelectItem>
                                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Valor *</Label>
                                  <Input
                                    type="number"
                                    value={(editingVoucher || newVoucher).discount_value || ''}
                                    onChange={(e) => editingVoucher 
                                      ? setEditingVoucher({ ...editingVoucher, discount_value: parseInt(e.target.value) || 0 })
                                      : setNewVoucher({ ...newVoucher, discount_value: parseInt(e.target.value) || 0 })}
                                    placeholder={(editingVoucher || newVoucher).discount_type === 'percent' ? '10' : '500'}
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    {(editingVoucher || newVoucher).discount_type === 'percent' 
                                      ? `${(editingVoucher || newVoucher).discount_value || 0}% de desconto`
                                      : `R$ ${(((editingVoucher || newVoucher).discount_value || 0) / 100).toFixed(2).replace('.', ',')} de desconto`}
                                  </p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Quantidade de Vouchers</Label>
                                  <Input
                                    type="number"
                                    value={(editingVoucher || newVoucher).max_uses || ''}
                                    onChange={(e) => editingVoucher 
                                      ? setEditingVoucher({ ...editingVoucher, max_uses: e.target.value ? parseInt(e.target.value) : null })
                                      : setNewVoucher({ ...newVoucher, max_uses: e.target.value ? parseInt(e.target.value) : null })}
                                    placeholder="Ilimitado"
                                    min={1}
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {(editingVoucher || newVoucher).max_uses 
                                      ? `Total disponível: ${(editingVoucher || newVoucher).max_uses} usos`
                                      : 'Sem limite de quantidade'}
                                  </p>
                                </div>
                                <div>
                                  <Label>Uso por Usuário</Label>
                                  <Input
                                    type="number"
                                    value={((editingVoucher || newVoucher) as any).max_uses_per_user || ''}
                                    onChange={(e) => editingVoucher 
                                      ? setEditingVoucher({ ...editingVoucher, max_uses_per_user: e.target.value ? parseInt(e.target.value) : null } as any)
                                      : setNewVoucher({ ...newVoucher, max_uses_per_user: e.target.value ? parseInt(e.target.value) : null })}
                                    placeholder="Ilimitado"
                                    min={1}
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {((editingVoucher || newVoucher) as any).max_uses_per_user 
                                      ? `Cada usuário pode usar ${((editingVoucher || newVoucher) as any).max_uses_per_user}x`
                                      : 'Sem limite por usuário'}
                                  </p>
                                </div>
                              </div>
                              <div>
                                <Label>Válido até</Label>
                                <Input
                                  type="date"
                                  value={(editingVoucher || newVoucher).valid_until?.split('T')[0] || ''}
                                  onChange={(e) => editingVoucher 
                                    ? setEditingVoucher({ ...editingVoucher, valid_until: e.target.value || null })
                                    : setNewVoucher({ ...newVoucher, valid_until: e.target.value || null })}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  {(editingVoucher || newVoucher).valid_until 
                                    ? 'Expira na data definida'
                                    : 'Sem data de expiração'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={(editingVoucher || newVoucher).is_active ?? true}
                                  onCheckedChange={(checked) => editingVoucher 
                                    ? setEditingVoucher({ ...editingVoucher, is_active: checked })
                                    : setNewVoucher({ ...newVoucher, is_active: checked })}
                                />
                                <Label>Voucher ativo</Label>
                              </div>
                              <Button onClick={saveVoucher} className="w-full" disabled={savingVoucher}>
                                {savingVoucher ? <Music className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Salvar
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      
                      {loadingVouchers ? (
                        <div className="flex items-center justify-center py-8">
                          <Music className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : vouchers.length === 0 ? (
                        <Card className="p-6 text-center">
                          <Gift className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                          <p className="text-muted-foreground">Nenhum voucher cadastrado</p>
                        </Card>
                      ) : (
                        <div className="space-y-2">
                          {vouchers.map((voucher) => (
                            <Card key={voucher.id} className={`p-3 ${!voucher.is_active ? 'opacity-50' : ''}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    {voucher.discount_type === 'percent' ? (
                                      <Percent className="w-5 h-5 text-primary" />
                                    ) : (
                                      <DollarSign className="w-5 h-5 text-primary" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-mono font-bold">{voucher.code}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {voucher.discount_type === 'percent' 
                                        ? `${voucher.discount_value}% off`
                                        : `R$ ${(voucher.discount_value / 100).toFixed(2).replace('.', ',')} off`}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      {voucher.max_uses ? (
                                        <Badge variant={voucher.current_uses >= voucher.max_uses ? 'destructive' : 'outline'} className="text-xs">
                                          {voucher.current_uses}/{voucher.max_uses} usos
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-xs">Ilimitado</Badge>
                                      )}
                                      {voucher.valid_until && (
                                        <Badge variant="outline" className="text-xs">
                                          até {new Date(voucher.valid_until).toLocaleDateString('pt-BR')}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Badge variant={voucher.is_active ? 'default' : 'secondary'} className="text-xs">
                                    {voucher.is_active ? 'Ativo' : 'Inativo'}
                                  </Badge>
                                  <Button variant="ghost" size="sm" onClick={() => {
                                    setEditingVoucher(voucher);
                                    setVoucherDialogOpen(true);
                                  }} className="h-8 w-8 p-0">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => setDeleteVoucherId(voucher.id)} className="h-8 w-8 p-0">
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    
                    {/* AUDIO TAB */}
                    <TabsContent value="audio" className="space-y-4 mt-4">
                      <AudioSampleManager
                        audioSamples={audioSamples}
                        setAudioSamples={setAudioSamples}
                        loadingAudio={loadingAudio}
                        onDeleteAudio={(id) => setDeleteAudioId(id)}
                      />
                    </TabsContent>

                    {/* PIX TAB */}
                    <TabsContent value="pix" className="space-y-4 mt-4">
                      {loadingPix ? (
                        <div className="flex items-center justify-center py-8">
                          <Music className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : pixConfig ? (
                        <div className="space-y-4">
                          <Card className="p-4">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                              <QrCode className="w-5 h-5" />
                              Configurações de Pagamento PIX
                            </h3>
                            
                            <div className="space-y-4">
                              <div>
                                <Label>Chave PIX (CNPJ/CPF/Email/Celular)</Label>
                                <Input
                                  value={pixConfig.pix_key}
                                  onChange={(e) => setPixConfig({ ...pixConfig, pix_key: e.target.value })}
                                  placeholder="14.389.841/0001-47"
                                />
                              </div>
                              
                              <div>
                                <Label>Nome do Recebedor</Label>
                                <Input
                                  value={pixConfig.pix_name}
                                  onChange={(e) => setPixConfig({ ...pixConfig, pix_name: e.target.value })}
                                  placeholder="Criando Músicas"
                                />
                              </div>
                              
                              <div>
                                <Label>QR Code PIX</Label>
                                <div className="flex items-start gap-4 mt-2">
                                  {pixConfig.qr_code_url && (
                                    <div className="bg-white p-2 rounded-lg">
                                      <img 
                                        src={pixConfig.qr_code_url} 
                                        alt="QR Code PIX" 
                                        className="w-32 h-32 object-contain"
                                      />
                                    </div>
                                  )}
                                  <div className="flex-1 space-y-2">
                                    <input
                                      ref={qrCodeInputRef}
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => e.target.files?.[0] && handleQrCodeUpload(e.target.files[0])}
                                    />
                                    <Button
                                      variant="outline"
                                      onClick={() => qrCodeInputRef.current?.click()}
                                      disabled={uploadingQrCode}
                                      className="w-full"
                                    >
                                      {uploadingQrCode ? (
                                        <Music className="w-4 h-4 animate-spin mr-2" />
                                      ) : (
                                        <Upload className="w-4 h-4 mr-2" />
                                      )}
                                      {uploadingQrCode ? 'Enviando...' : 'Alterar QR Code'}
                                    </Button>
                                    <p className="text-xs text-muted-foreground">
                                      Envie a imagem do QR Code gerado pelo seu banco.
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2">
                                <Label htmlFor="pix-active">PIX Ativo</Label>
                                <Switch
                                  id="pix-active"
                                  checked={pixConfig.is_active}
                                  onCheckedChange={(checked) => setPixConfig({ ...pixConfig, is_active: checked })}
                                />
                              </div>
                            </div>
                          </Card>

                          <Button onClick={savePixConfig} className="w-full" disabled={savingPix}>
                            {savingPix ? <Music className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            Salvar Configurações PIX
                          </Button>
                        </div>
                      ) : (
                        <Card className="p-6 text-center">
                          <QrCode className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                          <p className="text-muted-foreground">Nenhuma configuração PIX encontrada</p>
                        </Card>
                      )}
                    </TabsContent>

                    {/* VIDEO ORDERS TAB */}
                    <TabsContent value="videos" className="space-y-4 mt-4">
                      <VideoOrdersManager />
                    </TabsContent>

                    {/* REACTION VIDEOS TAB */}
                    <TabsContent value="reactions" className="space-y-4 mt-4">
                      <ReactionVideosManager />
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
              
              <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loadingOrders} className="flex-1 sm:flex-none text-xs sm:text-sm">
                <RefreshCw className={`w-4 h-4 sm:mr-2 ${loadingOrders ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Atualizar</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Stats Cards */}
        <AdminStatsCards statusCounts={statusCounts} />

        {/* Filters */}
        <div className="flex flex-col gap-3 mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, estilo, história..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-card/50 border-border/50 focus:border-primary/50"
            />
          </div>
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
              className="shrink-0 text-xs sm:text-sm px-2.5 sm:px-3"
            >
              Todos
            </Button>
            <Button
              variant={filterStatus === 'LYRICS_APPROVED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('LYRICS_APPROVED')}
              className="shrink-0 text-xs sm:text-sm px-2.5 sm:px-3"
            >
              Prontos
            </Button>
            <Button
              variant={filterStatus === 'MUSIC_GENERATING' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('MUSIC_GENERATING')}
              className="shrink-0 text-xs sm:text-sm px-2.5 sm:px-3"
            >
              Em Produção
            </Button>
            <Button
              variant={filterStatus === 'COMPLETED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('COMPLETED')}
              className="shrink-0 text-xs sm:text-sm px-2.5 sm:px-3"
            >
              Concluídos
            </Button>
            {statusCounts.awaitingPix > 0 && (
              <Button
                variant={filterStatus === 'AWAITING_PIX' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('AWAITING_PIX')}
                className="shrink-0 text-xs sm:text-sm px-2.5 sm:px-3 border-yellow-500/50 text-yellow-500"
              >
                🔔 PIX ({statusCounts.awaitingPix})
              </Button>
            )}
          </div>
        </div>

        {/* Orders Tabs */}
        <Tabs defaultValue="active" className="space-y-3 sm:space-y-4">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:flex bg-card/50 border border-border/50 p-1 h-auto">
            <TabsTrigger value="active" className="text-xs sm:text-sm px-2 sm:px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <span className="sm:hidden">🎯 {filteredActiveOrders.length}</span>
              <span className="hidden sm:inline">🎯 Em Andamento ({filteredActiveOrders.length})</span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs sm:text-sm px-2 sm:px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Archive className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" />
              <span className="hidden sm:inline">Concluídos ({filteredCompletedOrders.length})</span>
              <span className="sm:hidden ml-1">{filteredCompletedOrders.length}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {loadingOrders ? (
              <div className="text-center py-12">
                <Music className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Carregando pedidos...</p>
              </div>
            ) : filteredActiveOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhum pedido em andamento</h3>
              </Card>
            ) : (
              filteredActiveOrders.map((order) => (
                <Card key={order.id} className="p-3 sm:p-5 bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
                  <div className="flex flex-col gap-3 sm:gap-4">
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {/* Type Badge - Vocal vs Instrumental */}
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] sm:text-xs shrink-0 ${
                              order.is_instrumental 
                                ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' 
                                : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            }`}
                          >
                            {order.is_instrumental ? '🎹 Instrumental' : '🎤 Vocal'}
                          </Badge>
                          <Badge className={`${getStatusColor(order.status, order.payment_status)} text-[10px] sm:text-xs shrink-0`}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1">{getStatusText(order.status, order.payment_status)}</span>
                          </Badge>
                        </div>
                        {/* Song Title - prominently displayed */}
                        <h3 className="font-bold text-base sm:text-xl text-primary mb-1">
                          🎵 {order.song_title || order.lyric_title || `Música ${order.music_type}`}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {order.music_style} • {order.music_type} • 
                          {new Date(order.created_at).toLocaleDateString('pt-BR')}
                          {order.user_name && (
                            <span className="ml-2">• 👤 {order.user_name}</span>
                          )}
                          {order.is_instrumental && order.instruments?.length ? (
                            <span className="ml-2 text-purple-400">
                              • 🎵 {order.instruments.slice(0, 3).join(', ')}{order.instruments.length > 3 ? '...' : ''}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    
                    {/* Final Prompt with copy buttons - LYRICS first, then STYLE */}
                    {order.final_prompt && (
                      <details className="text-xs sm:text-sm">
                        <summary className="cursor-pointer text-primary hover:underline font-medium">
                          📝 Ver Prompt Final (para Suno/Udio)
                        </summary>
                        <div className="mt-2 space-y-3">
                          {/* STYLE section - always first for production */}
                          {order.style_prompt && (
                            <div className="relative">
                              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 font-semibold">📋 STYLE (copie primeiro):</p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="absolute top-5 sm:top-6 right-1 sm:right-2 text-[10px] sm:text-xs h-6 sm:h-8 px-1.5 sm:px-2"
                                onClick={() => copyToClipboard(order.style_prompt!, 'Style')}
                              >
                                <Copy className="w-3 h-3 sm:mr-1" />
                                <span className="hidden sm:inline">Copiar Style</span>
                              </Button>
                              <pre className="p-2 sm:p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-[10px] sm:text-xs overflow-x-auto whitespace-pre-wrap pr-10 sm:pr-20">
                                {order.style_prompt}
                              </pre>
                            </div>
                          )}
                          
                          {/* LYRICS section - only for vocal tracks */}
                          {!order.is_instrumental && (
                            <div className="relative">
                              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 font-semibold">🎤 LETRA (copie no campo lyrics):</p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="absolute top-5 sm:top-6 right-1 sm:right-2 text-[10px] sm:text-xs h-6 sm:h-8 px-1.5 sm:px-2"
                                onClick={() => {
                                  // Extract only lyrics from final_prompt (after [Lyrics] tag)
                                  const lyricsMatch = order.final_prompt!.match(/\[Lyrics\]\n?([\s\S]*)/i);
                                  const lyricsOnly = lyricsMatch ? lyricsMatch[1].trim() : order.final_prompt!;
                                  copyToClipboard(lyricsOnly, 'Letra');
                                }}
                              >
                                <Copy className="w-3 h-3 sm:mr-1" />
                                <span className="hidden sm:inline">Copiar Letra</span>
                              </Button>
                              <pre className="p-2 sm:p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-[10px] sm:text-xs overflow-x-auto whitespace-pre-wrap border-l-4 border-l-primary pr-10 sm:pr-20">
                                {/* Show only lyrics portion */}
                                {(() => {
                                  const lyricsMatch = order.final_prompt!.match(/\[Lyrics\]\n?([\s\S]*)/i);
                                  return lyricsMatch ? lyricsMatch[1].trim() : order.final_prompt;
                                })()}
                              </pre>
                            </div>
                          )}
                          
                          {/* For instrumental, show the full prompt */}
                          {order.is_instrumental && (
                            <div className="relative">
                              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 font-semibold">🎹 PROMPT COMPLETO:</p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="absolute top-5 sm:top-6 right-1 sm:right-2 text-[10px] sm:text-xs h-6 sm:h-8 px-1.5 sm:px-2"
                                onClick={() => copyToClipboard(order.final_prompt!, 'Prompt Instrumental')}
                              >
                                <Copy className="w-3 h-3 sm:mr-1" />
                                <span className="hidden sm:inline">Copiar Tudo</span>
                              </Button>
                              <pre className="p-2 sm:p-3 bg-muted rounded-lg text-[10px] sm:text-xs overflow-x-auto whitespace-pre-wrap pr-10 sm:pr-20">
                                {order.final_prompt}
                              </pre>
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                    
                    {/* PIX Confirmation Alert */}
                    {order.payment_status === 'AWAITING_PIX' && (
                      <div className="flex items-center gap-2 p-2 sm:p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-yellow-400">Aguardando confirmação do PIX</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">Verifique o pagamento e confirme manualmente</p>
                        </div>
                        <Button 
                          onClick={() => confirmPixPayment(order.id, order.user_id)} 
                          size="sm" 
                          className="bg-yellow-500 hover:bg-yellow-600 text-black shrink-0 text-xs sm:text-sm"
                          disabled={confirmingPix === order.id}
                        >
                          {confirmingPix === order.id ? (
                            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                          )}
                          <span className="hidden sm:inline">{confirmingPix === order.id ? 'Confirmando...' : 'Confirmar PIX'}</span>
                          <span className="sm:hidden">{confirmingPix === order.id ? '...' : 'Confirmar'}</span>
                        </Button>
                      </div>
                    )}
                    
                    {/* Actions Row */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
                      {order.status === 'LYRICS_APPROVED' && (
                        <Button 
                          onClick={async () => {
                            // For instrumental orders, generate style prompt first if not already generated
                            if (order.is_instrumental && !order.style_prompt) {
                              try {
                                toast({
                                  title: '⏳ Gerando prompt de estilo...',
                                  description: 'Aguarde enquanto preparamos a produção.',
                                });
                                
                                // Fetch full order data for briefing
                                const { data: orderData, error: fetchError } = await supabase
                                  .from('orders')
                                  .select('*')
                                  .eq('id', order.id)
                                  .single();

                                if (fetchError) throw fetchError;

                                const briefing = {
                                  musicType: orderData.music_type || 'homenagem',
                                  style: orderData.music_style || 'pop',
                                  rhythm: orderData.rhythm || 'moderado',
                                  atmosphere: orderData.atmosphere || 'festivo',
                                  instruments: orderData.instruments || [],
                                  soloInstrument: orderData.solo_instrument || null,
                                  soloMoment: orderData.solo_moment || null,
                                  instrumentationNotes: orderData.instrumentation_notes || ''
                                };

                                // Generate style prompt for instrumental
                                const { error: styleError } = await supabase.functions.invoke('generate-style-prompt', {
                                  body: {
                                    orderId: order.id,
                                    isInstrumental: true,
                                    briefing
                                  }
                                });

                                if (styleError) throw styleError;

                                toast({
                                  title: '✅ Prompt gerado com sucesso!',
                                  description: 'Atualizando para produção...',
                                });

                                // Refresh orders to get the updated style_prompt
                                await fetchOrders();
                              } catch (error) {
                                console.error('Error generating style prompt:', error);
                                toast({
                                  title: 'Erro ao gerar prompt',
                                  description: error instanceof Error ? error.message : 'Tente novamente',
                                  variant: 'destructive',
                                });
                                return;
                              }
                            }
                            
                            // Now update status to MUSIC_GENERATING
                            await updateOrderStatus(order.id, 'MUSIC_GENERATING');
                          }} 
                          size="sm" 
                          className="flex-1 sm:flex-none text-xs sm:text-sm"
                        >
                          <PlayCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          Iniciar Produção
                        </Button>
                      )}
                      {order.status === 'MUSIC_GENERATING' && (
                        <>
                          <input
                            type="file"
                            accept="audio/*"
                            ref={(el) => { musicInputRefs.current[order.id] = el; }}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleMusicUpload(file, order);
                            }}
                          />
                          <Button 
                            onClick={() => musicInputRefs.current[order.id]?.click()} 
                            size="sm" 
                            className="flex-1 sm:flex-none text-xs sm:text-sm bg-primary"
                            disabled={uploadingMusic === order.id}
                          >
                            {uploadingMusic === order.id ? (
                              <>
                                <Music className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                Enviar Música
                              </>
                            )}
                          </Button>
                        </>
                      )}
                      {(order.status === 'MUSIC_READY' || order.status === 'COMPLETED') && order.track_url && (
                        <>
                          {getWhatsAppLink(order) && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              asChild 
                              className="flex-1 sm:flex-none text-xs sm:text-sm border-green-500/50 text-green-500 hover:bg-green-500/10"
                            >
                              <a href={getWhatsAppLink(order)!} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                WhatsApp
                              </a>
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            asChild 
                            className="flex-1 sm:flex-none text-xs sm:text-sm"
                          >
                            <a href={order.track_url} target="_blank" rel="noopener noreferrer">
                              <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                              Ouvir
                            </a>
                          </Button>
                        </>
                      )}
                      {order.status === 'MUSIC_READY' && (
                        <Button onClick={() => updateOrderStatus(order.id, 'COMPLETED')} size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
                          <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          Marcar Entregue
                        </Button>
                      )}
                      <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none text-xs sm:text-sm">
                        <Link to={`/pedido/${order.id}`}>
                          <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          Detalhes
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteOrderId(order.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2">
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-3">
            {filteredCompletedOrders.length === 0 ? (
              <Card className="p-6 sm:p-8 text-center bg-card/30">
                <Archive className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Nenhum pedido concluído</h3>
              </Card>
            ) : (
              filteredCompletedOrders.map((order) => (
                <Card key={order.id} className="p-3 sm:p-4 bg-card/30 border-border/30 opacity-80 hover:opacity-100 transition-opacity">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{order.lyric_title || `Música ${order.music_type}`}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {order.music_style} • {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={`${getStatusColor(order.status)} text-[10px] sm:text-xs`}>
                        {getStatusText(order.status)}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteOrderId(order.id)} className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
