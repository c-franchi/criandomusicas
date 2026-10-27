import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useGiftBackgrounds } from "@/hooks/useMusicalGifts";
import type { GiftDetails } from "@/lib/gifts";
const cardDesigns = ["hearts", "flowers", "celebration", "classic"] as const;
export default function GiftDesignPicker({
  details,
  onChange,
}: {
  details: GiftDetails;
  onChange: (d: GiftDetails) => void;
}) {
  const { t } = useTranslation("home");
  const backgrounds = useGiftBackgrounds();
  return (
    <fieldset className="space-y-3">
      <legend className="font-semibold">{t("giftFlow.cardDesign")}</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cardDesigns.map((design) => (
          <Button
            key={design}
            variant={
              !details.background_id &&
              (details.card_design || "hearts") === design
                ? "default"
                : "outline"
            }
            className={`gift-design-${design} relative h-24 overflow-hidden whitespace-normal`}
            aria-pressed={
              !details.background_id &&
              (details.card_design || "hearts") === design
            }
            onClick={() => onChange({ card_design: design, background_id: "" })}
          >
            {t("giftFlow.designs." + design)}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {t("giftFlow.backgroundHelp")}
      </p>
      {backgrounds.isError && <p role="alert">{t("giftFlow.loadError")}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {backgrounds.data
          ?.filter((b) => b.is_active)
          .map((b) => (
            <button
              type="button"
              key={b.id}
              aria-pressed={details.background_id === b.id}
              className={`overflow-hidden rounded-xl border p-2 text-sm ${details.background_id === b.id ? "border-primary ring-2 ring-primary" : "border-border"}`}
              onClick={() =>
                onChange({ background_id: b.id, card_design: "classic" })
              }
            >
              <img
                src={b.image_data}
                alt=""
                className="mb-2 aspect-[4/3] w-full rounded-lg object-cover"
              />
              {b.label}
            </button>
          ))}
      </div>
    </fieldset>
  );
}
