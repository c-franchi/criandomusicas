import { useState, useEffect, useCallback, useRef } from "react";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  FileText,
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
  Tag,
  Percent,
  Gift,
  Calendar
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
  DialogFooter,
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
  user_email?: string;
  lyric_title?: string;
}

interface PricingConfig {
  id: string;
  name: string;
  price_display: string;
  price_cents: number;
  price_promo_cents: number | null;
  stripe_price_id: string | null;
  is_active: boolean;
  is_popular: boolean;
}

interface AudioSample {
  id: string;
  title: string;
  description: string;
  style: string;
  occasion: string;
  audio_url: string;
  cover_url: string | null;
  is_active: boolean;
  sort_order: number;
}

interface Voucher {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  plan_ids: string[] | null;
  is_active: boolean;
  created_at: string;
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
  const [configTab, setConfigTab] = useState<'pricing' | 'vouchers' | 'audio'>('pricing');
  
  // Audio Samples
  const [audioSamples, setAudioSamples] = useState<AudioSample[]>([]);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioDialogOpen, setAudioDialogOpen] = useState(false);
  const [editingAudio, setEditingAudio] = useState<AudioSample | null>(null);
  const [newAudio, setNewAudio] = useState<Partial<AudioSample>>({
    title: '',
    description: '',
    style: '',
    occasion: '',
    audio_url: '',
    cover_url: '',
    is_active: true,
    sort_order: 0
  });
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Vouchers
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [newVoucher, setNewVoucher] = useState<Partial<Voucher>>({
    code: '',
    discount_type: 'percent',
    discount_value: 10,
    max_uses: null,
    valid_until: null,
    plan_ids: null,
    is_active: true
  });
  const [savingVoucher, setSavingVoucher] = useState(false);

  // Confirmation dialogs
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [deleteAudioId, setDeleteAudioId] = useState<string | null>(null);
  const [deleteVoucherId, setDeleteVoucherId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      // Fetch orders with approved lyrics
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          created_at,
          music_type,
          music_style,
          story,
          user_id,
          final_prompt,
          style_prompt,
          approved_lyric_id
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch lyrics titles for orders with approved lyrics
      const ordersWithLyrics = await Promise.all(
        (ordersData || []).map(async (order) => {
          let lyric_title = null;
          if (order.approved_lyric_id) {
            const { data: lyricData } = await supabase
              .from('lyrics')
              .select('title')
              .eq('id', order.approved_lyric_id)
              .maybeSingle();
            lyric_title = lyricData?.title;
          }
          return { ...order, lyric_title };
        })
      );

      setOrders(ordersWithLyrics);
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
      setNewVoucher({ code: '', discount_type: 'percent', discount_value: 10, max_uses: null, valid_until: null, plan_ids: null, is_active: true });
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

  useEffect(() => {
    if (isAdmin) {
      fetchOrders();
      fetchPricing();
      fetchAudioSamples();
      fetchVouchers();
    }
  }, [isAdmin, fetchOrders, fetchPricing, fetchAudioSamples, fetchVouchers]);

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

  // Upload audio file to storage
  const handleAudioUpload = async (file: File) => {
    if (!file) return;
    setUploadingAudio(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `audios/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-samples')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('audio-samples')
        .getPublicUrl(filePath);

      const audioUrl = publicUrlData.publicUrl;

      if (editingAudio) {
        setEditingAudio({ ...editingAudio, audio_url: audioUrl });
      } else {
        setNewAudio({ ...newAudio, audio_url: audioUrl });
      }

      toast({ title: 'Áudio enviado!', description: 'O arquivo foi enviado com sucesso.' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro ao enviar áudio', description: errorMessage, variant: 'destructive' });
    } finally {
      setUploadingAudio(false);
    }
  };

  // Upload cover image to storage
  const handleCoverUpload = async (file: File) => {
    if (!file) return;
    setUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-samples')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('audio-samples')
        .getPublicUrl(filePath);

      const coverUrl = publicUrlData.publicUrl;

      if (editingAudio) {
        setEditingAudio({ ...editingAudio, cover_url: coverUrl });
      } else {
        setNewAudio({ ...newAudio, cover_url: coverUrl });
      }

      toast({ title: 'Capa enviada!', description: 'A imagem foi enviada com sucesso.' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro ao enviar capa', description: errorMessage, variant: 'destructive' });
    } finally {
      setUploadingCover(false);
    }
  };

  const saveAudioSample = async () => {
    try {
      const audioData = editingAudio || newAudio;
      if (!audioData.title || !audioData.audio_url) {
        toast({ title: 'Erro', description: 'Título e URL do áudio são obrigatórios.', variant: 'destructive' });
        return;
      }

      if (editingAudio) {
        const { error } = await supabase
          .from('audio_samples')
          .update({
            title: audioData.title,
            description: audioData.description || '',
            style: audioData.style || '',
            occasion: audioData.occasion || '',
            audio_url: audioData.audio_url,
            cover_url: audioData.cover_url || null,
            is_active: audioData.is_active ?? true,
            sort_order: audioData.sort_order || 0
          })
          .eq('id', editingAudio.id);

        if (error) throw error;
        
        // Update local state immediately
        setAudioSamples(prev => prev.map(a => 
          a.id === editingAudio.id 
            ? { ...a, ...audioData, cover_url: audioData.cover_url || null } as AudioSample
            : a
        ));
        
        toast({ title: 'Áudio atualizado!', description: 'As informações foram salvas.' });
      } else {
        const { data, error } = await supabase
          .from('audio_samples')
          .insert({
            title: audioData.title,
            description: audioData.description || '',
            style: audioData.style || '',
            occasion: audioData.occasion || '',
            audio_url: audioData.audio_url,
            cover_url: audioData.cover_url || null,
            is_active: audioData.is_active ?? true,
            sort_order: audioData.sort_order || 0
          })
          .select()
          .single();

        if (error) throw error;
        
        // Add to local state immediately
        if (data) {
          setAudioSamples(prev => [...prev, data]);
        }
        
        toast({ title: 'Áudio adicionado!', description: 'O novo áudio está disponível.' });
      }

      setAudioDialogOpen(false);
      setEditingAudio(null);
      setNewAudio({ title: '', description: '', style: '', occasion: '', audio_url: '', cover_url: '', is_active: true, sort_order: 0 });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro ao salvar áudio', description: errorMessage, variant: 'destructive' });
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

      // Update local state immediately
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

  const getStatusText = (status: string) => {
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

  const getStatusColor = (status: string) => {
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
    total: orders.length
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
                  <Button variant="outline" size="sm" onClick={() => { fetchPricing(); fetchVouchers(); }} className="flex-1 sm:flex-none text-xs sm:text-sm">
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
                      Gerencie preços, vouchers e áudios de exemplo.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Tabs value={configTab} onValueChange={(v) => setConfigTab(v as any)} className="mt-4">
                    <TabsList className="grid grid-cols-3 w-full">
                      <TabsTrigger value="pricing" className="text-xs sm:text-sm">
                        <DollarSign className="w-4 h-4 mr-1" />
                        Preços
                      </TabsTrigger>
                      <TabsTrigger value="vouchers" className="text-xs sm:text-sm">
                        <Gift className="w-4 h-4 mr-1" />
                        Vouchers
                      </TabsTrigger>
                      <TabsTrigger value="audio" className="text-xs sm:text-sm">
                        <Headphones className="w-4 h-4 mr-1" />
                        Áudios
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
                                  <Label>Limite de Usos</Label>
                                  <Input
                                    type="number"
                                    value={(editingVoucher || newVoucher).max_uses || ''}
                                    onChange={(e) => editingVoucher 
                                      ? setEditingVoucher({ ...editingVoucher, max_uses: e.target.value ? parseInt(e.target.value) : null })
                                      : setNewVoucher({ ...newVoucher, max_uses: e.target.value ? parseInt(e.target.value) : null })}
                                    placeholder="Ilimitado"
                                  />
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
                                </div>
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
                                      {voucher.max_uses && ` • ${voucher.current_uses}/${voucher.max_uses} usos`}
                                    </p>
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
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold">Áudios de Exemplo</h3>
                        <Button size="sm" onClick={() => { setEditingAudio(null); setAudioDialogOpen(true); }}>
                          <Plus className="w-4 h-4 mr-1" />
                          Novo Áudio
                        </Button>
                      </div>
                      
                      {loadingAudio ? (
                        <div className="flex items-center justify-center py-8">
                          <Music className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : audioSamples.length === 0 ? (
                        <Card className="p-6 text-center">
                          <Headphones className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                          <p className="text-muted-foreground">Nenhum áudio cadastrado</p>
                        </Card>
                      ) : (
                        <div className="space-y-2">
                          {audioSamples.map((audio) => (
                            <Card key={audio.id} className={`p-3 ${!audio.is_active ? 'opacity-50' : ''}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {audio.cover_url ? (
                                    <img src={audio.cover_url} alt={audio.title} className="w-10 h-10 rounded object-cover" />
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                      <Headphones className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-semibold text-sm">{audio.title}</p>
                                    <p className="text-xs text-muted-foreground">{audio.style} • {audio.occasion}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Badge variant={audio.is_active ? 'default' : 'secondary'} className="text-xs">
                                    {audio.is_active ? 'Ativo' : 'Inativo'}
                                  </Badge>
                                  <Button variant="ghost" size="sm" onClick={() => {
                                    setEditingAudio(audio);
                                    setAudioDialogOpen(true);
                                  }} className="h-8 w-8 p-0">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => setDeleteAudioId(audio.id)} className="h-8 w-8 p-0">
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <Card className="p-3 sm:p-4 bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20 hover:border-green-500/40 transition-colors">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-green-400">{statusCounts.ready}</p>
                <p className="text-[10px] sm:text-sm text-muted-foreground leading-tight">Prontos p/ Produção</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4 bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20 hover:border-yellow-500/40 transition-colors">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-yellow-400">{statusCounts.generating}</p>
                <p className="text-[10px] sm:text-sm text-muted-foreground leading-tight">Em Produção</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Music className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-emerald-400">{statusCounts.completed}</p>
                <p className="text-[10px] sm:text-sm text-muted-foreground leading-tight">Concluídos</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4 bg-gradient-to-br from-primary/10 to-transparent border-primary/20 hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-primary">{statusCounts.total}</p>
                <p className="text-[10px] sm:text-sm text-muted-foreground leading-tight">Total de Pedidos</p>
              </div>
            </div>
          </Card>
        </div>

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
                          <h3 className="font-bold text-sm sm:text-lg truncate">
                            {order.lyric_title || `Música ${order.music_type}`}
                          </h3>
                          <Badge className={`${getStatusColor(order.status)} text-[10px] sm:text-xs shrink-0`}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1">{getStatusText(order.status)}</span>
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {order.music_style} • {order.music_type} • 
                          {new Date(order.created_at).toLocaleDateString('pt-BR')}
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
                          {/* LYRICS section first */}
                          <div className="relative">
                            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 font-semibold">LETRA:</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="absolute top-5 sm:top-6 right-1 sm:right-2 text-[10px] sm:text-xs h-6 sm:h-8 px-1.5 sm:px-2"
                              onClick={() => copyToClipboard(order.final_prompt!, 'Letra')}
                            >
                              <Copy className="w-3 h-3 sm:mr-1" />
                              <span className="hidden sm:inline">Copiar</span>
                            </Button>
                            <pre className="p-2 sm:p-3 bg-muted rounded-lg text-[10px] sm:text-xs overflow-x-auto whitespace-pre-wrap border-l-4 border-primary pr-10 sm:pr-20">
                              {order.final_prompt}
                            </pre>
                          </div>
                          {/* STYLE section second */}
                          {order.style_prompt && (
                            <div className="relative">
                              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 font-semibold">ESTILO:</p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="absolute top-5 sm:top-6 right-1 sm:right-2 text-[10px] sm:text-xs h-6 sm:h-8 px-1.5 sm:px-2"
                                onClick={() => copyToClipboard(order.style_prompt!, 'Estilo')}
                              >
                                <Copy className="w-3 h-3 sm:mr-1" />
                                <span className="hidden sm:inline">Copiar</span>
                              </Button>
                              <pre className="p-2 sm:p-3 bg-muted rounded-lg text-[10px] sm:text-xs overflow-x-auto whitespace-pre-wrap pr-10 sm:pr-20">
                                {order.style_prompt}
                              </pre>
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                    
                    {/* Actions Row */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
                      {order.status === 'LYRICS_APPROVED' && (
                        <Button onClick={() => updateOrderStatus(order.id, 'MUSIC_GENERATING')} size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
                          <PlayCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          Iniciar Produção
                        </Button>
                      )}
                      {order.status === 'MUSIC_GENERATING' && (
                        <Button onClick={() => updateOrderStatus(order.id, 'MUSIC_READY')} size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
                          <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          Marcar Pronta
                        </Button>
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
