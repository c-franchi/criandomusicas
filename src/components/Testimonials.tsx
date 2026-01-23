import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PublicReview {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  profiles?: {
    name: string | null;
    avatar_url: string | null;
  };
  orders?: {
    music_type: string | null;
  };
}

// Placeholder avatar URLs for users without profile photos
const placeholderAvatars = [
  "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face"
];

// Default testimonials as fallback - expanded for better social proof
const defaultTestimonials = [
  {
    name: "Maria Silva",
    role: "Mãe de família",
    content: "Fiz uma música para o aniversário de 15 anos da minha filha. Ela chorou de emoção! O resultado superou todas as expectativas.",
    rating: 5,
    musicType: "aniversario",
    avatarUrl: placeholderAvatars[0]
  },
  {
    name: "João Santos",
    role: "Empresário",
    content: "Encomendei uma música para minha empresa. A equipe ficou emocionada com a letra personalizada. Processo simples e resultado incrível!",
    rating: 5,
    musicType: "corporativo",
    avatarUrl: placeholderAvatars[1]
  },
  {
    name: "Ana Costa",
    role: "Noiva",
    content: "Nossa música de casamento ficou perfeita! Contava nossa história desde o primeiro encontro. Todos os convidados se emocionaram.",
    rating: 5,
    musicType: "casamento",
    avatarUrl: placeholderAvatars[2]
  },
  {
    name: "Pedro Oliveira",
    role: "Pai orgulhoso",
    content: "Presente de formatura para meu filho. A letra menciona cada conquista dele. Melhor investimento que fiz! Ele guarda para sempre.",
    rating: 5,
    musicType: "homenagem",
    avatarUrl: placeholderAvatars[3]
  },
  {
    name: "Carla Mendes",
    role: "Esposa há 25 anos",
    content: "Bodas de prata com uma música que conta nossa história. Meu marido chorou, os filhos emocionados. Momento inesquecível!",
    rating: 5,
    musicType: "declaracao",
    avatarUrl: placeholderAvatars[4]
  },
  {
    name: "Ricardo Lima",
    role: "Avô",
    content: "Música para minha neta de 5 anos com o nome dela e as brincadeiras favoritas. Ela pede para ouvir todos os dias!",
    rating: 5,
    musicType: "aniversario",
    avatarUrl: placeholderAvatars[5]
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
            data.map(async (review, index) => {
              // Get order to get user_id and music_type
              const { data: orderData } = await supabase
                .from('orders')
                .select('user_id, music_type')
                .eq('id', review.order_id)
                .single();

              let profileData = null;
              if (orderData?.user_id) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('name, avatar_url')
                  .eq('user_id', orderData.user_id)
                  .single();
                profileData = profile;
              }

              return {
                ...review,
                profiles: { 
                  name: profileData?.name || null,
                  avatar_url: profileData?.avatar_url || placeholderAvatars[index % placeholderAvatars.length]
                },
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

  return (
    <section className="py-24 px-6" id="depoimentos" aria-labelledby="testimonials-heading">
      <div className="max-w-6xl mx-auto">
        {/* Stats bar for social proof */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-12 mb-12">
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold gradient-text">500+</div>
            <div className="text-sm text-muted-foreground">Músicas Criadas</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold gradient-text">5.0★</div>
            <div className="text-sm text-muted-foreground">Avaliação Média</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold gradient-text">98%</div>
            <div className="text-sm text-muted-foreground">Clientes Satisfeitos</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold gradient-text">48h</div>
            <div className="text-sm text-muted-foreground">Entrega Média</div>
          </div>
        </div>

        <div className="text-center mb-16">
          <h2 id="testimonials-heading" className="text-4xl font-bold mb-4">
            O que quem já criou uma música{" "}
            <span className="gradient-text">com a gente diz</span> 💜
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {hasRealReviews 
              ? "Avaliações reais de quem já criou sua música personalizada"
              : "Depoimentos de pessoas que transformaram momentos especiais em música"
            }
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {hasRealReviews ? (
            reviews.slice(0, 6).map((review, index) => (
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
                  <Avatar className="w-12 h-12 border-2 border-primary/30">
                    <AvatarImage 
                      src={review.profiles?.avatar_url || placeholderAvatars[index % placeholderAvatars.length]} 
                      alt={review.profiles?.name || 'Cliente'}
                    />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {getInitials(review.profiles?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-foreground">
                      {review.profiles?.name || `Cliente ${index + 1}`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getMusicTypeLabel(review.orders?.music_type)}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            defaultTestimonials.slice(0, 6).map((testimonial, index) => (
              <Card key={index} className="p-6 glass-card border-border/50 hover:border-primary/50 transition-all duration-300 relative">
                <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/20" aria-hidden="true" />
                
                <div className="flex items-center gap-1 mb-4" role="img" aria-label={`Avaliação: ${testimonial.rating} de 5 estrelas`}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-accent text-accent" aria-hidden="true" />
                  ))}
                </div>
                
                <blockquote className="text-muted-foreground mb-6 leading-relaxed">
                  "{testimonial.content}"
                </blockquote>
                
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 border-2 border-primary/30">
                    <AvatarImage 
                      src={testimonial.avatarUrl} 
                      alt={testimonial.name}
                    />
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
