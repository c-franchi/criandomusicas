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

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <SEO 
        canonical="/"
        title="Músicas Personalizadas com IA"
        description="Crie músicas personalizadas com inteligência artificial. Transforme sua história em uma canção única e emocionante. Presente perfeito para aniversário, casamento e datas especiais. Entrega em até 48h."
        keywords="música personalizada, criar música com IA, presente criativo, música para aniversário, música para casamento, homenagem musical, música exclusiva"
      />
      <Hero />
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
