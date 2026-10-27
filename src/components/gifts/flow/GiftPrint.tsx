import { useState } from "react";
import GiftBooklet from "./GiftBooklet";
import { Label } from "@/components/ui/label";
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
  const [mode, setMode] = useState<"booklet" | "single">("booklet");
  const [paper, setPaper] = useState<"a4" | "letter">("a4");
  const [printing, setPrinting] = useState(false);
  const { t } = useTranslation("home");
  const { user, loading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole(user?.id);
  const gift = useGift(id);
  if (loading || roleLoading || (gift.isPending && !!user))
    return <PageLoader />;
  if (!user || (gift.data && gift.data.owner_id !== user.id && !isAdmin))
    return (
      <Navigate
        to={`/auth?redirect=${encodeURIComponent(`/presentes/${id}/imprimir`)}`}
        replace
      />
    );
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
    <main className="gift-print-main min-h-screen bg-white p-4 sm:p-6 text-slate-900">
      <SEO title={t("giftFlow.printProof")} noIndex />
      <style>{`@page{size:${paper === "letter" ? "letter" : "A4"} ${mode === "booklet" ? "landscape" : "portrait"};margin:${mode === "booklet" ? 10 : 12}mm}`}</style>
      <div className="gift-print-actions mx-auto mb-7 max-w-xl">
        <p className="mb-4 text-sm">{t("giftFlow.printHelp")}</p>
        <div className="grid gap-4 sm:grid-cols-2 mb-5">
          <div>
            <Label htmlFor="print-mode">{t("giftFlow.printLayout")}</Label>
            <select
              id="print-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as "booklet" | "single")}
              className="mt-2 w-full rounded-lg border p-3 bg-white"
            >
              <option value="booklet">{t("giftFlow.bookletLayout")}</option>
              <option value="single">{t("giftFlow.singleLayout")}</option>
            </select>
          </div>
          <div>
            <Label htmlFor="print-paper">{t("giftFlow.paperSize")}</Label>
            <select
              id="print-paper"
              value={paper}
              onChange={(e) => setPaper(e.target.value as "a4" | "letter")}
              className="mt-2 w-full rounded-lg border p-3 bg-white"
            >
              <option value="a4">A4</option>
              <option value="letter">{t("giftFlow.letterPaper")}</option>
            </select>
          </div>
        </div>
        {mode === "booklet" && (
          <ol className="mb-5 list-decimal pl-5 space-y-2 text-sm">
            {[
              "bookletInstruction1",
              "bookletInstruction2",
              "bookletInstruction3",
            ].map((k) => (
              <li key={k}>{t("giftFlow." + k)}</li>
            ))}
          </ol>
        )}
        <p className="mb-5 text-sm">{t("giftFlow.printScaleHelp")}</p>
        <Button
          disabled={printing}
          onClick={async () => {
            setPrinting(true);
            try {
              await Promise.all(
                Array.from(
                  document.querySelectorAll<HTMLImageElement>(
                    ".gift-booklet img,.gift-print-card img",
                  ),
                ).map((img) => img.decode().catch(() => undefined)),
              );
              window.print();
            } finally {
              setPrinting(false);
            }
          }}
        >
          {t("giftFlow.printOrPdf")}
        </Button>
      </div>
      {mode === "booklet" ? (
        <GiftBooklet gift={g as unknown as MusicalGift} paper={paper} />
      ) : (
        <GiftPrintCard gift={g as unknown as MusicalGift} />
      )}
    </main>
  );
}
