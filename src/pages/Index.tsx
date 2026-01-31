import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Hero from "@/components/Hero";
import ProcessSteps from "@/components/ProcessSteps";
import InstrumentalShowcase from "@/components/InstrumentalShowcase";
import WhyChooseUs from "@/components/WhyChooseUs";
import CustomLyricHighlight from "@/components/CustomLyricHighlight";
import Testimonials from "@/components/Testimonials";
import VideoServiceSection from "@/components/VideoServiceSection";
import ReactionVideosShowcase from "@/components/ReactionVideosShowcase";
import FAQ from "@/components/FAQ";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";
import SEO from "@/components/SEO";
import ScrollToTop from "@/components/ScrollToTop";
import PlanComparison from "@/components/PlanComparison";
import PinnedScrollSections from "@/components/PinnedScrollSections";
import CelebrationSuggestion from "@/components/CelebrationSuggestion";
import { useUpcomingCelebrations } from "@/hooks/useUpcomingCelebrations";

const Index = () => {
  const navigate = useNavigate();
  const { closestDate, isLoading } = useUpcomingCelebrations(30);
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);

  const handleCelebrationAccept = () => {
    if (!closestDate) return;
    
    // Navigate to briefing with celebration context
    const params = new URLSearchParams({
      celebration: closestDate.id,
      celebrationName: closestDate.localizedName,
      celebrationEmoji: closestDate.emoji,
    });
    
    navigate(`/briefing?${params.toString()}`);
  };

  const handleCelebrationDismiss = () => {
    setCelebrationDismissed(true);
  };

  return (
    <main className="min-h-screen bg-background">
      <SEO 
        canonical="/"
        title="Músicas Personalizadas com IA"
        description="Crie músicas personalizadas com inteligência artificial. Transforme sua história em uma canção única e emocionante. Presente perfeito para aniversário, casamento e datas especiais. Entrega em até 48h."
        keywords="música personalizada, criar música com IA, presente criativo, música para aniversário, música para casamento, homenagem musical, música exclusiva"
      />
      <Hero />
      
      {/* Celebration Popup - shows as modal for event dates */}
      {!isLoading && closestDate && !celebrationDismissed && (
        <CelebrationSuggestion
          celebration={closestDate}
          onAccept={handleCelebrationAccept}
          onDismiss={handleCelebrationDismiss}
          open={!celebrationDismissed}
        />
      )}
      
      <ProcessSteps />
      
      {/* Pinned Scroll Sections: AudioSamples, PricingPlans, CreatorSection */}
      <PinnedScrollSections />
      
      <PlanComparison />
      <InstrumentalShowcase />
      <WhyChooseUs />
      <CustomLyricHighlight />
      <VideoServiceSection />
      <Testimonials />
      <ReactionVideosShowcase />
      <FAQ />
      <CTA />
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </main>
  );
};

export default Index;
