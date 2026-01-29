import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import AudioSamples from "@/components/AudioSamples";
import PricingPlans from "@/components/PricingPlans";
import CreatorSection from "@/components/CreatorSection";
import { useIsMobile } from "@/hooks/use-mobile";

const PinnedScrollSections = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const creatorSectionRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Only track scroll for Creator section overlay effect
  const { scrollYProgress } = useScroll({
    target: creatorSectionRef,
    offset: ["start end", "start start"]
  });

  // Creator section animations - faster entry
  const creatorOpacity = useTransform(scrollYProgress, [0, 0.4], [0, 1]);
  const creatorY = useTransform(scrollYProgress, [0, 0.5], [100, 0]);
  const creatorScale = useTransform(scrollYProgress, [0, 0.5], [0.95, 1]);

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

  // Desktop: First section static, Creator section overlays with parallax
  return (
    <div ref={containerRef} className="relative">
      {/* Section 1: AudioSamples - NO scroll animations, stays static */}
      <div className="relative z-10">
        <AudioSamples />
      </div>

      {/* Section 2: PricingPlans - Simple fade in */}
      <motion.div
        className="relative z-20"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.3 }}
      >
        <PricingPlans />
      </motion.div>

      {/* Section 3: CreatorSection - Cinematic overlay effect */}
      <div ref={creatorSectionRef} className="relative z-30">
        <motion.div
          style={{
            opacity: creatorOpacity,
            y: creatorY,
            scale: creatorScale,
          }}
          className="will-change-transform"
        >
          {/* Decorative floating orbs that appear with Creator section */}
          <motion.div
            className="absolute -top-20 left-1/4 w-64 h-64 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, hsl(259 94% 51% / 0.08), transparent 70%)",
              filter: "blur(40px)",
              opacity: creatorOpacity
            }}
          />
          <motion.div
            className="absolute -top-16 right-1/4 w-48 h-48 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, hsl(315 90% 58% / 0.08), transparent 70%)",
              filter: "blur(40px)",
              opacity: creatorOpacity
            }}
          />
          
          <CreatorSection />
        </motion.div>
      </div>
    </div>
  );
};

export default PinnedScrollSections;
