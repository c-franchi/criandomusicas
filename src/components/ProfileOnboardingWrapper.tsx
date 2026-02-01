import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import ProfileOnboarding from "./ProfileOnboarding";
import { supabase } from "@/integrations/supabase/client";

const ProfileOnboardingWrapper = () => {
  const { user, profile, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkedProfile, setCheckedProfile] = useState(false);

  useEffect(() => {
    const checkProfileComplete = async () => {
      // Wait for auth to fully load
      if (loading) {
        return;
      }
      
      // No user = no onboarding needed
      if (!user) {
        setCheckedProfile(true);
        setShowOnboarding(false);
        return;
      }

      // First, check the profile from useAuth (already fetched)
      if (profile?.name && profile.name.trim() !== "") {
        setShowOnboarding(false);
        setCheckedProfile(true);
        return;
      }

      // If profile from useAuth is incomplete, double-check with a fresh query
      // This handles race conditions where profile might not be loaded yet
      try {
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error checking profile:", error);
          // On error, don't show onboarding to avoid blocking existing users
          setShowOnboarding(false);
          setCheckedProfile(true);
          return;
        }

        // Show onboarding only if profile doesn't exist or name is empty
        const needsOnboarding = !profileData?.name || profileData.name.trim() === "";
        setShowOnboarding(needsOnboarding);
      } catch (err) {
        console.error("Error in profile check:", err);
        setShowOnboarding(false);
      }
      
      setCheckedProfile(true);
    };

    checkProfileComplete();
  }, [user, profile, loading]);

  const handleComplete = () => {
    setShowOnboarding(false);
    // Refresh profile data
    window.location.reload();
  };

  // Don't render anything until we've checked
  if (!checkedProfile || loading || !user || !showOnboarding) {
    return null;
  }

  return (
    <ProfileOnboarding
      open={showOnboarding}
      onComplete={handleComplete}
      userId={user.id}
      userEmail={user.email || ""}
      initialName={profile?.name}
    />
  );
};

export default ProfileOnboardingWrapper;
