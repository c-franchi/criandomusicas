import Hero from "@/components/Hero";
import ProcessSteps from "@/components/ProcessSteps";
import AudioSamples from "@/components/AudioSamples";
import InstrumentalShowcase from "@/components/InstrumentalShowcase";
import WhyChooseUs from "@/components/WhyChooseUs";
import PricingPlans from "@/components/PricingPlans";
import Testimonials from "@/components/Testimonials";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";
import SEO from "@/components/SEO";

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
      <AudioSamples />
      <InstrumentalShowcase />
      <WhyChooseUs />
      <PricingPlans />
      <Testimonials />
      <CTA />
      <Footer />
      <CookieConsent />
    </main>
  );
};

export default Index;
