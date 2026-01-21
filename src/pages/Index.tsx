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

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
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
