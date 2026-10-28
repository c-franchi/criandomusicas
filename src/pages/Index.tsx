import AudioSamples from '@/components/AudioSamples';
import PricingPlans from '@/components/PricingPlans';
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Hero from "@/components/Hero";
import MusicalGiftsSection from "@/components/gifts/MusicalGiftsSection";
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

import CelebrationSuggestion from "@/components/CelebrationSuggestion";
import { useUpcomingCelebrations } from "@/hooks/useUpcomingCelebrations";

const CELEBRATION_DISMISS_KEY = 'celebration_dismissed_date';

const Index = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("home");
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

  // Seasonal suggestions remain available from the footer, without interrupting a campaign visit.

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
        title={t("marketing.seoTitle")}
        description={t("marketing.seoDescription")}
        keywords="música personalizada, criar música com IA, presente criativo, música para aniversário, música para casamento, homenagem musical, música exclusiva"
      />
      <Hero />
      <div id="tour-examples"><AudioSamples compact /></div>
      <MusicalGiftsSection />
      
      {/* Celebration Popup - shows as modal for event dates */}
      {closestDate && showCelebration && (
        <CelebrationSuggestion
          celebration={closestDate}
          onAccept={handleCelebrationAccept}
          onDismiss={handleCelebrationDismiss}
          open={showCelebration}
        />
      )}
      
      <div id="tour-process">
        <ProcessSteps />
      </div>
      
      <div id="tour-plans"><PricingPlans /></div>
      <Testimonials />
      <ReactionVideosShowcase />
      <FAQ />
      <details className="mx-auto my-12 max-w-6xl rounded-2xl border border-border px-5 py-6">
        <summary className="cursor-pointer py-3 text-xl font-semibold">{t('gifts.moreServices')}</summary>
        <p className="mt-3 text-muted-foreground">{t('gifts.moreServicesHelp')}</p>
        <InstrumentalShowcase />
        <CustomLyricHighlight />
        <VideoServiceSection />
        <WhyChooseUs />
      </details>
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </main>
  );
};

export default Index;
