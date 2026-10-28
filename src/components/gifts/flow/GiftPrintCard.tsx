import { useTranslation } from "react-i18next";
import { giftUrl, safeImage, type MusicalGift } from "@/lib/gifts";
import GiftBackground from "./GiftBackground";
import GiftQr from "./GiftQr";
export default function GiftPrintCard({ gift: g }: { gift: MusicalGift }) {
  const { t } = useTranslation("home");
  return (
    <article className="gift-print-card mx-auto max-w-xl rounded-2xl border border-slate-200 p-8 text-center shadow-md">
      <GiftBackground details={g.details} />
      <p className="text-sm font-semibold text-violet-700">Criando Músicas</p>
      {g.is_test && (
        <p className="my-3 font-bold text-red-700">{t("giftFlow.testBadge")}</p>
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
      <GiftQr url={giftUrl(g.public_alias || g.public_token)} />
      <p className="mt-4 text-sm">{t("giftFlow.scan")}</p>
    </article>
  );
}
