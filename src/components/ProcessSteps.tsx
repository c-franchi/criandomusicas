import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Music, Share2, Package, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const ProcessSteps = () => {
  const { t } = useTranslation('home');

  const steps = [
    {
      icon: FileText,
      title: t('process.step1.title'),
      description: t('process.step1.description'),
      badge: "1"
    },
    {
      icon: Music,
      title: t('process.step2.title'),
      description: t('process.step2.description'),
      badge: "2"
    },
    {
      icon: Share2,
      title: t('process.step3.title'),
      description: t('process.step3.description'),
      badge: "3"
    }
  ];

  return (
    <section id="processo" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            {t('process.title')}{" "}
            <span className="gradient-text">{t('process.titleHighlight')}</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('process.subtitle')}
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
          {steps.map((step, index) => (
            <Card key={index} className="relative p-6 bg-card/80 border border-primary/30 hover:border-[hsl(45,100%,50%)] transition-all duration-300">
              <div className="absolute -top-4 left-6">
                <Badge variant="secondary" className="bg-primary text-primary-foreground">
                  {step.badge}
                </Badge>
              </div>
              
              <div className="mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center mb-4">
                  <step.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
              
              {/* Step number */}
              <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-accent rounded-full flex items-center justify-center text-sm font-bold text-accent-foreground">
                {index + 1}
              </div>
            </Card>
          ))}
        </div>

        {/* Credits Info Section */}
        <Card className="p-8 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border border-primary/20 max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20">
              <Package className="w-10 h-10 text-primary" />
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl font-bold mb-2 flex items-center justify-center md:justify-start gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                {t('process.packages.title')}
              </h3>
              <p className="text-foreground/80 mb-4">
                {t('process.packages.description')}
              </p>
              
              <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm">
                <div className="flex items-center gap-2 bg-background/50 px-3 py-1.5 rounded-full">
                  <Badge variant="secondary" className="bg-accent text-white border-accent">
                    {t('process.packages.songs3')}
                  </Badge>
                  <span className="text-muted-foreground">{t('process.packages.savings16')}</span>
                </div>
                <div className="flex items-center gap-2 bg-background/50 px-3 py-1.5 rounded-full">
                  <Badge variant="secondary" className="bg-primary text-white border-primary">
                    {t('process.packages.songs5')}
                  </Badge>
                  <span className="text-muted-foreground">{t('process.packages.bestSavings')}</span>
                </div>
              </div>
            </div>
            
            <Button asChild size="lg" className="shrink-0">
              <Link to="/planos">
                {t('process.packages.viewPackages')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default ProcessSteps;