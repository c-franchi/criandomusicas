import { useState, useEffect, useCallback, useRef } from "react";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Copy,
  Archive,
  Trash2,
  Headphones,
  Upload,
  MessageCircle,
  Loader2,
  ImageIcon,
  DollarSign,
  Home
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
import { AdminStatsCards } from "@/components/admin";

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
  has_custom_lyric?: boolean | null;
  instruments?: string[] | null;
  solo_instrument?: string | null;
  solo_moment?: string | null;
  song_title?: string | null;
  cover_url?: string | null;
  pix_receipt_url?: string | null;
  pix_rejection_reason?: string | null;
  amount?: number;
  purpose?: string;
  emotion?: string;
  voice_type?: string;
  audio_input_id?: string | null;
  audio_input_url?: string | null;
  // Track versions uploaded
  uploadedVersions?: number[];
}

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole(user?.id);
  const { toast } = useToast();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Music upload - now supports two versions per order
  const [uploadingMusic, setUploadingMusic] = useState<string | null>(null);
  const musicInputV1Refs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const musicInputV2Refs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Confirmation dialogs
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  
  // PIX confirmation loading
  const [confirmingPix, setConfirmingPix] = useState<string | null>(null);
  
  // PIX rejection
  const [rejectingPix, setRejectingPix] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectUserId, setRejectUserId] = useState<string | null>(null);
  
  // Cover generation loading
  const [generatingCover, setGeneratingCover] = useState<string | null>(null);

  // PIX Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<AdminOrder | null>(null);

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
          has_custom_lyric,
          instruments,
          solo_instrument,
          solo_moment,
          song_title,
          cover_url,
          pix_receipt_url,
          pix_rejection_reason,
          amount,
          purpose,
          emotion,
          voice_type,
          audio_input_id
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
          
          // Fetch lyric title - try approved_lyric_id first, otherwise get latest lyric for the order
          if (order.approved_lyric_id) {
            const { data: lyricData } = await supabase
              .from('lyrics')
              .select('title')
              .eq('id', order.approved_lyric_id)
              .maybeSingle();
            lyric_title = lyricData?.title;
          } else {
            // Fallback: get latest lyric title for this order
            const { data: latestLyric } = await supabase
              .from('lyrics')
              .select('title')
              .eq('order_id', order.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            lyric_title = latestLyric?.title;
          }
          
          // Fetch ALL tracks for this order to know which versions are uploaded
          const { data: tracksData } = await supabase
            .from('tracks')
            .select('audio_url, version')
            .eq('order_id', order.id)
            .eq('status', 'READY');
          
          // Get track URL (use version 1 as primary)
          const v1Track = tracksData?.find(t => t.version === 1);
          track_url = v1Track?.audio_url || tracksData?.[0]?.audio_url || null;
          
          // Get uploaded versions array
          const uploadedVersions = tracksData?.map(t => t.version).filter((v): v is number => v !== null) || [];
          
          // Fetch user profile (whatsapp)
          const { data: profileData } = await supabase
            .from('profiles')
            .select('whatsapp, name')
            .eq('user_id', order.user_id)
            .maybeSingle();
          user_whatsapp = profileData?.whatsapp;
          user_name = profileData?.name;
          
          // Get audio input URL if audio mode order
          let audio_input_url = null;
          if (order.audio_input_id) {
            const { data: audioInput } = await supabase
              .from('audio_inputs')
              .select('storage_path')
              .eq('id', order.audio_input_id)
              .maybeSingle();
            if (audioInput?.storage_path) {
              // audio-inputs is a private bucket, use signed URL
              const { data: signedUrlData } = await supabase.storage
                .from('audio-inputs')
                .createSignedUrl(audioInput.storage_path, 3600); // 1 hour expiry
              audio_input_url = signedUrlData?.signedUrl || null;
            }
          }

          return { ...order, lyric_title, track_url, user_whatsapp, user_name, uploadedVersions, audio_input_url };
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

  // Initial fetch
  useEffect(() => {
    if (isAdmin) {
      fetchOrders();
    }
  }, [isAdmin, fetchOrders]);

  // Track whether details accordion is open to pause auto-refresh
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Auto-refresh orders every 30 seconds (pause when accordion is open)
  useEffect(() => {
    if (!isAdmin || detailsOpen) return;
    
    const intervalId = setInterval(() => {
      fetchOrders();
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [isAdmin, fetchOrders, detailsOpen]);

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
      const hasCustomLyric = orderData.has_custom_lyric === true;

      // 2. Get plan from order (source of truth) or fallback to amount-based detection
      const PLAN_CREDITS: Record<string, number> = {
        'single': 1,
        'single_instrumental': 1,
        'single_custom_lyric': 1,
        'package': 3,
        'package_instrumental': 3,
        'subscription': 5,
        'subscription_instrumental': 5,
      };

      let planId = orderData.plan_id;
      
      // Fallback for older orders without plan_id
      if (!planId) {
        const amount = orderData.amount || 0;
        if (amount >= 10990) {
          planId = isInstrumental ? 'subscription_instrumental' : 'subscription';
        } else if (amount >= 9990) {
          planId = isInstrumental ? 'package_instrumental' : 'package';
        } else {
          planId = isInstrumental ? 'single_instrumental' : (hasCustomLyric ? 'single_custom_lyric' : 'single');
        }
      }
      
      const creditsToAdd = PLAN_CREDITS[planId] || 1;
      console.log('PIX Payment - Plan detection:', { savedPlanId: orderData.plan_id, resolvedPlanId: planId, creditsToAdd });
      
      // 3. Create credits for multi-song packages
      if (creditsToAdd > 1) {
        const { error: creditsError } = await supabase
          .from('user_credits')
          .insert({
            user_id: userId,
            plan_id: planId,
            total_credits: creditsToAdd,
            used_credits: 1, // First song is being created now
            is_active: true,
          });
        
        if (creditsError) {
          console.error('Failed to create credits:', creditsError);
          // Continue - don't fail the payment confirmation
        } else {
          console.log('Credits created for PIX payment:', { planId, credits: creditsToAdd });
        }
      }

      // 4. Update payment status to PAID
      // For instrumental OR custom lyric: skip to LYRICS_APPROVED (no AI lyrics needed)
      // For vocal: go to LYRICS_PENDING (start lyrics generation)
      const newStatus = (isInstrumental || hasCustomLyric) ? 'LYRICS_APPROVED' : 'LYRICS_PENDING';
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          payment_status: 'PAID', 
          status: newStatus
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
        } else if (hasCustomLyric) {
          // For custom lyrics (Letra Própria), DO NOT generate lyrics - user already has their own
          // Just wait for user to approve their lyrics at /criar-musica
          console.log('Letra Própria - aguardando aprovação do usuário, não consumindo créditos IA');
          toast({
            title: '📝 Letra Própria',
            description: 'O cliente já forneceu sua própria letra. Aguardando aprovação em /criar-musica.',
            duration: 5000
          });
        } else {
          // For regular vocal music, generate lyrics with AI
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

      // 6. Send PIX confirmation email
      try {
        await supabase.functions.invoke('send-purchase-email', {
          body: {
            email: '', // Will be fetched by edge function using admin API
            userName: '', // Will be fetched by edge function
            userId: userId,
            purchaseType: creditsToAdd > 1 ? 'package' : 'single',
            planName: planId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            amount: orderData.amount || 0,
            currency: orderData.currency || 'BRL',
            orderId: orderId,
            credits: creditsToAdd,
            isInstrumental: isInstrumental,
            paymentMethod: 'pix'
          }
        });
        console.log('PIX confirmation email sent');
      } catch (emailError) {
        console.error('PIX confirmation email error:', emailError);
        // Don't fail the payment confirmation if email fails
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

  // Reject PIX payment
  const rejectPixPayment = async (orderId: string, userId: string, reason: string) => {
    setRejectingPix(orderId);
    try {
      // Update order to rejected status
      const { error } = await supabase
        .from('orders')
        .update({ 
          payment_status: 'PENDING',
          status: 'AWAITING_PAYMENT',
          pix_rejection_reason: reason,
          pix_receipt_url: null // Clear receipt to allow re-upload
        })
        .eq('id', orderId);

      if (error) throw error;

      // Send push notification to user about rejection
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: userId,
            order_id: orderId,
            title: '⚠️ Problema com seu pagamento PIX',
            body: `Motivo: ${reason}. Por favor, tente novamente.`,
            url: `/checkout/${orderId}`
          }
        });
      } catch (pushError) {
        console.error('Push notification error:', pushError);
      }

      toast({
        title: '❌ Pagamento rejeitado',
        description: 'O cliente foi notificado e pode tentar novamente.',
      });

      // Update local state
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { 
          ...o, 
          payment_status: 'PENDING', 
          status: 'AWAITING_PAYMENT',
          pix_rejection_reason: reason,
          pix_receipt_url: null
        } : o
      ));

      setShowRejectDialog(false);
      setRejectionReason('');
      setRejectOrderId(null);
      setRejectUserId(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao rejeitar pagamento',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setRejectingPix(null);
    }
  };

  // Upload music file and mark as ready
  // Version parameter allows uploading V1 and V2 separately
  const handleMusicUpload = async (file: File, order: AdminOrder, version: number = 1) => {
    if (!file) return;
    setUploadingMusic(`${order.id}-v${version}`);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${order.id}-v${version}-${Date.now()}.${fileExt}`;
      const filePath = `${order.user_id}/${fileName}`;

      console.log('Iniciando upload para:', filePath, 'Versão:', version);

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

      // Insert track record with version
      const { error: trackError } = await supabase
        .from('tracks')
        .upsert({
          order_id: order.id,
          audio_url: audioUrl,
          status: 'READY',
          version: version
        }, {
          onConflict: 'order_id,version'
        });

      if (trackError) {
        console.error('Erro ao salvar track:', trackError);
        throw new Error(`Erro ao salvar track: ${trackError.message}`);
      }

      console.log('Track salva com sucesso - Versão:', version);

      // Check if both versions are uploaded
      const { data: allTracks } = await supabase
        .from('tracks')
        .select('version')
        .eq('order_id', order.id)
        .eq('status', 'READY');

      const uploadedVersions = allTracks?.map(t => t.version) || [];
      const hasBothVersions = uploadedVersions.includes(1) && uploadedVersions.includes(2);

      // Update order status to COMPLETED only if both versions are uploaded
      if (hasBothVersions) {
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
              title: '🎵 Suas músicas estão prontas!',
              body: 'As duas versões da sua música foram concluídas. Acesse agora para ouvir e baixar!',
              url: `/pedido/${order.id}`
            }
          });
        } catch (pushError) {
          console.error('Push notification error:', pushError);
        }

        // Send music ready email notification
        try {
          await supabase.functions.invoke('send-music-ready-email', {
            body: {
              userId: order.user_id,
              orderId: order.id,
              songTitle: order.lyric_title || order.song_title,
              musicType: order.music_type,
              isInstrumental: order.is_instrumental
            }
          });
          console.log('Music ready email sent');
        } catch (emailError) {
          console.error('Email notification error:', emailError);
        }

        // Update local state with COMPLETED and both versions
        setOrders(prev => prev.map(o => 
          o.id === order.id ? { ...o, status: 'COMPLETED', track_url: audioUrl, uploadedVersions: [1, 2] } : o
        ));

        toast({
          title: '🎵 Ambas versões enviadas!',
          description: 'O cliente foi notificado que a música está pronta.',
        });
      } else {
        // Only one version uploaded - keep in MUSIC_READY status to allow uploading the other version
        const newStatus = 'MUSIC_READY';
        await supabase
          .from('orders')
          .update({ status: newStatus })
          .eq('id', order.id);
        
        // Update local state with new uploaded versions
        setOrders(prev => prev.map(o => 
          o.id === order.id ? { 
            ...o, 
            status: newStatus, 
            track_url: audioUrl,
            uploadedVersions: uploadedVersions
          } : o
        ));
        
        toast({
          title: `🎵 Versão ${version} enviada!`,
          description: `Falta enviar a Versão ${version === 1 ? 2 : 1} para concluir o pedido.`,
        });
      }
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

  // Generate cover image with DALL-E
  const generateCoverImage = async (orderId: string) => {
    setGeneratingCover(orderId);
    try {
      const { data, error } = await supabase.functions.invoke('generate-cover-image', {
        body: { orderId }
      });

      if (error) throw error;

      if (data?.cover_url) {
        // Update local state
        setOrders(prev => prev.map(o => 
          o.id === orderId ? { ...o, cover_url: data.cover_url } : o
        ));

        toast({
          title: '🎨 Capa gerada com sucesso!',
          description: 'A imagem foi salva no pedido.',
        });
      }
    } catch (error) {
      console.error('Error generating cover:', error);
      toast({
        title: 'Erro ao gerar capa',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setGeneratingCover(null);
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
    toast({ title: `${label} copiado!`, description: 'Pronto para colar na ferramenta de geração' });
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


      {/* PIX Rejection Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={(open) => {
        if (!open) {
          setShowRejectDialog(false);
          setRejectionReason('');
          setRejectOrderId(null);
          setRejectUserId(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Pagamento PIX</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da rejeição. O cliente será notificado e poderá tentar novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason" className="text-sm font-medium">Motivo da Rejeição *</Label>
            <Select value={rejectionReason} onValueChange={setRejectionReason}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Valor incorreto">Valor incorreto</SelectItem>
                <SelectItem value="Comprovante ilegível">Comprovante ilegível</SelectItem>
                <SelectItem value="Comprovante inválido">Comprovante inválido</SelectItem>
                <SelectItem value="Pagamento não identificado">Pagamento não identificado</SelectItem>
                <SelectItem value="Dados do destinatário incorretos">Dados do destinatário incorretos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (rejectOrderId && rejectUserId && rejectionReason) {
                  rejectPixPayment(rejectOrderId, rejectUserId, rejectionReason);
                }
              }} 
              disabled={!rejectionReason || rejectingPix === rejectOrderId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rejectingPix === rejectOrderId ? 'Rejeitando...' : 'Rejeitar Pagamento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PIX Receipt Modal */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              📄 Comprovante de Pagamento PIX
            </DialogTitle>
            <DialogDescription>
              Verifique os dados do comprovante antes de confirmar ou rejeitar o pagamento.
            </DialogDescription>
          </DialogHeader>
          
          {selectedReceiptOrder && (
            <div className="space-y-4">
              {/* Receipt Image */}
              <div className="bg-white p-2 rounded-lg flex justify-center">
                <img 
                  src={selectedReceiptOrder.pix_receipt_url || ''} 
                  alt="Comprovante PIX" 
                  className="max-w-full max-h-[50vh] object-contain rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
              </div>
              
              {/* Order Details */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Valor Esperado:</span>
                  <p className="font-bold text-lg text-primary">
                    R$ {((selectedReceiptOrder.amount || 0) / 100).toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Cliente:</span>
                  <p className="font-medium">{selectedReceiptOrder.user_name || 'Não informado'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Música:</span>
                  <p className="font-medium truncate">
                    {selectedReceiptOrder.song_title || selectedReceiptOrder.lyric_title || selectedReceiptOrder.music_type}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Estilo:</span>
                  <p className="font-medium">{selectedReceiptOrder.music_style}</p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  onClick={() => {
                    if (selectedReceiptOrder.pix_receipt_url) {
                      window.open(selectedReceiptOrder.pix_receipt_url, '_blank');
                    }
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir Original
                </Button>
                <Button
                  onClick={async () => {
                    await confirmPixPayment(selectedReceiptOrder.id, selectedReceiptOrder.user_id);
                    setReceiptModalOpen(false);
                    setSelectedReceiptOrder(null);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={confirmingPix === selectedReceiptOrder.id}
                >
                  {confirmingPix === selectedReceiptOrder.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Confirmar Pagamento
                </Button>
                <Button
                  onClick={() => {
                    setRejectOrderId(selectedReceiptOrder.id);
                    setRejectUserId(selectedReceiptOrder.user_id);
                    setReceiptModalOpen(false);
                    setSelectedReceiptOrder(null);
                    setShowRejectDialog(true);
                  }}
                  variant="destructive"
                  className="flex-1"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Rejeitar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
              <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none text-xs sm:text-sm">
                <Link to="/">
                  <Home className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Home</span>
                </Link>
              </Button>
              
              <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none text-xs sm:text-sm">
                <Link to="/admin/configuracoes">
                  <Settings className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Configurações</span>
                  <span className="sm:hidden">Config</span>
                </Link>
              </Button>
              
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
                          {/* Type Badge - Áudio vs Vocal vs Instrumental vs Letra Própria */}
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] sm:text-xs shrink-0 ${
                              order.has_custom_lyric 
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                : order.is_instrumental 
                                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' 
                                  : order.audio_input_id
                                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                    : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            }`}
                          >
                            {order.has_custom_lyric ? '📝 Letra Própria' : order.is_instrumental ? '🎹 Instrumental' : order.audio_input_id ? '🎙️ Áudio' : '🎤 Vocal'}
                          </Badge>
                          <Badge className={`${getStatusColor(order.status, order.payment_status)} text-[10px] sm:text-xs shrink-0`}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1">{getStatusText(order.status, order.payment_status)}</span>
                          </Badge>
                        </div>
                        {/* Song Title - prominently displayed with copy button */}
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base sm:text-xl text-primary">
                            🎵 {order.song_title || order.lyric_title || `Música ${order.music_type}`}
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-primary/10"
                            onClick={() => copyToClipboard(order.song_title || order.lyric_title || `Música ${order.music_type}`, 'Nome da música')}
                            title="Copiar nome da música"
                          >
                            <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                          </Button>
                        </div>
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
                    
                    {/* Cover Image Preview */}
                    {order.cover_url && (
                      <div className="flex items-center gap-3 p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <img 
                          src={order.cover_url} 
                          alt="Capa da música" 
                          className="w-16 h-16 rounded-lg object-cover shadow-md"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-purple-400">🎨 Capa Gerada</p>
                          <a 
                            href={order.cover_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[10px] text-muted-foreground hover:text-primary truncate block"
                          >
                            Ver em tamanho original
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Audio Input Player - for audio mode orders */}
                    {order.audio_input_id && order.audio_input_url && (
                      <div className="flex items-center gap-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                          <Headphones className="w-5 h-5 text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-green-400 mb-1">🎙️ Áudio do Usuário (referência de voz/ritmo)</p>
                          <audio controls className="w-full h-8" preload="metadata">
                            <source src={order.audio_input_url} />
                          </audio>
                        </div>
                      </div>
                    )}

                    {order.style_prompt && (
                      <details 
                        className="text-xs sm:text-sm"
                        onToggle={(e) => setDetailsOpen((e.target as HTMLDetailsElement).open)}
                      >
                        <summary className="cursor-pointer text-primary hover:underline font-medium">
                          📝 Ver Prompt Final (para geração)
                        </summary>
                        <div className="mt-2 space-y-3">
                          {/* STYLE section for music generation */}
                          <div className="relative">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold">
                                📋 STYLE ({order.style_prompt.length} caracteres)
                              </p>
                              {order.style_prompt.length > 1000 && (
                                <span className="text-[10px] text-red-400">⚠️ Excede 1000 chars</span>
                              )}
                            </div>
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
                          
                          {/* LYRICS section - only for vocal tracks */}
                          {!order.is_instrumental && order.final_prompt && (
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
                        </div>
                      </details>
                    )}
                    
                    {/* PIX Confirmation Alert with Receipt Preview */}
                    {order.payment_status === 'AWAITING_PIX' && (
                      <div className="p-2 sm:p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-yellow-400">Aguardando confirmação do PIX</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              Valor esperado: <strong>R$ {((order.amount || 0) / 100).toFixed(2).replace('.', ',')}</strong>
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button 
                              onClick={() => confirmPixPayment(order.id, order.user_id)} 
                              size="sm" 
                              className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs sm:text-sm"
                              disabled={confirmingPix === order.id}
                            >
                              {confirmingPix === order.id ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              )}
                              <span className="hidden sm:inline">{confirmingPix === order.id ? 'Confirmando...' : 'Confirmar'}</span>
                              <span className="sm:hidden">✓</span>
                            </Button>
                            <Button 
                              onClick={() => {
                                setRejectOrderId(order.id);
                                setRejectUserId(order.user_id);
                                setShowRejectDialog(true);
                              }} 
                              size="sm" 
                              variant="outline"
                              className="border-destructive/50 text-destructive hover:bg-destructive/10 text-xs sm:text-sm"
                            >
                              <AlertCircle className="w-3.5 h-3.5 mr-1" />
                              <span className="hidden sm:inline">Rejeitar</span>
                              <span className="sm:hidden">✕</span>
                            </Button>
                          </div>
                        </div>
                        
                        {/* Order Details for Admin */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 bg-background/30 rounded text-[10px] sm:text-xs">
                          <div>
                            <span className="text-muted-foreground">Tipo:</span>
                            <p className="font-medium">{order.music_type || '-'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Estilo:</span>
                            <p className="font-medium">{order.music_style || '-'}</p>
                          </div>
                          {order.purpose && (
                            <div>
                              <span className="text-muted-foreground">Ocasião:</span>
                              <p className="font-medium">{order.purpose}</p>
                            </div>
                          )}
                          {order.emotion && (
                            <div>
                              <span className="text-muted-foreground">Emoção:</span>
                              <p className="font-medium">{order.emotion}</p>
                            </div>
                          )}
                          {order.voice_type && !order.is_instrumental && (
                            <div>
                              <span className="text-muted-foreground">Voz:</span>
                              <p className="font-medium">{order.voice_type}</p>
                            </div>
                          )}
                        </div>
                        
                        {/* PIX Receipt Preview - Opens Modal */}
                        {order.pix_receipt_url && (
                          <div className="flex items-start gap-3 p-2 bg-background/50 rounded-lg border border-yellow-500/20">
                            <button 
                              onClick={() => {
                                setSelectedReceiptOrder(order);
                                setReceiptModalOpen(true);
                              }}
                              className="shrink-0 focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded-lg"
                            >
                              <img 
                                src={order.pix_receipt_url} 
                                alt="Comprovante PIX" 
                                className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg border-2 border-yellow-500/30 hover:border-yellow-500 transition-colors cursor-pointer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                                }}
                              />
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-yellow-400">📄 Comprovante Enviado</p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Clique na imagem para ampliar e verificar os dados do pagamento.
                              </p>
                              <button 
                                onClick={() => {
                                  setSelectedReceiptOrder(order);
                                  setReceiptModalOpen(true);
                                }}
                                className="text-[10px] text-primary hover:underline mt-1 inline-block"
                              >
                                Ver em tamanho original →
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* No receipt warning */}
                        {!order.pix_receipt_url && (
                          <div className="flex items-center gap-2 p-2 bg-orange-500/10 rounded border border-orange-500/20">
                            <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
                            <p className="text-[10px] sm:text-xs text-orange-400">
                              Cliente não enviou comprovante. Verifique o extrato bancário.
                            </p>
                          </div>
                        )}
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

                            // AUTO-GENERATE COVER: Trigger cover generation in background (non-blocking)
                            if (!order.cover_url) {
                              generateCoverImage(order.id).catch(err => {
                                console.error('Auto cover generation failed:', err);
                                // Non-blocking - don't show error to user
                              });
                              toast({
                                title: '🎬 Produção iniciada!',
                                description: 'Capa sendo gerada automaticamente em segundo plano...',
                              });
                            }
                          }} 
                          size="sm" 
                          className="flex-1 sm:flex-none text-xs sm:text-sm"
                        >
                          <PlayCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          Iniciar Produção
                        </Button>
                      )}
                      {(order.status === 'MUSIC_GENERATING' || order.status === 'MUSIC_READY') && (
                        <>
                          {/* Version 1 Upload */}
                          <input
                            type="file"
                            accept="audio/*"
                            ref={(el) => { musicInputV1Refs.current[order.id] = el; }}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleMusicUpload(file, order, 1);
                            }}
                          />
                          <Button 
                            onClick={() => musicInputV1Refs.current[order.id]?.click()} 
                            size="sm" 
                            className={`flex-1 sm:flex-none text-xs sm:text-sm ${
                              order.uploadedVersions?.includes(1) 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                            disabled={uploadingMusic === `${order.id}-v1`}
                          >
                            {uploadingMusic === `${order.id}-v1` ? (
                              <>
                                <Music className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                                V1...
                              </>
                            ) : order.uploadedVersions?.includes(1) ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                V1 ✓
                              </>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                Versão 1
                              </>
                            )}
                          </Button>
                          
                          {/* Version 2 Upload */}
                          <input
                            type="file"
                            accept="audio/*"
                            ref={(el) => { musicInputV2Refs.current[order.id] = el; }}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleMusicUpload(file, order, 2);
                            }}
                          />
                          <Button 
                            onClick={() => musicInputV2Refs.current[order.id]?.click()} 
                            size="sm" 
                            className={`flex-1 sm:flex-none text-xs sm:text-sm ${
                              order.uploadedVersions?.includes(2) 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : 'bg-purple-600 hover:bg-purple-700'
                            }`}
                            disabled={uploadingMusic === `${order.id}-v2`}
                          >
                            {uploadingMusic === `${order.id}-v2` ? (
                              <>
                                <Music className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                                V2...
                              </>
                            ) : order.uploadedVersions?.includes(2) ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                V2 ✓
                              </>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                Versão 2
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
                      {/* Only show "Marcar Entregue" when both versions are uploaded */}
                      {order.status === 'MUSIC_READY' && order.uploadedVersions?.includes(1) && order.uploadedVersions?.includes(2) && (
                        <Button onClick={() => updateOrderStatus(order.id, 'COMPLETED')} size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
                          <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          Marcar Entregue
                        </Button>
                      )}
                      {/* Generate Cover Button - show when MUSIC_GENERATING or later */}
                      {['MUSIC_GENERATING', 'MUSIC_READY', 'COMPLETED'].includes(order.status) && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => generateCoverImage(order.id)}
                          disabled={generatingCover === order.id}
                          className="flex-1 sm:flex-none text-xs sm:text-sm border-purple-500/50 text-purple-500 hover:bg-purple-500/10"
                        >
                          {generatingCover === order.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                              Gerando...
                            </>
                          ) : order.cover_url ? (
                            <>
                              <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                              Nova Capa
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                              Gerar Capa
                            </>
                          )}
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
                  <div className="flex items-center gap-3">
                    {/* Cover thumbnail */}
                    {order.cover_url ? (
                      <img 
                        src={order.cover_url} 
                        alt="Capa" 
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover shadow-md shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Music className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base truncate">
                        🎵 {order.song_title || order.lyric_title || `Música ${order.music_type}`}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {order.music_style} • {new Date(order.created_at).toLocaleDateString('pt-BR')}
                        {order.user_name && <span className="ml-2">• 👤 {order.user_name}</span>}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={`${getStatusColor(order.status)} text-[10px] sm:text-xs`}>
                        {getStatusText(order.status)}
                      </Badge>
                      {order.track_url && (
                        <Button variant="ghost" size="sm" asChild className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                          <a href={order.track_url} target="_blank" rel="noopener noreferrer" title="Ouvir música">
                            <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" asChild className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                        <Link to={`/pedido/${order.id}`} title="Ver detalhes">
                          <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Link>
                      </Button>
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
