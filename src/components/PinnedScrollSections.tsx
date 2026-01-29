import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import AudioSamples from "@/components/AudioSamples";
import PricingPlans from "@/components/PricingPlans";
import CreatorSection from "@/components/CreatorSection";
import { useIsMobile } from "@/hooks/use-mobile";

interface PinnedSectionProps {
  children: React.ReactNode;
  index: number;
  total: number;
  sectionRef: React.RefObject<HTMLDivElement>;
}

const PinnedSection = ({ children, index, sectionRef }: PinnedSectionProps) => {
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"]
  });

  // Each section fades and scales as user scrolls through it
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.8, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.95, 1, 1, 0.98]);
  const y = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [60, 0, 0, -40]);

  return (
    <motion.div
      style={{ opacity, scale, y }}
      className="will-change-transform"
    >
      {children}
    </motion.div>
  );
};

const PinnedScrollSections = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const section1Ref = useRef<HTMLDivElement>(null);
  const section2Ref = useRef<HTMLDivElement>(null);
  const section3Ref = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // For desktop: full pinned scroll experience
  // For mobile: simplified scroll with fade effects
  
  const { scrollYProgress: containerProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Background gradient animation based on scroll
  const bgGradient1 = useTransform(
    containerProgress,
    [0, 0.33, 0.66, 1],
    [
      "linear-gradient(180deg, hsl(259 94% 51% / 0.05), hsl(315 90% 58% / 0.02))",
      "linear-gradient(180deg, hsl(259 94% 51% / 0.08), hsl(315 90% 58% / 0.05))",
      "linear-gradient(180deg, hsl(280 100% 65% / 0.08), hsl(259 94% 51% / 0.05))",
      "linear-gradient(180deg, hsl(315 90% 58% / 0.05), hsl(259 94% 51% / 0.02))"
    ]
  );

  if (isMobile) {
    // Simplified mobile experience - no heavy pinning, just smooth transitions
    return (
      <div className="relative">
        {/* Section 1: AudioSamples */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.6 }}
        >
          <AudioSamples />
        </motion.div>

        {/* Section 2: PricingPlans */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.6 }}
        >
          <PricingPlans />
        </motion.div>

        {/* Section 3: CreatorSection */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.6 }}
        >
          <CreatorSection />
        </motion.div>
      </div>
    );
  }

  // Desktop: Full cinematic pinned scroll experience
  return (
    <div ref={containerRef} className="relative">
      {/* Animated background overlay */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-0"
        style={{ background: bgGradient1 }}
      />

      {/* Section 1: AudioSamples with parallax */}
      <div ref={section1Ref} className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-5%" }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <PinnedSection 
            index={0} 
            total={3} 
            sectionRef={section1Ref}
          >
            <AudioSamples />
          </PinnedSection>
        </motion.div>
      </div>

      {/* Transition gradient between sections */}
      <div className="relative h-24 overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, transparent, hsl(var(--background)))"
          }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Section 2: PricingPlans */}
      <div ref={section2Ref} className="relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-5%" }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <PinnedSection 
            index={1} 
            total={3} 
            sectionRef={section2Ref}
          >
            <PricingPlans />
          </PinnedSection>
        </motion.div>
      </div>

      {/* Transition with floating orbs */}
      <div className="relative h-32 overflow-hidden">
        <motion.div
          className="absolute left-1/4 top-1/2 w-64 h-64 rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(259 94% 51% / 0.1), transparent 70%)",
            filter: "blur(40px)"
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        />
        <motion.div
          className="absolute right-1/4 top-1/2 w-48 h-48 rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(315 90% 58% / 0.1), transparent 70%)",
            filter: "blur(40px)"
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2 }}
        />
      </div>

      {/* Section 3: CreatorSection */}
      <div ref={section3Ref} className="relative z-30">
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-5%" }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <PinnedSection 
            index={2} 
            total={3} 
            sectionRef={section3Ref}
          >
            <CreatorSection />
          </PinnedSection>
        </motion.div>
      </div>
    </div>
  );
};

export default PinnedScrollSections;
