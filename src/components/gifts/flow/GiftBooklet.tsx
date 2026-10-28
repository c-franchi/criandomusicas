import { useTranslation } from "react-i18next";
import { giftUrl, safeImage, type MusicalGift } from "@/lib/gifts";
import GiftBackground from "./GiftBackground";
import GiftQr from "./GiftQr";
export default function GiftBooklet({
  gift: g,
  paper,
}: {
  gift: MusicalGift;
  paper: "a4" | "letter";
}) {
  const { t } = useTranslation("home");
  const panel = (content: React.ReactNode, kind: string) => (
    <section className={`gift-booklet-panel gift-booklet-${kind}`}>
      <GiftBackground details={g.details} />
      {g.is_test && (
        <p className="gift-booklet-test">{t("giftFlow.testBadge")}</p>
      )}
      {content}
    </section>
  );
  return (
    <div className={`gift-booklet gift-booklet-${paper}`}>
      <p className="gift-print-actions my-4 text-center font-semibold">
        {t("giftFlow.bookletOutside")}
      </p>
      <div className="gift-booklet-sheet" data-side="outside">
        {panel(
          <>
            <p className="gift-booklet-brand">Criando Músicas</p>
            <p className="gift-booklet-tagline">
              {t("giftFlow.bookletKeepsake")}
            </p>
            <p className="gift-booklet-small">criandomusicas.com.br</p>
          </>,
          "back",
        )}
        {panel(
          <>
            <p className="gift-booklet-brand">Criando Músicas</p>
            <h1>{t("giftFlow.received")}</h1>
            <p className="gift-booklet-name">{g.recipient_name}</p>
            {safeImage(g.photo_data) && (
              <img
                className="gift-booklet-photo"
                src={safeImage(g.photo_data)}
                alt={t("giftFlow.photoAlt")}
              />
            )}
            <p className="gift-booklet-small">{t("giftFlow.bookletOpen")}</p>
          </>,
          "front",
        )}
      </div>
      <p className="gift-print-actions my-4 text-center font-semibold">
        {t("giftFlow.bookletInside")}
      </p>
      <div className="gift-booklet-sheet" data-side="inside">
        {panel(
          <>
            <p className="gift-booklet-small">{t("giftFlow.for")}</p>
            <h2>{g.recipient_name}</h2>
            <p
              className="gift-booklet-dedication"
              style={{ fontSize: g.dedication.length + g.recipient_name.length + g.sender_name.length > 1600 ? "7.5pt" : g.dedication.length > 700 ? "9pt" : "11pt" }}
            >
              {g.dedication}
            </p>
            <p className="gift-booklet-signature">{g.sender_name}</p>
          </>,
          "message",
        )}
        {panel(
          <>
            <p className="gift-booklet-brand">{t("giftFlow.yourSong")}</p>
            {safeImage(g.photo_data) && (
              <img
                className="gift-booklet-photo"
                src={safeImage(g.photo_data)}
                alt={t("giftFlow.photoAlt")}
              />
            )}
            <div className="gift-booklet-qr">
              <GiftQr url={giftUrl(g.public_alias || g.public_token)} />
              <p className="gift-booklet-small">{t("giftFlow.scan")}</p>
            </div>
          </>,
          "music",
        )}
      </div>
    </div>
  );
}
