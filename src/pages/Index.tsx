import Hero from "@/components/Hero";
import ProcessSteps from "@/components/ProcessSteps";
import AudioSamples from "@/components/AudioSamples";
import PricingPlans from "@/components/PricingPlans";
import Testimonials from "@/components/Testimonials";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <ProcessSteps />
      <AudioSamples />
      <PricingPlans />
      <Testimonials />
      <CTA />
      <Footer />
      <CookieConsent />
    </div>
  );
};

export default Index;
