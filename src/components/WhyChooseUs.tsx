import { useTranslation } from "react-i18next";
import { Clock, Heart, Music, Shield, Sparkles, Users } from "lucide-react";

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
    <section className="py-16 bg-background" id="diferenciais" aria-labelledby="why-choose-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Target Audience */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t('whyUs.targetTitle')}{" "}
            <span className="gradient-text">{t('whyUs.targetHighlight')}</span>
          </h2>
          <ul className="max-w-2xl mx-auto space-y-3">
            {Array.isArray(targetAudience) && targetAudience.map((item, index) => (
              <li key={index} className="flex items-center gap-3 text-lg text-muted-foreground">
                <Heart className="w-5 h-5 text-primary flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <header className="text-center mb-12">
          <h2 id="why-choose-title" className="text-3xl md:text-4xl font-bold gradient-text mb-4">
            {t('whyUs.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            {t('whyUs.subtitle')}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <article 
              key={index} 
              className="group p-6 rounded-xl bg-card/80 border border-primary/30 hover:border-[hsl(45,100%,50%)] hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mb-4 group-hover:bg-primary/25 transition-colors">
                <benefit.icon className="w-6 h-6 text-primary" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {benefit.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </article>
          ))}
        </div>

        {/* Additional SEO Content */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="prose prose-lg dark:prose-invert mx-auto text-center">
            <h3 className="text-2xl font-semibold text-foreground mb-4">
              {t('whyUs.howItWorks.title')}
            </h3>
            <p className="text-muted-foreground mb-6">
              {t('whyUs.howItWorks.p1')}
            </p>
            <p className="text-muted-foreground mb-6">
              {t('whyUs.howItWorks.p2')}
            </p>
            <p className="text-muted-foreground">
              {t('whyUs.howItWorks.p3')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;