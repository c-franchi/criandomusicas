import { Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useGift } from "@/hooks/useMusicalGifts";
import { giftUrl, safeImage } from "@/lib/gifts";
import PageLoader from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import GiftQr from "./GiftQr";
export default function GiftPrint() {
  const { id } = useParams();
  const { t } = useTranslation("home");
  const { user, loading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole(user?.id);
  const gift = useGift(id);
  if (loading || roleLoading || (gift.isPending && !!user))
    return <PageLoader />;
  if (!user || !isAdmin)
    return <Navigate to="/auth?redirect=%2Fadmin%2Fpresentes" replace />;
  if (
    gift.isError ||
    !gift.data ||
    gift.data.status !== "ACTIVE" ||
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
      <article className="gift-print-card mx-auto max-w-xl rounded-2xl border border-slate-200 p-8 text-center shadow-md">
        <p className="text-sm font-semibold text-violet-700">Criando Músicas</p>
        {g.is_test && (
          <p className="my-3 font-bold text-red-700">
            {t("giftFlow.testBadge")}
          </p>
        )}
        <h1 className="my-6 font-serif text-3xl">{g.recipient_name}</h1>
        {safeImage(g.photo_data) && (
          <img
            src={safeImage(g.photo_data)}
            alt={t("giftFlow.photoAlt")}
            className="mx-auto mb-6 h-40 w-40 rounded-xl object-cover"
          />
        )}
        <p className="whitespace-pre-line break-words leading-relaxed">
          {g.dedication}
        </p>
        <p className="my-6 font-serif text-xl">{g.sender_name}</p>
        <GiftQr url={giftUrl(g.public_token)} />
        <p className="mt-4 text-sm">{t("giftFlow.scan")}</p>
      </article>
    </main>
  );
}
