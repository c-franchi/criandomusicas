import { Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useGift } from "@/hooks/useMusicalGifts";
import PageLoader from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import GiftPrintCard from "./GiftPrintCard";
import type { MusicalGift } from "@/lib/gifts";
export default function GiftPrint() {
  const { id } = useParams();
  const { t } = useTranslation("home");
  const { user, loading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole(user?.id);
  const gift = useGift(id);
  if (loading || roleLoading || (gift.isPending && !!user))
    return <PageLoader />;
  if (!user || (gift.data && gift.data.owner_id !== user.id && !isAdmin))
    return <Navigate to={`/auth?redirect=${encodeURIComponent(`/presentes/${id}/imprimir`)}`} replace />;
  if (
    gift.isError ||
    !gift.data ||
    gift.data.status !== "ACTIVE" ||
    (gift.data.available_from &&
      new Date(gift.data.available_from).getTime() > Date.now()) ||
    gift.data.product !== "physical"
  )
    return <p className="p-8">{t("giftFlow.notPrintReady")}</p>;
  const g = gift.data;
  return (
    <main className="min-h-screen bg-white p-6 text-slate-900">
      <SEO title={t("giftFlow.printProof")} noIndex />
      <style>
        {
          "@media print{.gift-print-actions{display:none!important}.gift-print-card{box-shadow:none!important;break-inside:avoid}body{background:white!important}}"
        }
      </style>
      <div className="gift-print-actions mx-auto mb-7 max-w-xl">
        <p className="mb-4 text-sm">{t("giftFlow.printHelp")}</p>
        <Button onClick={() => window.print()}>{t("giftFlow.print")}</Button>
      </div>
      <GiftPrintCard gift={g as unknown as MusicalGift} />
    </main>
  );
}
