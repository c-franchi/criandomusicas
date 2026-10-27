import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import type { GiftPresentation } from "@/lib/gifts";
import SEO from "@/components/SEO";
import PageLoader from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import GiftExperience from "./GiftExperience";
export default function PublicGift() {
  const { token } = useParams();
  const { t } = useTranslation("home");
  const query = useQuery({
    queryKey: ["public-musical-gift", token],
    queryFn: async () => {
      if (!/^[a-f0-9]{64}$/.test(token || "")) return null;
      const { data, error } = await supabase.rpc("get_musical_gift", {
        p_token: token!,
      });
      if (error) throw error;
      return data as unknown as GiftPresentation | null;
    },
    retry: 1,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });
  if (query.isPending) return <PageLoader />;
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <SEO title={t("giftFlow.received")} canonical="/" noIndex />
      <div className="w-full max-w-xl">
        <h1 className="sr-only">{t("giftFlow.received")}</h1>
        {query.data ? (
          <GiftExperience key={token} data={query.data} />
        ) : (
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <h1 className="text-2xl font-semibold">
              {t("giftFlow.unavailableTitle")}
            </h1>
            <p className="my-5 text-sm leading-relaxed text-muted-foreground">
              {t(
                query.isError
                  ? "giftFlow.loadError"
                  : "giftFlow.unavailableBody",
              )}
            </p>
            <Button variant="outline" onClick={() => void query.refetch()}>
              {t("giftFlow.retry")}
            </Button>
          </div>
        )}
        <p className="mt-7 text-center text-xs text-muted-foreground">
          <Link to="/termos" className="underline">
            {t("giftFlow.availabilityTerms")}
          </Link>
        </p>
      </div>
    </main>
  );
}
