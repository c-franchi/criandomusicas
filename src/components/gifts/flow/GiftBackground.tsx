import { useGiftBackgrounds } from "@/hooks/useMusicalGifts";
import { safeImage, type GiftDetails } from "@/lib/gifts";
import "@/components/gifts/gifts.css";
export default function GiftBackground({
  details,
  backgroundData,
}: {
  details?: GiftDetails;
  backgroundData?: string | null;
}) {
  const { data } = useGiftBackgrounds(
    !backgroundData && !!details?.background_id,
  );
  const image = safeImage(
    backgroundData ||
      data?.find((b) => b.id === details?.background_id)?.image_data,
  );
  return (
    <div
      aria-hidden="true"
      className={`gift-design-layer gift-design-${details?.card_design || "hearts"}`}
    >
      {image && (
        <img
          src={image}
          alt=""
          className="h-full w-full object-cover opacity-30"
        />
      )}
    </div>
  );
}
