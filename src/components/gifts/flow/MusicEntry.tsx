import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useGiftAvailability } from "@/hooks/useGiftAvailability";
import GiftShell from "./GiftShell";
export default function MusicEntry() {
  const { t } = useTranslation("home");
  const { physicalEnabled } = useGiftAvailability();
  const [card, setCard] = useState(true);
  const [physical, setPhysical] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const target =
    !card && !duration
      ? "/briefing"
      : `/presentes/novo?produto=${card ? (physical && physicalEnabled ? "physical" : "digital") : "short"}&duracao=${duration || "normal"}&origem=new`;
  return (
    <GiftShell title={t("giftFlow.entryTitle")}>
      <div className="space-y-7 rounded-2xl border border-border bg-card p-5 sm:p-8">
        <fieldset>
          <legend className="mb-3 font-semibold">
            {t("giftFlow.withCardQuestion")}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {[true, false].map((value) => (
              <Button
                key={String(value)}
                variant={card === value ? "default" : "outline"}
                aria-pressed={card === value}
                onClick={() => setCard(value)}
                className="h-auto min-h-14 whitespace-normal"
              >
                {t(value ? "giftFlow.withCard" : "giftFlow.songOnly")}
              </Button>
            ))}
          </div>
        </fieldset>
        {card && (
          <fieldset>
            <legend className="mb-3 font-semibold">
              {t("giftFlow.cardFormat")}
            </legend>
            <div className="flex flex-wrap gap-3">
              <Button
                variant={!physical ? "default" : "outline"}
                aria-pressed={!physical}
                onClick={() => setPhysical(false)}
              >
                {t("gifts.products.digital.name")}
              </Button>
              {physicalEnabled && (
                <Button
                  variant={physical ? "default" : "outline"}
                  aria-pressed={physical}
                  onClick={() => setPhysical(true)}
                >
                  {t("giftFlow.printAtHome")}
                </Button>
              )}
            </div>
            {physical && physicalEnabled && (
              <p className="mt-3 text-sm text-muted-foreground">
                {t("giftFlow.selfPrintHelp")}
              </p>
            )}
          </fieldset>
        )}
        <fieldset>
          <legend className="mb-3 font-semibold">
            {t("giftFlow.duration")}
          </legend>
          <div className="flex flex-wrap gap-3">
            {[15, 30, null].map((seconds) => (
              <Button
                key={seconds || "normal"}
                variant={duration === seconds ? "default" : "outline"}
                aria-pressed={duration === seconds}
                onClick={() => setDuration(seconds)}
              >
                {seconds
                  ? t("gifts.upTo", { seconds })
                  : t("giftFlow.fullSong")}
              </Button>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("gifts.durationNote")}
          </p>
        </fieldset>
        <Button asChild className="min-h-12">
          <Link to={target}>{t("giftFlow.next")}</Link>
        </Button>
      </div>
    </GiftShell>
  );
}
