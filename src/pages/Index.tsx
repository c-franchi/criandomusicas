import Hero from "@/components/Hero";
import ProcessSteps from "@/components/ProcessSteps";
import MusicShowcase from "@/components/MusicShowcase";
import PricingPlans from "@/components/PricingPlans";
import Testimonials from "@/components/Testimonials";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <ProcessSteps />
      <MusicShowcase />
      <PricingPlans />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
