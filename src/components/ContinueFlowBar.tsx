import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getNextStep, type NextStep } from "@/lib/nextStep";
import { isProtectedPath } from "@/lib/flowGuard";

const ACTIVE_STATUSES = [
  'AWAITING_PAYMENT',
  'PAID',
  'BRIEFING_COMPLETE',
  'LYRICS_PENDING',
  'LYRICS_GENERATED',
  'MUSIC_READY',
];

const DISMISS_KEY = 'continue_flow_dismissed';

const ContinueFlowBar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState<(NextStep & { orderId: string; title?: string | null }) | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user) {
        setStep(null);
        return;
      }

      const { data } = await supabase
        .from('orders')
        .select('id, status, payment_status, song_title, updated_at')
        .eq('user_id', user.id)
        .in('status', ACTIVE_STATUSES)
        .order('updated_at', { ascending: false })
        .limit(1);

      const order = data?.[0];
      if (cancelled) return;

      if (!order) {
        setStep(null);
        return;
      }

      const next = getNextStep(order);
      if (!next.actionable || localStorage.getItem(DISMISS_KEY) === order.id + ':' + order.status) {
        setStep(null);
        return;
      }

      setStep({ ...next, orderId: order.id, title: order.song_title });
    };

    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, location.pathname]);

  const hiddenHere =
    isProtectedPath(location.pathname) ||
    location.pathname.startsWith('/acompanhar/') ||
    location.pathname.startsWith('/admin') ||
    (step ? location.pathname === step.url : false);

  const visible = Boolean(step) && !hiddenHere;

  const handleDismiss = () => {
    if (step) localStorage.setItem(DISMISS_KEY, `${step.orderId}:${step.label}`);
    setStep(null);
  };

  return (
    <AnimatePresence>
      {visible && step && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[9998] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div className="max-w-3xl mx-auto glass-card border border-primary/30 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{step.label}</p>
              <p className="text-xs text-muted-foreground truncate">{step.description}</p>
            </div>
            <Button size="sm" onClick={() => navigate(step.url)} className="shrink-0">
              {step.label}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-full hover:bg-muted transition-colors shrink-0"
              aria-label="Fechar"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ContinueFlowBar;
