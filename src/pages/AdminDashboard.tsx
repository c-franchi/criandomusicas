import { useState, useEffect, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Music, 
  Search, 
  ExternalLink, 
  RefreshCw, 
  PlayCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  FileText
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole(user?.id);
  const { toast } = useToast();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

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

  useEffect(() => {
    if (isAdmin) {
      fetchOrders();
    }
  }, [isAdmin, fetchOrders]);

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

  // Filtrar pedidos
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.lyric_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.music_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.music_style?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.story?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Contagens por status
  const statusCounts = {
    ready: orders.filter(o => o.status === 'LYRICS_APPROVED').length,
    generating: orders.filter(o => o.status === 'MUSIC_GENERATING').length,
    completed: orders.filter(o => o.status === 'COMPLETED' || o.status === 'MUSIC_READY').length,
    total: orders.length
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
            <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loadingOrders}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingOrders ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
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

        {/* Orders List */}
        <div className="space-y-4">
          {loadingOrders ? (
            <div className="text-center py-12">
              <Music className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Carregando pedidos...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card className="p-8 text-center">
              <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum pedido encontrado</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Tente ajustar os filtros de busca'
                  : 'Ainda não há pedidos no sistema'}
              </p>
            </Card>
          ) : (
            filteredOrders.map((order) => (
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
                    {order.story && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {order.story.slice(0, 200)}...
                      </p>
                    )}
                    
                    {/* Final Prompt for admin */}
                    {order.final_prompt && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-primary hover:underline">
                          Ver Prompt Final (para Suno/Udio)
                        </summary>
                        <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                          {order.final_prompt}
                        </pre>
                      </details>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    {/* Action buttons based on status */}
                    {order.status === 'LYRICS_APPROVED' && (
                      <Button 
                        onClick={() => updateOrderStatus(order.id, 'MUSIC_GENERATING')}
                        className="w-full"
                      >
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Iniciar Produção
                      </Button>
                    )}
                    {order.status === 'MUSIC_GENERATING' && (
                      <Button 
                        onClick={() => updateOrderStatus(order.id, 'MUSIC_READY')}
                        className="w-full"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Marcar como Pronta
                      </Button>
                    )}
                    {order.status === 'MUSIC_READY' && (
                      <Button 
                        onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                        className="w-full"
                      >
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
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
