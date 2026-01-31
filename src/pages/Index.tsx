import { useState, useEffect, useCallback } from "react";
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
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";
import SEO from "@/components/SEO";
import ScrollToTop from "@/components/ScrollToTop";
import PlanComparison from "@/components/PlanComparison";
import PinnedScrollSections from "@/components/PinnedScrollSections";
import CelebrationSuggestion from "@/components/CelebrationSuggestion";
import { useUpcomingCelebrations } from "@/hooks/useUpcomingCelebrations";

const CELEBRATION_DISMISS_KEY = 'celebration_dismissed_date';

const Index = () => {
  const navigate = useNavigate();
  const { closestDate, isLoading } = useUpcomingCelebrations(30);
  const [celebrationDismissed, setCelebrationDismissed] = useState(true); // Start as true to prevent flash
  const [showCelebration, setShowCelebration] = useState(false);

  // Check if celebration was dismissed today
  useEffect(() => {
    const dismissedData = localStorage.getItem(CELEBRATION_DISMISS_KEY);
    if (dismissedData) {
      try {
        const { date, celebrationId } = JSON.parse(dismissedData);
        const today = new Date().toDateString();
        // If dismissed today for this celebration, keep dismissed
        if (date === today && closestDate && celebrationId === closestDate.id) {
          setCelebrationDismissed(true);
          return;
        }
      } catch {
        // Invalid data, ignore
      }
    }
    // Not dismissed today or different celebration
    setCelebrationDismissed(false);
  }, [closestDate]);

  // Show celebration modal after a short delay (only if not dismissed)
  useEffect(() => {
    if (!isLoading && closestDate && !celebrationDismissed) {
      const timer = setTimeout(() => setShowCelebration(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, closestDate, celebrationDismissed]);

  const handleCelebrationAccept = useCallback(() => {
    if (!closestDate) return;
    
    // Navigate to briefing with celebration context
    const params = new URLSearchParams({
      celebration: closestDate.id,
      celebrationName: closestDate.localizedName,
      celebrationEmoji: closestDate.emoji,
    });
    
    navigate(`/briefing?${params.toString()}`);
  }, [closestDate, navigate]);

  const handleCelebrationDismiss = useCallback(() => {
    if (closestDate) {
      // Store dismissal with today's date and celebration ID
      localStorage.setItem(CELEBRATION_DISMISS_KEY, JSON.stringify({
        date: new Date().toDateString(),
        celebrationId: closestDate.id,
      }));
    }
    setCelebrationDismissed(true);
    setShowCelebration(false);
  }, [closestDate]);

  // Function to reopen celebration modal (exposed via window for Footer)
  const handleReopenCelebration = useCallback(() => {
    if (closestDate) {
      setShowCelebration(true);
    }
  }, [closestDate]);

  // Expose reopen function globally for Footer to use
  useEffect(() => {
    (window as any).__reopenCelebration = handleReopenCelebration;
    (window as any).__hasCelebration = !!closestDate;
    return () => {
      delete (window as any).__reopenCelebration;
      delete (window as any).__hasCelebration;
    };
  }, [handleReopenCelebration, closestDate]);

  return (
    <main className="min-h-screen bg-background">
      <SEO 
        canonical="/"
        title="Músicas Personalizadas com IA"
        description="Crie músicas personalizadas com inteligência artificial. Transforme sua história em uma canção única e emocionante. Presente perfeito para aniversário, casamento e datas especiais. Entrega em até 24h."
        keywords="música personalizada, criar música com IA, presente criativo, música para aniversário, música para casamento, homenagem musical, música exclusiva"
      />
      <Hero />
      
      {/* Celebration Popup - shows as modal for event dates */}
      {closestDate && showCelebration && (
        <CelebrationSuggestion
          celebration={closestDate}
          onAccept={handleCelebrationAccept}
          onDismiss={handleCelebrationDismiss}
          open={showCelebration}
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
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </main>
  );
};

export default Index;
