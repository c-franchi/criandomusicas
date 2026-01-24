import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Video,
  Clock,
  CheckCircle,
  Search,
  RefreshCw,
  ExternalLink,
  FileImage,
  FileVideo,
  User,
  Eye,
  Download,
  Upload,
  Send,
  Loader2,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface VideoOrder {
  id: string;
  order_id: string | null;
  user_id: string;
  video_type: string;
  status: string;
  payment_status: string;
  amount: number;
  created_at: string;
  edited_video_url?: string | null;
  edited_video_delivered_at?: string | null;
  user_name?: string | null;
  music_title?: string | null;
  files?: { file_url: string; file_type: string; file_name: string | null }[];
}

const VideoOrdersManager = () => {
  const { toast } = useToast();
  const [videoOrders, setVideoOrders] = useState<VideoOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<VideoOrder | null>(null);
  const [filesDialogOpen, setFilesDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const fetchVideoOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data: ordersData, error } = await supabase
        .from('video_orders')
        .select('*, edited_video_url, edited_video_delivered_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch additional data for each order
      const ordersWithDetails = await Promise.all(
        (ordersData || []).map(async (vo) => {
          let user_name = null;
          let music_title = null;
          let files: { file_url: string; file_type: string; file_name: string | null }[] = [];

          // Fetch user profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name')
            .eq('user_id', vo.user_id)
            .maybeSingle();
          user_name = profileData?.name;

          // Fetch music title from order
          if (vo.order_id) {
            const { data: orderData } = await supabase
              .from('orders')
              .select('approved_lyric_id, music_type')
              .eq('id', vo.order_id)
              .maybeSingle();
            
            if (orderData?.approved_lyric_id) {
              const { data: lyricData } = await supabase
                .from('lyrics')
                .select('title')
                .eq('id', orderData.approved_lyric_id)
                .maybeSingle();
              music_title = lyricData?.title || `Música ${orderData.music_type}`;
            } else {
              music_title = `Música ${orderData?.music_type || 'Personalizada'}`;
            }
          }

          // Fetch uploaded files
          const { data: filesData } = await supabase
            .from('video_order_files')
            .select('file_url, file_type, file_name')
            .eq('video_order_id', vo.id)
            .order('sort_order', { ascending: true });
          files = filesData || [];

          return { ...vo, user_name, music_title, files };
        })
      );

      setVideoOrders(ordersWithDetails);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao carregar video orders',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchVideoOrders();
  }, [fetchVideoOrders]);

  const updateVideoOrderStatus = async (id: string, newStatus: string) => {
    try {
      const updateData: Record<string, any> = { status: newStatus };
      if (newStatus === 'COMPLETED') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('video_orders')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Status atualizado!',
        description: `Video order atualizado para: ${getStatusText(newStatus)}`,
      });

      setVideoOrders(prev => prev.map(vo => 
        vo.id === id ? { ...vo, status: newStatus } : vo
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

  const deleteVideoOrder = async (id: string) => {
    try {
      // First delete associated files from video_order_files
      const { error: filesError } = await supabase
        .from('video_order_files')
        .delete()
        .eq('video_order_id', id);

      if (filesError) throw filesError;

      // Then delete the video order itself
      const { error } = await supabase
        .from('video_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Pedido removido!',
        description: 'O pedido de vídeo foi removido com sucesso.',
      });

      setVideoOrders(prev => prev.filter(vo => vo.id !== id));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao remover pedido',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'AWAITING_PAYMENT': 'Aguardando Pagamento',
      'PENDING': 'Aguardando Upload',
      'SUBMITTED': 'Arquivos Enviados',
      'IN_PROGRESS': 'Em Produção',
      'COMPLETED': 'Concluído',
      'DELIVERED': 'Entregue'
    };
    return statusMap[status] || status;
  };

  // Download all files at once
  const downloadAllFiles = async (order: VideoOrder) => {
    if (!order.files || order.files.length === 0) {
      toast({
        title: 'Nenhum arquivo',
        description: 'Este pedido não possui arquivos para download.',
        variant: 'destructive'
      });
      return;
    }

    setDownloadingAll(order.id);
    
    try {
      for (let i = 0; i < order.files.length; i++) {
        const file = order.files[i];
        const response = await fetch(file.file_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.file_name || `arquivo_${i + 1}.${file.file_type === 'image' ? 'jpg' : 'mp4'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        // Small delay between downloads
        if (i < order.files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      toast({
        title: '✅ Download concluído!',
        description: `${order.files.length} arquivo(s) baixado(s) com sucesso.`
      });
    } catch (error) {
      toast({
        title: 'Erro no download',
        description: 'Não foi possível baixar todos os arquivos.',
        variant: 'destructive'
      });
    } finally {
      setDownloadingAll(null);
    }
  };

  // Upload edited video
  const handleUploadEditedVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedOrder) return;

    if (!file.type.startsWith('video/')) {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, selecione um arquivo de vídeo.',
        variant: 'destructive'
      });
      return;
    }

    setUploadingVideo(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `edited_${selectedOrder.id}_${Date.now()}.${fileExt}`;
      const filePath = `edited-videos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('video-uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('video-uploads')
        .getPublicUrl(filePath);

      // Update video order with edited video URL
      const { error: updateError } = await supabase
        .from('video_orders')
        .update({ 
          edited_video_url: publicUrl,
          edited_video_delivered_at: new Date().toISOString(),
          status: 'DELIVERED'
        })
        .eq('id', selectedOrder.id);

      if (updateError) throw updateError;

      // Send push notification to user
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: selectedOrder.user_id,
            title: '🎬 Seu vídeo está pronto!',
            body: 'O vídeo editado com sua música personalizada foi entregue. Acesse para visualizar!',
            url: `/pedido/${selectedOrder.order_id || ''}`,
            order_id: selectedOrder.order_id
          }
        });
      } catch (notifError) {
        console.error('Erro ao enviar notificação push:', notifError);
      }

      toast({
        title: '✅ Vídeo enviado!',
        description: 'O cliente foi notificado sobre a entrega.',
      });

      setVideoOrders(prev => prev.map(vo => 
        vo.id === selectedOrder.id 
          ? { ...vo, edited_video_url: publicUrl, status: 'DELIVERED', edited_video_delivered_at: new Date().toISOString() } 
          : vo
      ));
      
      setUploadDialogOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao enviar vídeo',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AWAITING_PAYMENT':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'PENDING':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'SUBMITTED':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'IN_PROGRESS':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'COMPLETED':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'DELIVERED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getVideoTypeLabel = (type: string, files?: { file_url: string; file_type: string; file_name: string | null }[]) => {
    // Show actual content uploaded, not the type
    if (files && files.length > 0) {
      const imageCount = files.filter(f => f.file_type === 'image').length;
      const videoCount = files.filter(f => f.file_type === 'video').length;
      
      const parts: string[] = [];
      if (imageCount > 0) parts.push(`${imageCount} Foto${imageCount > 1 ? 's' : ''}`);
      if (videoCount > 0) parts.push(`${videoCount} Vídeo${videoCount > 1 ? 's' : ''}`);
      
      return parts.length > 0 ? parts.join(' + ') : 'Sem arquivos';
    }
    
    // Fallback to type if no files
    const typeMap: Record<string, string> = {
      'photos_5': '5 Fotos',
      'photos_8': '8 Fotos + 1 Vídeo',
      'video_2min': 'Vídeo de 2 min'
    };
    return typeMap[type] || type;
  };

  const filteredOrders = videoOrders.filter(order => {
    const matchesSearch = 
      order.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.music_title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    total: videoOrders.length,
    submitted: videoOrders.filter(o => o.status === 'SUBMITTED').length,
    inProgress: videoOrders.filter(o => o.status === 'IN_PROGRESS').length,
    completed: videoOrders.filter(o => o.status === 'COMPLETED').length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className="p-3 text-center bg-card/50">
          <p className="text-2xl font-bold">{statusCounts.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </Card>
        <Card className="p-3 text-center bg-blue-500/10 border-blue-500/30">
          <p className="text-2xl font-bold text-blue-400">{statusCounts.submitted}</p>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </Card>
        <Card className="p-3 text-center bg-purple-500/10 border-purple-500/30">
          <p className="text-2xl font-bold text-purple-400">{statusCounts.inProgress}</p>
          <p className="text-xs text-muted-foreground">Em Produção</p>
        </Card>
        <Card className="p-3 text-center bg-green-500/10 border-green-500/30">
          <p className="text-2xl font-bold text-green-400">{statusCounts.completed}</p>
          <p className="text-xs text-muted-foreground">Concluídos</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou música..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card/50"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {['all', 'SUBMITTED', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED'].map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
              className="shrink-0 text-xs"
            >
              {status === 'all' ? 'Todos' : getStatusText(status)}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={fetchVideoOrders} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="text-center py-8">
          <Video className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="p-8 text-center">
          <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum video order encontrado</h3>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="p-4 bg-card/50 border-border/50">
              <div className="flex flex-col gap-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${getStatusColor(order.status)} text-xs`}>
                        {getStatusText(order.status)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {getVideoTypeLabel(order.video_type, order.files)}
                      </Badge>
                    </div>
                    <h3 className="font-semibold mt-1 truncate">
                      {order.music_title || 'Música Personalizada'}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <User className="w-3 h-3" />
                      <span>{order.user_name || 'Usuário'}</span>
                      <span>•</span>
                      <span>{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                      <span>•</span>
                      <span className="text-primary font-medium">
                        R$ {(order.amount / 100).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Files Preview */}
                {order.files && order.files.length > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg flex-wrap">
                    <div className="flex items-center gap-1">
                      <FileImage className="w-4 h-4 text-blue-400" />
                      <span className="text-xs">
                        {order.files.filter(f => f.file_type === 'image').length} fotos
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileVideo className="w-4 h-4 text-purple-400" />
                      <span className="text-xs">
                        {order.files.filter(f => f.file_type === 'video').length} vídeos
                      </span>
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => {
                          setSelectedOrder(order);
                          setFilesDialogOpen(true);
                        }}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => downloadAllFiles(order)}
                        disabled={downloadingAll === order.id}
                      >
                        {downloadingAll === order.id ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3 mr-1" />
                        )}
                        Baixar Tudo
                      </Button>
                    </div>
                  </div>
                )}

                {/* Edited Video Info */}
                {order.edited_video_url && (
                  <div className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <Send className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-emerald-400 font-medium">
                      Vídeo editado entregue
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto text-xs h-7"
                      asChild
                    >
                      <a href={order.edited_video_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Ver
                      </a>
                    </Button>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
                  {order.status === 'SUBMITTED' && (
                    <Button
                      size="sm"
                      onClick={() => updateVideoOrderStatus(order.id, 'IN_PROGRESS')}
                      className="text-xs"
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      Iniciar Produção
                    </Button>
                  )}
                  {order.status === 'IN_PROGRESS' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateVideoOrderStatus(order.id, 'COMPLETED')}
                        className="text-xs bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Marcar Concluído
                      </Button>
                    </>
                  )}
                  {(order.status === 'COMPLETED' || order.status === 'IN_PROGRESS') && !order.edited_video_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedOrder(order);
                        setUploadDialogOpen(true);
                      }}
                      className="text-xs border-primary/50 text-primary"
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Enviar Vídeo Editado
                    </Button>
                  )}
                  {order.order_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="text-xs"
                    >
                      <a href={`/pedido/${order.order_id}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Ver Pedido
                      </a>
                    </Button>
                  )}
                  
                  {/* Delete Button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-destructive/50 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Remover
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover Pedido de Vídeo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. O pedido e todos os arquivos associados serão removidos permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteVideoOrder(order.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Files Dialog */}
      <Dialog open={filesDialogOpen} onOpenChange={setFilesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileImage className="w-5 h-5" />
                Arquivos Enviados
              </span>
              {selectedOrder && selectedOrder.files && selectedOrder.files.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadAllFiles(selectedOrder)}
                  disabled={downloadingAll === selectedOrder.id}
                >
                  {downloadingAll === selectedOrder.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Baixar Todos
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder?.files && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              {selectedOrder.files.map((file, idx) => (
                <div key={idx} className="relative group">
                  {file.file_type === 'image' ? (
                    <img
                      src={file.file_url}
                      alt={file.file_name || `Imagem ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ) : (
                    <video
                      src={file.file_url}
                      controls
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  )}
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg"
                  >
                    <ExternalLink className="w-6 h-6 text-white" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Edited Video Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Enviar Vídeo Editado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="text-sm text-muted-foreground">
              <p><strong>Cliente:</strong> {selectedOrder?.user_name || 'N/A'}</p>
              <p><strong>Música:</strong> {selectedOrder?.music_title || 'Música Personalizada'}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editedVideo">Selecione o vídeo editado</Label>
              <Input
                id="editedVideo"
                type="file"
                accept="video/*"
                ref={videoInputRef}
                onChange={handleUploadEditedVideo}
                disabled={uploadingVideo}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                O cliente será notificado automaticamente quando o vídeo for enviado.
              </p>
            </div>

            {uploadingVideo && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                <span className="text-sm">Enviando vídeo...</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoOrdersManager;
