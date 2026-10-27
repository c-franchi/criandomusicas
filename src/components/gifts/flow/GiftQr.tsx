import { useMemo } from "react";
import qrcode from "qrcode-generator";
import { useTranslation } from "react-i18next";
export default function GiftQr({ url }: { url: string }) {
  const { t } = useTranslation("home");
  const src = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(url, "Byte");
    qr.make();
    return (
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(
        qr.createSvgTag({ cellSize: 5, margin: 20, scalable: true }),
      )
    );
  }, [url]);
  return (
    <img
      src={src}
      alt={t("giftFlow.qrAlt")}
      className="mx-auto h-52 w-52 max-w-full rounded-lg bg-white p-2"
    />
  );
}
