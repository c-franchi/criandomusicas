import { useRef } from "react";
import { motion } from "framer-motion";
import AudioSamples from "@/components/AudioSamples";
import PricingPlans from "@/components/PricingPlans";
import CreatorSection from "@/components/CreatorSection";
import { useIsMobile } from "@/hooks/use-mobile";

const PinnedScrollSections = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  if (isMobile) {
    // Simplified mobile experience - just fade in
    return (
      <div className="relative">
        <AudioSamples />
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-5%" }}
          transition={{ duration: 0.4 }}
        >
          <PricingPlans />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-5%" }}
          transition={{ duration: 0.4 }}
        >
          <CreatorSection />
        </motion.div>
      </div>
    );
  }

  // Desktop: Seções com animações simples e confiáveis
  return (
    <div ref={containerRef} className="relative">
      {/* Section 1: AudioSamples - Estática */}
      <div className="relative z-10">
        <AudioSamples />
      </div>

      {/* Section 2: PricingPlans - Fade in simples */}
      <motion.div
        className="relative z-20"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.5 }}
      >
        <PricingPlans />
      </motion.div>

      {/* Section 3: CreatorSection - Entrada cinematográfica */}
      <motion.div
        className="relative z-30"
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-5%" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <CreatorSection />
      </motion.div>
    </div>
  );
};

export default PinnedScrollSections;
