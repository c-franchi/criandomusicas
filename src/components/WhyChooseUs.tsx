import { useTranslation } from "react-i18next";
import { Clock, Heart, Music, Shield, Sparkles, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Marquee } from "@/components/ui/marquee";

// Benefit Card Component
interface BenefitCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

const BenefitCard = ({ icon: Icon, title, description }: BenefitCardProps) => (
  <article className="premium-card group p-8 w-[320px] md:w-[380px] flex-shrink-0">
    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
      <Icon className="w-7 h-7 text-primary" aria-hidden="true" />
    </div>
    <h3 className="text-xl font-semibold text-foreground mb-3">
      {title}
    </h3>
    <p className="text-muted-foreground leading-relaxed">
      {description}
    </p>
  </article>
);

const WhyChooseUs = () => {
  const { t } = useTranslation('home');

  const benefits = [
    {
      icon: Clock,
      title: t('whyUs.feature1.title'),
      description: t('whyUs.feature1.description')
    },
    {
      icon: Heart,
      title: t('whyUs.feature2.title'),
      description: t('whyUs.feature2.description')
    },
    {
      icon: Music,
      title: t('whyUs.feature3.title'),
      description: t('whyUs.feature3.description')
    },
    {
      icon: Users,
      title: t('whyUs.feature4.title'),
      description: t('whyUs.feature4.description')
    },
    {
      icon: Shield,
      title: t('whyUs.feature5.title'),
      description: t('whyUs.feature5.description')
    },
    {
      icon: Sparkles,
      title: t('whyUs.feature6.title'),
      description: t('whyUs.feature6.description')
    }
  ];

  // Target audience from translations
  const targetAudience = t('whyUs.target', { returnObjects: true }) as string[];

  return (
    <section className="section-spacing bg-background overflow-hidden" id="diferenciais" aria-labelledby="why-choose-title">
      <div className="max-w-7xl mx-auto">
        {/* Target Audience */}
        <motion.div 
          className="text-center mb-20 px-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-8">
            {t('whyUs.targetTitle')}{" "}
            <span className="gradient-text">{t('whyUs.targetHighlight')}</span>
          </h2>
          <ul className="max-w-2xl mx-auto space-y-4">
            {Array.isArray(targetAudience) && targetAudience.map((item, index) => (
              <motion.li 
                key={index} 
                className="flex items-center gap-4 text-lg text-muted-foreground justify-center md:justify-start"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-4 h-4 text-primary" />
                </div>
                {item}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.header 
          className="text-center mb-16 px-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 id="why-choose-title" className="text-3xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">{t('whyUs.title')}</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {t('whyUs.subtitle')}
          </p>
        </motion.header>

        {/* Benefits Marquee */}
        <Marquee direction="left" speed="normal" pauseOnHover>
          {benefits.map((benefit, index) => (
            <BenefitCard
              key={index}
              icon={benefit.icon}
              title={benefit.title}
              description={benefit.description}
            />
          ))}
        </Marquee>

        {/* Additional SEO Content */}
        <motion.div 
          className="mt-20 max-w-4xl mx-auto px-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="glass-card rounded-2xl p-8 md:p-12 text-center">
            <h3 className="text-2xl md:text-3xl font-semibold text-foreground mb-6">
              {t('whyUs.howItWorks.title')}
            </h3>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>{t('whyUs.howItWorks.p1')}</p>
              <p>{t('whyUs.howItWorks.p2')}</p>
              <p>{t('whyUs.howItWorks.p3')}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
