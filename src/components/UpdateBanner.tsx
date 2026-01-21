import { RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface UpdateBannerProps {
  onUpdate: () => void;
  onDismiss?: () => void;
}

const UpdateBanner = ({ onUpdate, onDismiss }: UpdateBannerProps) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const handleUpdate = () => {
    onUpdate();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-primary to-accent text-white shadow-lg"
        >
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-sm sm:text-base">
                    Nova versão disponível! 🎉
                  </p>
                  <p className="text-xs sm:text-sm text-white/80">
                    Atualize agora para ter as últimas melhorias
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleUpdate}
                  size="sm"
                  className="bg-white text-primary hover:bg-white/90 font-semibold"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Atualizar
                </Button>
                <button
                  onClick={handleDismiss}
                  className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpdateBanner;
