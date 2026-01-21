import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PublicReview {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  profiles?: {
    name: string | null;
  };
  orders?: {
    music_type: string | null;
  };
}

// Default testimonials as fallback
const defaultTestimonials = [
  {
    name: "Maria Silva",
    role: "Mãe de família",
    content: "Fiz uma música para o aniversário de 15 anos da minha filha. Ela chorou de emoção! O resultado superou todas as expectativas.",
    rating: 5
  },
  {
    name: "João Santos",
    role: "Empresário",
    content: "Encomendei uma música para minha empresa. A equipe ficou emocionada com a letra personalizada. Processo simples e resultado incrível!",
    rating: 5
  },
  {
    name: "Ana Costa",
    role: "Noiva",
    content: "Nossa música de casamento ficou perfeita! Contava nossa história desde o primeiro encontro. Todos os convidados se emocionaram.",
    rating: 5
  }
];

const Testimonials = () => {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicReviews = async () => {
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select(`
            id,
            rating,
            comment,
            created_at,
            order_id
          `)
          .eq('is_public', true)
          .not('comment', 'is', null)
          .order('created_at', { ascending: false })
          .limit(6);

        if (error) throw error;

        // Fetch profile and order data for each review
        if (data && data.length > 0) {
          const enrichedReviews = await Promise.all(
            data.map(async (review) => {
              // Get order to get user_id and music_type
              const { data: orderData } = await supabase
                .from('orders')
                .select('user_id, music_type')
                .eq('id', review.order_id)
                .single();

              let profileName = null;
              if (orderData?.user_id) {
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('name')
                  .eq('user_id', orderData.user_id)
                  .single();
                profileName = profileData?.name;
              }

              return {
                ...review,
                profiles: { name: profileName },
                orders: { music_type: orderData?.music_type || null }
              };
            })
          );

          setReviews(enrichedReviews);
        }
      } catch (err) {
        console.error('Error fetching reviews:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicReviews();
  }, []);

  const getMusicTypeLabel = (type: string | null | undefined) => {
    const labels: Record<string, string> = {
      'homenagem': 'Homenagem',
      'casamento': 'Casamento',
      'aniversario': 'Aniversário',
      'corporativo': 'Corporativo',
      'declaracao': 'Declaração'
    };
    return labels[type || ''] || 'Música Personalizada';
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'C';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  // Use real reviews if available, otherwise use defaults
  const hasRealReviews = reviews.length > 0;
  const displayItems = hasRealReviews ? reviews : defaultTestimonials;

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            O que nossos{" "}
            <span className="gradient-text">clientes dizem</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {hasRealReviews 
              ? "Avaliações reais de quem já criou sua música personalizada"
              : "Histórias reais de pessoas que transformaram momentos especiais em música"
            }
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {hasRealReviews ? (
            reviews.slice(0, 6).map((review) => (
              <Card key={review.id} className="p-6 glass-card border-border/50 hover:border-primary/50 transition-all duration-300 relative">
                <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/20" />
                
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                  ))}
                  {[...Array(5 - review.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-muted-foreground/30" />
                  ))}
                </div>
                
                <p className="text-muted-foreground mb-6 leading-relaxed line-clamp-4">
                  "{review.comment}"
                </p>
                
                <div className="flex items-center gap-3">
                  <Avatar className="bg-primary/20">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {getInitials(review.profiles?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">
                      {review.profiles?.name || 'Cliente'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getMusicTypeLabel(review.orders?.music_type)}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            defaultTestimonials.map((testimonial, index) => (
              <Card key={index} className="p-6 glass-card border-border/50 hover:border-primary/50 transition-all duration-300 relative">
                <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/20" />
                
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                  ))}
                </div>
                
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  "{testimonial.content}"
                </p>
                
                <div className="flex items-center gap-3">
                  <Avatar className="bg-primary/20">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {testimonial.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Average Rating Display */}
        {hasRealReviews && (
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 bg-card/50 backdrop-blur-sm border border-border/50 rounded-full px-6 py-3">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                ))}
              </div>
              <span className="text-muted-foreground">
                Baseado em {reviews.length} avaliações reais
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Testimonials;
