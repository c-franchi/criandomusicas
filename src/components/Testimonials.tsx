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

// Placeholder avatar URLs for users without profile photos
const placeholderAvatars = [
  "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face"
];

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

  // Default testimonials as fallback - expanded for better social proof
  const defaultTestimonials = [
    {
      name: "Maria Silva",
      role: t('testimonials.roles.mother'),
      content: t('testimonials.quotes.birthday'),
      rating: 5,
      musicType: "aniversario",
      avatarUrl: placeholderAvatars[0]
    },
    {
      name: "João Santos",
      role: t('testimonials.roles.entrepreneur'),
      content: t('testimonials.quotes.corporate'),
      rating: 5,
      musicType: "corporativo",
      avatarUrl: placeholderAvatars[1]
    },
    {
      name: "Ana Costa",
      role: t('testimonials.roles.bride'),
      content: t('testimonials.quotes.wedding'),
      rating: 5,
      musicType: "casamento",
      avatarUrl: placeholderAvatars[2]
    },
    {
      name: "Pedro Oliveira",
      role: t('testimonials.roles.proudFather'),
      content: t('testimonials.quotes.graduation'),
      rating: 5,
      musicType: "homenagem",
      avatarUrl: placeholderAvatars[3]
    },
    {
      name: "Carla Mendes",
      role: t('testimonials.roles.wife'),
      content: t('testimonials.quotes.anniversary'),
      rating: 5,
      musicType: "declaracao",
      avatarUrl: placeholderAvatars[4]
    },
    {
      name: "Ricardo Lima",
      role: t('testimonials.roles.grandfather'),
      content: t('testimonials.quotes.child'),
      rating: 5,
      musicType: "aniversario",
      avatarUrl: placeholderAvatars[5]
    }
  ];

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

              // Only use real data - no placeholders for real reviews
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
  const testimonialData = hasRealReviews 
    ? reviews.map(review => ({
        name: review.profiles?.name || t('testimonials.verifiedClient'),
        role: getMusicTypeLabel(review.orders?.music_type),
        content: review.comment || '',
        rating: review.rating,
        avatarUrl: review.profiles?.avatar_url
      }))
    : defaultTestimonials.map(t => ({
        name: t.name,
        role: t.role,
        content: t.content,
        rating: t.rating,
        avatarUrl: t.avatarUrl
      }));

  // Split into two rows for alternating direction
  const row1 = testimonialData.slice(0, Math.ceil(testimonialData.length / 2));
  const row2 = testimonialData.slice(Math.ceil(testimonialData.length / 2));

  return (
    <section className="section-spacing overflow-hidden" id="depoimentos" aria-labelledby="testimonials-heading">
      <div className="max-w-6xl mx-auto px-0">
        {/* Stats bar for social proof */}
        <motion.div 
          className="flex flex-wrap justify-center gap-8 md:gap-16 mb-16 px-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {[
            { value: t('testimonials.stats.songs'), label: t('testimonials.stats.songsLabel') },
            { value: t('testimonials.stats.rating'), label: t('testimonials.stats.ratingLabel') },
            { value: t('testimonials.stats.satisfaction'), label: t('testimonials.stats.satisfactionLabel') },
            { value: t('testimonials.stats.delivery'), label: t('testimonials.stats.deliveryLabel') },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-5xl font-bold gradient-text mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>

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
        
        {/* Marquee Row 1 - Left direction */}
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
        
        {/* Marquee Row 2 - Right direction */}
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
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-[hsl(var(--gold))] text-[hsl(var(--gold))]" />
                ))}
              </div>
              <span className="text-muted-foreground">
                {t('testimonials.basedOn', { count: reviews.length })}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default Testimonials;
