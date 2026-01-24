import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
  Star, 
  Edit, 
  Trash2, 
  Save, 
  Loader2,
  Eye,
  EyeOff,
  MessageSquare
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
} from "@/components/ui/alert-dialog";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  is_public: boolean | null;
  created_at: string;
  order_id: string;
  user_id: string;
  user_name?: string | null;
  music_type?: string | null;
}

const ReviewsManager = () => {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          is_public,
          created_at,
          order_id,
          user_id
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with user and order info
      const enrichedReviews = await Promise.all(
        (data || []).map(async (review) => {
          // Get profile name
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name')
            .eq('user_id', review.user_id)
            .maybeSingle();

          // Get order music type
          const { data: orderData } = await supabase
            .from('orders')
            .select('music_type')
            .eq('id', review.order_id)
            .maybeSingle();

          return {
            ...review,
            user_name: profileData?.name || null,
            music_type: orderData?.music_type || null,
          };
        })
      );

      setReviews(enrichedReviews);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao carregar avaliações',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleEditReview = (review: Review) => {
    setEditingReview({ ...review });
    setEditDialogOpen(true);
  };

  const saveReview = async () => {
    if (!editingReview) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          rating: editingReview.rating,
          comment: editingReview.comment,
          is_public: editingReview.is_public,
        })
        .eq('id', editingReview.id);

      if (error) throw error;

      toast({ title: 'Avaliação atualizada!', description: 'As alterações foram salvas.' });
      setEditDialogOpen(false);
      setEditingReview(null);
      fetchReviews();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro ao salvar', description: errorMessage, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteReview = async () => {
    if (!deleteReviewId) return;
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', deleteReviewId);

      if (error) throw error;

      toast({ title: 'Avaliação removida', description: 'A avaliação foi excluída.' });
      setReviews(prev => prev.filter(r => r.id !== deleteReviewId));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro ao excluir', description: errorMessage, variant: 'destructive' });
    } finally {
      setDeleteReviewId(null);
    }
  };

  const togglePublicStatus = async (review: Review) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ is_public: !review.is_public })
        .eq('id', review.id);

      if (error) throw error;

      toast({ 
        title: review.is_public ? 'Avaliação ocultada' : 'Avaliação publicada',
        description: review.is_public ? 'Não será exibida na homepage' : 'Será exibida na homepage',
      });
      fetchReviews();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro ao atualizar', description: errorMessage, variant: 'destructive' });
    }
  };

  const getMusicTypeLabel = (type: string | null) => {
    const labels: Record<string, string> = {
      'homenagem': 'Homenagem',
      'casamento': 'Casamento',
      'aniversario': 'Aniversário',
      'corporativo': 'Corporativo',
      'declaracao': 'Declaração'
    };
    return labels[type || ''] || 'Música';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Avaliações dos Clientes ({reviews.length})</h3>
      </div>

      {reviews.length === 0 ? (
        <Card className="p-6 text-center">
          <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma avaliação cadastrada</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-4 h-4 ${i < review.rating ? 'fill-accent text-accent' : 'text-muted-foreground/30'}`} 
                        />
                      ))}
                    </div>
                    <Badge variant={review.is_public ? 'default' : 'secondary'} className="text-xs">
                      {review.is_public ? 'Público' : 'Privado'}
                    </Badge>
                  </div>

                  {review.comment && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      "{review.comment}"
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">{review.user_name || 'Usuário'}</span>
                    <span>•</span>
                    <span>{getMusicTypeLabel(review.music_type)}</span>
                    <span>•</span>
                    <span>{new Date(review.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => togglePublicStatus(review)}
                    className="h-8 w-8 p-0"
                    title={review.is_public ? 'Ocultar da homepage' : 'Publicar na homepage'}
                  >
                    {review.is_public ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleEditReview(review)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setDeleteReviewId(review.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) setEditingReview(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Avaliação</DialogTitle>
          </DialogHeader>
          {editingReview && (
            <div className="space-y-4 mt-4">
              <div>
                <Label>Avaliação (1-5 estrelas)</Label>
                <div className="flex items-center gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditingReview({ ...editingReview, rating: star })}
                      className="focus:outline-none"
                    >
                      <Star 
                        className={`w-6 h-6 transition-colors ${star <= editingReview.rating ? 'fill-accent text-accent' : 'text-muted-foreground/30 hover:text-accent/50'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Comentário</Label>
                <Textarea
                  value={editingReview.comment || ''}
                  onChange={(e) => setEditingReview({ ...editingReview, comment: e.target.value })}
                  placeholder="Comentário do cliente..."
                  rows={4}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={editingReview.is_public ?? false}
                  onCheckedChange={(checked) => setEditingReview({ ...editingReview, is_public: checked })}
                />
                <Label>Exibir na homepage</Label>
              </div>

              <Button onClick={saveReview} className="w-full" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Alterações
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteReviewId} onOpenChange={(open) => !open && setDeleteReviewId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir avaliação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A avaliação será permanentemente removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteReview} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReviewsManager;
