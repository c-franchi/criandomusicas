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
      if (loading || !user) {
        setCheckedProfile(true);
        return;
      }

      // Check if profile exists and has required data
      const { data: profileData } = await supabase
        .from("profiles")
        .select("name, avatar_url, whatsapp")
        .eq("user_id", user.id)
        .maybeSingle();

      // Show onboarding if:
      // 1. No profile exists yet (will be created on signup)
      // 2. Profile exists but name is empty/null
      // 3. Profile was just created (name might be from signup)
      const needsOnboarding = !profileData?.name || profileData.name.trim() === "";

      setShowOnboarding(needsOnboarding);
      setCheckedProfile(true);
    };

    checkProfileComplete();
  }, [user, loading]);

  const handleComplete = () => {
    setShowOnboarding(false);
    // Refresh profile data
    window.location.reload();
  };

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
