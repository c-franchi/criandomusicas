import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Share2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { giftShareLinks } from "@/lib/gift-sharing";
export default function GiftShare({
  url,
  title,
  recipient,
  received = false,
}: {
  url: string;
  title?: string;
  recipient?: string;
  received?: boolean;
}) {
  const { t } = useTranslation("home");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const message = t(received?'giftFlow.shareReceivedMessage':'giftFlow.shareGiftMessage',{name:recipient?`${recipient}, `:''});
  const links = giftShareLinks(url, title || t("giftFlow.received"),message);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(links.url);
      setNotice(t("giftFlow.copied"));
    } catch {
      setNotice(t("giftFlow.copyError"));
    }
  };
  const share = async () => {
    setBusy(true);
    setNotice("");
    try {
      if (navigator.share)
        await navigator.share({
          title: title || t("giftFlow.received"),
          text: message,
          url: links.url,
        });
      else await copy();
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setNotice(t("giftFlow.shareFallback"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className="rounded-2xl border border-primary/30 bg-background p-5 text-left text-foreground space-y-4"
      aria-label={t("giftFlow.socialTitle")}
    >
      <h2 className="text-lg font-semibold">{t("giftFlow.socialTitle")}</h2>
      <p className="text-sm text-muted-foreground">
        {t("giftFlow.socialHelp")}
      </p>
      <p className="whitespace-pre-line rounded-xl bg-muted p-4 text-sm">{message}</p>
      <Button
        className="min-h-12 w-full h-auto whitespace-normal py-3"
        disabled={busy}
        onClick={() => void share()}
      >
        <Share2 className="h-4 w-4 mr-2" />
        {t("giftFlow.socialNative")}
      </Button>
      <div className="flex flex-wrap gap-2">
        {(["whatsapp", "facebook", "telegram", "x", "email"] as const).map(
          (network) => (
            <Button
              key={network}
              asChild
              variant="outline"
              className="min-h-11"
            >
              <a
                href={links[network]}
                target={network === "email" ? undefined : "_blank"}
                rel="noopener noreferrer"
              >
                {
                  {
                    whatsapp: "WhatsApp",
                    facebook: "Facebook",
                    telegram: "Telegram",
                    x: "X",
                    email: t("giftFlow.email"),
                  }[network]
                }
              </a>
            </Button>
          ),
        )}
        <Button
          variant="outline"
          className="min-h-11"
          onClick={() => void copy()}
        >
          <Copy className="h-4 w-4 mr-2" />
          {t("giftFlow.copyLink")}
        </Button>
      </div>
      <Button variant="outline" className="min-h-11" onClick={async()=>{
        try {await navigator.clipboard.writeText(message+'\n\n'+links.url);setNotice(t('giftFlow.copied'));}
        catch{setNotice(t('giftFlow.copyError'));}
      }}>{t('giftFlow.copyMessage')}</Button>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("giftFlow.instagramHelp")}
      </p>
      <input
        readOnly
        value={links.url}
        aria-label={t("giftFlow.copyLink")}
        onFocus={(e) => e.target.select()}
        className="w-full rounded-lg border bg-muted px-3 py-2 text-xs"
      />
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
    </section>
  );
}
