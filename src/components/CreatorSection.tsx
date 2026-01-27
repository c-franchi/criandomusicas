import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Image, Clock, Users, ArrowRight, Sparkles, Video, Headphones } from "lucide-react";
import { Link } from "react-router-dom";

const CreatorSection = () => {
  const { t } = useTranslation('pricing');

  return (
    <section className="py-20 bg-gradient-to-br from-purple-500/10 via-background to-pink-500/10" id="criadores">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Badge + Headline */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 px-4 py-1.5 text-sm">
            🎬 {t('creator.badge')}
          </Badge>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            {t('creator.title')} <span className="gradient-text">{t('creator.titleHighlight')}</span>
          </h2>
          
          <p className="text-xl text-muted-foreground mb-4 max-w-3xl mx-auto">
            {t('creator.description')}
          </p>
          
          <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
            {t('creator.subdescription')}
          </p>
        </div>
        
        {/* Diferenciais Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="border-primary/20 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-3">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">{t('creator.features.curatedLyrics')}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {t('creator.features.curatedLyricsDesc')}
            </CardContent>
          </Card>
          
          <Card className="border-primary/20 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-3">
                <Image className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">{t('creator.features.readyCovers')}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {t('creator.features.readyCoversDesc')}
            </CardContent>
          </Card>
          
          <Card className="border-primary/20 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-3">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">{t('creator.features.shortFormats')}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {t('creator.features.shortFormatsDesc')}
            </CardContent>
          </Card>
          
          <Card className="border-primary/20 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">{t('creator.features.humanSupport')}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {t('creator.features.humanSupportDesc')}
            </CardContent>
          </Card>
        </div>
        
        {/* Comparison Box */}
        <Card className="mb-12 p-6 sm:p-8 border-2 border-dashed border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {t('creator.whyDifferent.title')}
              </h3>
              <p className="text-muted-foreground">
                <strong className="text-foreground">{t('creator.whyDifferent.youDescribe')}</strong> {t('creator.whyDifferent.weTakeCare')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/40">
                <Headphones className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">{t('creator.badges.original')}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/40">
                <Video className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">{t('creator.badges.monetizable')}</span>
              </div>
            </div>
          </div>
        </Card>
        
        {/* CTA */}
        <div className="text-center">
          <Button size="lg" asChild className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-primary/30">
            <Link to="/planos#creator">
              {t('creator.cta')}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            {t('creator.pricing')}
          </p>
        </div>
      </div>
    </section>
  );
};

export default CreatorSection;
