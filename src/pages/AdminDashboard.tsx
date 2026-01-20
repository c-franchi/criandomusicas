import { useState, useEffect, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Edit
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
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  
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

  useEffect(() => {
    if (isAdmin) {
      fetchOrders();
      fetchPricing();
      fetchAudioSamples();
    }
  }, [isAdmin, fetchOrders, fetchPricing, fetchAudioSamples]);

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
      
      setPricingDialogOpen(false);
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

  const deleteOrder = async (orderId: string) => {
    if (!confirm('Tem certeza que deseja apagar este pedido? Esta ação não pode ser desfeita.')) return;
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: 'Pedido apagado',
        description: 'O pedido foi removido com sucesso.',
      });

      fetchOrders();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao apagar pedido',
        description: errorMessage,
        variant: 'destructive',
      });
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
        toast({ title: 'Áudio atualizado!' });
      } else {
        const { error } = await supabase
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
          });

        if (error) throw error;
        toast({ title: 'Áudio adicionado!' });
      }

      setAudioDialogOpen(false);
      setEditingAudio(null);
      setNewAudio({ title: '', description: '', style: '', occasion: '', audio_url: '', cover_url: '', is_active: true, sort_order: 0 });
      fetchAudioSamples();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro ao salvar áudio', description: errorMessage, variant: 'destructive' });
    }
  };

  const deleteAudioSample = async (id: string) => {
    if (!confirm('Tem certeza que deseja apagar este áudio?')) return;
    try {
      const { error } = await supabase.from('audio_samples').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Áudio removido!' });
      fetchAudioSamples();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro ao remover áudio', description: errorMessage, variant: 'destructive' });
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

      fetchOrders();
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
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Music className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-xl">Painel Admin</h1>
                <p className="text-sm text-muted-foreground">Gerenciar produção de músicas</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={pricingDialogOpen} onOpenChange={setPricingDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => fetchPricing()}>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Gerenciar Preços
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Gerenciar Preços dos Planos
                    </DialogTitle>
                    <DialogDescription>
                      Altere os preços e configurações dos planos. As mudanças serão aplicadas imediatamente.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {loadingPricing ? (
                    <div className="flex items-center justify-center py-8">
                      <Music className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-6 mt-4">
                      {pricingConfigs.map((config) => (
                        <Card key={config.id} className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-lg">{config.name}</h3>
                            <div className="flex gap-2">
                              <Badge variant={config.is_active ? "default" : "secondary"}>
                                {config.is_active ? "Ativo" : "Inativo"}
                              </Badge>
                              {config.is_popular && (
                                <Badge className="bg-primary">Popular</Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Preço (centavos)</Label>
                              <Input
                                type="number"
                                value={config.price_cents}
                                onChange={(e) => updatePricingConfig(config.id, 'price_cents', parseInt(e.target.value) || 0)}
                                placeholder="2990"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                = R$ {(config.price_cents / 100).toFixed(2).replace('.', ',')}
                              </p>
                            </div>
                            
                            <div>
                              <Label>Preço Promocional (centavos)</Label>
                              <Input
                                type="number"
                                value={config.price_promo_cents || ''}
                                onChange={(e) => updatePricingConfig(config.id, 'price_promo_cents', e.target.value ? parseInt(e.target.value) : null)}
                                placeholder="990 (deixe vazio para sem promoção)"
                              />
                              {config.price_promo_cents && (
                                <p className="text-xs text-green-500 mt-1">
                                  Promoção: R$ {(config.price_promo_cents / 100).toFixed(2).replace('.', ',')}
                                </p>
                              )}
                            </div>
                            
                            <div className="col-span-2">
                              <Label>Stripe Price ID (opcional)</Label>
                              <Input
                                value={config.stripe_price_id || ''}
                                onChange={(e) => updatePricingConfig(config.id, 'stripe_price_id', e.target.value || null)}
                                placeholder="price_abc123 (deixe vazio para usar preço dinâmico)"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Se definido, usa o preço fixo do Stripe. Caso contrário, usa o preço configurado acima.
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                      
                      <Button 
                        onClick={savePricingConfigs} 
                        className="w-full"
                        disabled={savingPricing}
                      >
                        {savingPricing ? (
                          <Music className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Salvar Alterações
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
              
              <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loadingOrders}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingOrders ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.ready}</p>
                <p className="text-sm text-muted-foreground">Prontos p/ Produção</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <PlayCircle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.generating}</p>
                <p className="text-sm text-muted-foreground">Em Produção</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Music className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.completed}</p>
                <p className="text-sm text-muted-foreground">Concluídos</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.total}</p>
                <p className="text-sm text-muted-foreground">Total de Pedidos</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, estilo, história..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
            >
              Todos
            </Button>
            <Button
              variant={filterStatus === 'LYRICS_APPROVED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('LYRICS_APPROVED')}
            >
              Prontos
            </Button>
            <Button
              variant={filterStatus === 'MUSIC_GENERATING' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('MUSIC_GENERATING')}
            >
              Em Produção
            </Button>
            <Button
              variant={filterStatus === 'COMPLETED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('COMPLETED')}
            >
              Concluídos
            </Button>
          </div>
        </div>

        {/* Orders Tabs */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">
              🎯 Em Andamento ({filteredActiveOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              <Archive className="w-4 h-4 mr-1" />
              Concluídos ({filteredCompletedOrders.length})
            </TabsTrigger>
            <TabsTrigger value="audio">
              <Headphones className="w-4 h-4 mr-1" />
              Áudios de Exemplo
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
                <Card key={order.id} className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg">
                          {order.lyric_title || `Música ${order.music_type}`}
                        </h3>
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1">{getStatusText(order.status)}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {order.music_style} • {order.music_type} • 
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </p>
                      
                      {/* Final Prompt with copy buttons - LYRICS first, then STYLE */}
                      {order.final_prompt && (
                        <details className="text-sm mt-3">
                          <summary className="cursor-pointer text-primary hover:underline font-medium">
                            📝 Ver Prompt Final (para Suno/Udio)
                          </summary>
                          <div className="mt-2 space-y-3">
                            {/* LYRICS section first */}
                            <div className="relative">
                              <p className="text-xs text-muted-foreground mb-1 font-semibold">LETRA:</p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="absolute top-6 right-2"
                                onClick={() => copyToClipboard(order.final_prompt!, 'Letra')}
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copiar
                              </Button>
                              <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto whitespace-pre-wrap border-l-4 border-primary pr-20">
                                {order.final_prompt}
                              </pre>
                            </div>
                            {/* STYLE section second */}
                            {order.style_prompt && (
                              <div className="relative">
                                <p className="text-xs text-muted-foreground mb-1 font-semibold">ESTILO:</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="absolute top-6 right-2"
                                  onClick={() => copyToClipboard(order.style_prompt!, 'Estilo')}
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copiar
                                </Button>
                                <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto whitespace-pre-wrap pr-20">
                                  {order.style_prompt}
                                </pre>
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      {order.status === 'LYRICS_APPROVED' && (
                        <Button onClick={() => updateOrderStatus(order.id, 'MUSIC_GENERATING')} className="w-full">
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Iniciar Produção
                        </Button>
                      )}
                      {order.status === 'MUSIC_GENERATING' && (
                        <Button onClick={() => updateOrderStatus(order.id, 'MUSIC_READY')} className="w-full">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Marcar como Pronta
                        </Button>
                      )}
                      {order.status === 'MUSIC_READY' && (
                        <Button onClick={() => updateOrderStatus(order.id, 'COMPLETED')} className="w-full">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Marcar como Entregue
                        </Button>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/pedido/${order.id}`}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </Link>
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteOrder(order.id)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Apagar
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {filteredCompletedOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhum pedido concluído</h3>
              </Card>
            ) : (
              filteredCompletedOrders.map((order) => (
                <Card key={order.id} className="p-4 opacity-75">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{order.lyric_title || `Música ${order.music_type}`}</h3>
                      <p className="text-sm text-muted-foreground">
                        {order.music_style} • {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusText(order.status)}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => deleteOrder(order.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="audio" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Áudios de Exemplo</h3>
              <Dialog open={audioDialogOpen} onOpenChange={(open) => {
                setAudioDialogOpen(open);
                if (!open) {
                  setEditingAudio(null);
                  setNewAudio({ title: '', description: '', style: '', occasion: '', audio_url: '', cover_url: '', is_active: true, sort_order: 0 });
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Áudio
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingAudio ? 'Editar Áudio' : 'Adicionar Áudio'}</DialogTitle>
                    <DialogDescription>
                      {editingAudio ? 'Edite as informações do áudio de exemplo.' : 'Adicione um novo áudio de exemplo para a página inicial.'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Título *</Label>
                      <Input
                        value={(editingAudio || newAudio).title || ''}
                        onChange={(e) => editingAudio 
                          ? setEditingAudio({ ...editingAudio, title: e.target.value })
                          : setNewAudio({ ...newAudio, title: e.target.value })}
                        placeholder="Ex: Canção de Aniversário"
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={(editingAudio || newAudio).description || ''}
                        onChange={(e) => editingAudio 
                          ? setEditingAudio({ ...editingAudio, description: e.target.value })
                          : setNewAudio({ ...newAudio, description: e.target.value })}
                        placeholder="Descrição breve do áudio..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Estilo</Label>
                        <Input
                          value={(editingAudio || newAudio).style || ''}
                          onChange={(e) => editingAudio 
                            ? setEditingAudio({ ...editingAudio, style: e.target.value })
                            : setNewAudio({ ...newAudio, style: e.target.value })}
                          placeholder="Ex: Pop, Sertanejo"
                        />
                      </div>
                      <div>
                        <Label>Ocasião</Label>
                        <Input
                          value={(editingAudio || newAudio).occasion || ''}
                          onChange={(e) => editingAudio 
                            ? setEditingAudio({ ...editingAudio, occasion: e.target.value })
                            : setNewAudio({ ...newAudio, occasion: e.target.value })}
                          placeholder="Ex: Casamento, Aniversário"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>URL do Áudio *</Label>
                      <Input
                        value={(editingAudio || newAudio).audio_url || ''}
                        onChange={(e) => editingAudio 
                          ? setEditingAudio({ ...editingAudio, audio_url: e.target.value })
                          : setNewAudio({ ...newAudio, audio_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <Label>URL da Capa (opcional)</Label>
                      <Input
                        value={(editingAudio || newAudio).cover_url || ''}
                        onChange={(e) => editingAudio 
                          ? setEditingAudio({ ...editingAudio, cover_url: e.target.value })
                          : setNewAudio({ ...newAudio, cover_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <Label>Ordem</Label>
                      <Input
                        type="number"
                        value={(editingAudio || newAudio).sort_order || 0}
                        onChange={(e) => editingAudio 
                          ? setEditingAudio({ ...editingAudio, sort_order: parseInt(e.target.value) || 0 })
                          : setNewAudio({ ...newAudio, sort_order: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <Button onClick={saveAudioSample} className="w-full">
                      <Save className="w-4 h-4 mr-2" />
                      Salvar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {loadingAudio ? (
              <div className="text-center py-8">
                <Music className="w-6 h-6 animate-spin text-primary mx-auto" />
              </div>
            ) : audioSamples.length === 0 ? (
              <Card className="p-8 text-center">
                <Headphones className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhum áudio cadastrado</h3>
                <p className="text-muted-foreground">Adicione áudios de exemplo para exibir na página inicial.</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {audioSamples.map((audio) => (
                  <Card key={audio.id} className={`p-4 ${!audio.is_active ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {audio.cover_url ? (
                          <img src={audio.cover_url} alt={audio.title} className="w-12 h-12 rounded object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                            <Headphones className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold">{audio.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {audio.style} • {audio.occasion}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={audio.is_active ? 'default' : 'secondary'}>
                          {audio.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setEditingAudio(audio);
                          setAudioDialogOpen(true);
                        }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteAudioSample(audio.id)}>
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
      </main>
    </div>
  );
};

export default AdminDashboard;