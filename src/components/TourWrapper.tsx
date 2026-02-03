import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTour } from "@/hooks/useTour";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";

const TourWrapper = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const { startTour } = useTour();
  const location = useLocation();
  const [hasCheckedTour, setHasCheckedTour] = useState(false);

  const checkAndStartTour = useCallback(async () => {
    if (!user || hasCheckedTour || authLoading) return;

    // Only start tour on home page
    if (location.pathname !== '/') return;

    try {
      // Check if tour was completed
      const { data, error } = await supabase
        .from('profiles')
        .select('tour_completed')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error checking tour status:', error);
        setHasCheckedTour(true);
        return;
      }

      setHasCheckedTour(true);

      // Start tour if not completed
      if (data && !data.tour_completed) {
        // Wait for page to fully render
        setTimeout(() => {
          startTour();
        }, 1500);
      }
    } catch (error) {
      console.error('Error checking tour status:', error);
      setHasCheckedTour(true);
    }
  }, [user, hasCheckedTour, authLoading, location.pathname, startTour]);

  useEffect(() => {
    checkAndStartTour();
  }, [checkAndStartTour]);

  // Reset check when user changes
  useEffect(() => {
    setHasCheckedTour(false);
  }, [user?.id]);

  // This component doesn't render anything visible
  return null;
};

export default TourWrapper;
