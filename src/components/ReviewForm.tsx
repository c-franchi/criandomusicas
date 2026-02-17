import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Send, Heart, UserCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

interface ReviewFormProps {
  orderId: string;
  userId: string;
  existingReview?: {
    id: string;
    rating: number;
    comment: string | null;
    is_public: boolean;
  };
  onReviewSubmitted?: () => void;
}

const ReviewForm = ({ orderId, userId, existingReview, onReviewSubmitted }: ReviewFormProps) => {
  const { toast } = useToast();
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [isPublic, setIsPublic] = useState(existingReview?.is_public || false);
  const [allowMusicSample, setAllowMusicSample] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(!!existingReview);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Selecione uma nota",
        description: "Por favor, avalie sua música de 1 a 5 estrelas",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (existingReview) {
        // Update existing review
        const { error } = await supabase
          .from('reviews')
          .update({
            rating,
            comment: comment || null,
            is_public: isPublic,
            allow_music_sample: allowMusicSample
          })
          .eq('id', existingReview.id);

        if (error) throw error;

        toast({
          title: t('review.updated', 'Avaliação atualizada!'),
          description: t('review.updatedDesc', 'Obrigado por atualizar seu feedback')
        });
      } else {
        // Create new review
        const { error } = await supabase
          .from('reviews')
          .insert({
            order_id: orderId,
            user_id: userId,
            rating,
            comment: comment || null,
            is_public: isPublic,
            allow_music_sample: allowMusicSample
          });

        if (error) throw error;

        toast({
          title: t('review.submitted', 'Avaliação enviada!'),
          description: t('review.thankYou', 'Muito obrigado pelo seu feedback! 💜')
        });

        setHasSubmitted(true);

        // Check if user has name and avatar
        if (isPublic) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, avatar_url')
            .eq('user_id', userId)
            .maybeSingle();
          
          if (!profile?.name || !profile?.avatar_url) {
            setShowProfilePrompt(true);
          }
        }
      }

      onReviewSubmitted?.();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({
        title: t('review.error', 'Erro ao enviar avaliação'),
        description: error.message || t('review.tryAgain', 'Tente novamente mais tarde'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  if (hasSubmitted && !existingReview) {
    return (
      <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-accent/10">
        <CardContent className="pt-6 text-center">
          <Heart className="w-12 h-12 text-primary mx-auto mb-3 animate-pulse" />
          <h3 className="text-lg font-semibold mb-2">{t('review.thankYouTitle', 'Obrigado pela sua avaliação!')}</h3>
          <p className="text-muted-foreground text-sm">
            {t('review.feedbackImportant', 'Seu feedback é muito importante para nós')}
          </p>
          <div className="flex justify-center gap-1 mt-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-6 h-6 ${
                  star <= rating
                    ? "fill-[hsl(var(--gold))] text-[hsl(var(--gold))]"
                    : "text-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          {/* Profile completion prompt */}
          {showProfilePrompt && (
            <div className="mt-6 p-4 rounded-lg border border-primary/20 bg-primary/5">
              <UserCircle className="w-10 h-10 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium mb-1">
                {t('review.profilePromptTitle', 'Complete seu perfil!')}
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                {t('review.profilePromptDesc', 'Adicione uma foto e nome para que sua avaliação apareça completa na página inicial.')}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/profile')}
                className="gap-2"
              >
                <UserCircle className="w-4 h-4" />
                {t('review.goToProfile', 'Completar Perfil')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Star className="w-5 h-5 text-[hsl(var(--gold))]" />
          {existingReview ? t('review.editTitle', 'Editar Avaliação') : t('review.title', 'Avalie sua Música')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star Rating */}
        <div className="space-y-2">
          <Label>{t('review.rateQuestion', 'Como você avalia sua música?')}</Label>
          <div className="flex gap-2 justify-center py-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    star <= displayRating
                      ? "fill-[hsl(var(--gold))] text-[hsl(var(--gold))]"
                      : "text-muted-foreground/30 hover:text-[hsl(var(--gold))]/50"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {displayRating === 0 && t('review.ratingLabels.click', 'Clique para avaliar')}
            {displayRating === 1 && t('review.ratingLabels.1', 'Precisa melhorar')}
            {displayRating === 2 && t('review.ratingLabels.2', 'Regular')}
            {displayRating === 3 && t('review.ratingLabels.3', 'Boa')}
            {displayRating === 4 && t('review.ratingLabels.4', 'Muito boa!')}
            {displayRating === 5 && t('review.ratingLabels.5', 'Incrível! 🎉')}
          </p>
        </div>

        {/* Comment */}
        <div className="space-y-2">
          <Label htmlFor="comment">{t('review.commentLabel', 'Deixe um comentário (opcional)')}</Label>
          <Textarea
            id="comment"
            placeholder={t('review.commentPlaceholder', 'Conte-nos o que achou da sua música...')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">
            {comment.length}/500 {t('review.characters', 'caracteres')}
          </p>
        </div>

        {/* Public checkbox */}
        <div className="flex items-start gap-2">
          <Checkbox
            id="isPublic"
            checked={isPublic}
            onCheckedChange={(checked) => setIsPublic(checked as boolean)}
            className="mt-0.5"
          />
          <Label htmlFor="isPublic" className="text-sm cursor-pointer leading-tight">
            {t('review.publicLabel', 'Permitir que minha avaliação seja exibida publicamente')}
          </Label>
        </div>

        {/* Music sample permission checkbox */}
        <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <Checkbox
            id="allowMusicSample"
            checked={allowMusicSample}
            onCheckedChange={(checked) => setAllowMusicSample(checked as boolean)}
            className="mt-0.5"
          />
          <div>
            <Label htmlFor="allowMusicSample" className="text-sm cursor-pointer leading-tight font-medium">
              {t('review.sampleLabel', 'Permitir uso da minha música como exemplo na plataforma')}
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              {t('review.sampleDesc', 'Sua música poderá ser usada para inspirar outros clientes')}
            </p>
          </div>
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || rating === 0}
          className="w-full gap-2"
        >
          <Send className="w-4 h-4" />
          {isSubmitting ? t('review.submitting', 'Enviando...') : existingReview ? t('review.update', 'Atualizar Avaliação') : t('review.submit', 'Enviar Avaliação')}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ReviewForm;
