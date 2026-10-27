import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GiftAvailabilityContext } from "@/hooks/useGiftAvailability";

export default function GiftAvailabilityProvider({
  children,
}: {
  children: ReactNode;
}) {
  const query = useQuery({
    queryKey: ["gift-availability"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_operations")
        .select("physical_enabled")
        .eq("id", true)
        .single();
      if (error) throw error;
      return data.physical_enabled;
    },
    refetchInterval: 30000,
  });
  return (
    <GiftAvailabilityContext.Provider
      value={{
        physicalEnabled: !query.isError && query.data === true,
        loading: query.isPending,
      }}
    >
      {children}
    </GiftAvailabilityContext.Provider>
  );
}
