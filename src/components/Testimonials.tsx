import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Marquee } from "@/components/ui/marquee";

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

// Testimonial Card Component
interface TestimonialCardProps {
  name: string;
  role: string;
  content: string;
  rating: number;
  avatarUrl?: string | null;
}

const TestimonialCard = ({ name, role, content, rating, avatarUrl }: TestimonialCardProps) => {
  const { t } = useTranslation('home');
  
  return (
    <Card className="premium-card p-6 w-[320px] md:w-[380px] flex-shrink-0 relative">
      <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/10" aria-hidden="true" />
      
      <div className="flex items-center gap-1 mb-4" role="img" aria-label={`${t('testimonials.ratingAria')}: ${rating}`}>
        {[...Array(rating)].map((_, i) => (
          <Star key={i} className="w-5 h-5 fill-[hsl(var(--gold))] text-[hsl(var(--gold))]" aria-hidden="true" />
        ))}
        {[...Array(5 - rating)].map((_, i) => (
          <Star key={`empty-${i}`} className="w-5 h-5 text-muted-foreground/30" aria-hidden="true" />
        ))}
      </div>
      
      <blockquote className="text-muted-foreground mb-6 leading-relaxed line-clamp-4 min-h-[80px]">
        "{content}"
      </blockquote>
      
      <div className="flex items-center gap-3 mt-auto">
        <Avatar className="w-12 h-12 border-2 border-primary/30 ring-2 ring-primary/10">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-medium">
            {name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="font-semibold text-foreground">{name}</div>
          <div className="text-sm text-muted-foreground">{role}</div>
        </div>
      </div>
    </Card>
  );
};

const Testimonials = () => {
  const { t } = useTranslation('home');
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
              // Get order to get user_id and music_type - use maybeSingle to handle RLS restrictions
              const { data: orderData } = await supabase
                .from('orders')
                .select('user_id, music_type')
                .eq('id', review.order_id)
                .maybeSingle();

              let profileData = null;
              if (orderData?.user_id) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('name, avatar_url')
                  .eq('user_id', orderData.user_id)
                  .maybeSingle();
                profileData = profile;
              }

              // Use placeholder avatar if user doesn't have one
              return {
                ...review,
                profiles: { 
                  name: profileData?.name || null,
                  avatar_url: profileData?.avatar_url || null
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
      'homenagem': t('testimonials.musicTypes.tribute'),
      'casamento': t('testimonials.musicTypes.wedding'),
      'aniversario': t('testimonials.musicTypes.birthday'),
      'corporativo': t('testimonials.musicTypes.corporate'),
      'declaracao': t('testimonials.musicTypes.declaration')
    };
    return labels[type || ''] || t('testimonials.musicTypes.custom');
  };

  // Use real reviews if available, otherwise use defaults
  const hasRealReviews = reviews.length > 0;
  
  // Prepare testimonials for marquee
  const testimonialData = reviews.map(review => ({
    name: review.profiles?.name || t('testimonials.verifiedClient'),
    role: getMusicTypeLabel(review.orders?.music_type),
    content: review.comment || '', rating: Math.max(0, Math.min(5, Math.round(review.rating))),
    avatarUrl: review.profiles?.avatar_url
  }));
  if (loading || !hasRealReviews) return null;

  // Split into two rows for alternating direction
  const row1 = testimonialData.slice(0, Math.ceil(testimonialData.length / 2));
  const row2 = testimonialData.slice(Math.ceil(testimonialData.length / 2));

  return (
    <section className="section-spacing overflow-hidden" id="depoimentos" aria-labelledby="testimonials-heading">
      {/* Stats bar for social proof - constrained */}
      <div className="max-w-6xl mx-auto">
        <motion.div 
          className="text-center mb-16 px-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h2 id="testimonials-heading" className="text-4xl md:text-5xl font-bold mb-4">
            {t('testimonials.title')} <span className="gradient-text">💜</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {hasRealReviews 
              ? t('testimonials.subtitleReal')
              : t('testimonials.subtitle')
            }
          </p>
        </motion.div>
      </div>
        
      {/* Marquee Row 1 - Left direction (full width, outside constrained container) */}
      <div className="mb-6">
        <Marquee direction="left" speed="fast" pauseOnHover>
          {row1.map((testimonial, index) => (
            <TestimonialCard
              key={`row1-${index}`}
              name={testimonial.name}
              role={testimonial.role}
              content={testimonial.content}
              rating={testimonial.rating}
              avatarUrl={testimonial.avatarUrl}
            />
          ))}
        </Marquee>
      </div>
      
      {/* Marquee Row 2 - Right direction (full width) */}
      <div>
        <Marquee direction="right" speed="normal" pauseOnHover>
          {row2.map((testimonial, index) => (
            <TestimonialCard
              key={`row2-${index}`}
              name={testimonial.name}
              role={testimonial.role}
              content={testimonial.content}
              rating={testimonial.rating}
              avatarUrl={testimonial.avatarUrl}
            />
          ))}
        </Marquee>
      </div>

      {/* Average Rating Display */}
      {hasRealReviews && (
        <motion.div 
          className="mt-12 text-center px-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="inline-flex items-center gap-3 glass-card rounded-full px-6 py-3">
            <div className="flex items-center gap-1">
              {[...Array(Math.round(reviews.reduce((total, review) => total + review.rating, 0) / reviews.length))].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-[hsl(var(--gold))] text-[hsl(var(--gold))]" />
              ))}
            </div>
            <span className="text-muted-foreground">
              {t('testimonials.basedOn', { count: reviews.length })}
            </span>
          </div>
        </motion.div>
      )}
    </section>
  );
};

export default Testimonials;
