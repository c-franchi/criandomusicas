import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useGiftBackgrounds } from "@/hooks/useMusicalGifts";
import { supabase } from "@/integrations/supabase/client";
import { prepareGiftPhoto } from "@/lib/gifts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export default function GiftBackgroundAdmin() {
  const { t } = useTranslation("home");
  const qc = useQueryClient();
  const query = useGiftBackgrounds();
  const [label, setLabel] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="space-y-4 rounded-2xl border border-border p-5">
      <h2 className="text-xl font-semibold">{t("giftFlow.backgroundAdmin")}</h2>
      <p className="text-sm text-muted-foreground">
        {t("giftFlow.backgroundUploadHelp")}
      </p>
      <Label htmlFor="background-label">{t("giftFlow.backgroundName")}</Label>
      <Input
        id="background-label"
        value={label}
        maxLength={100}
        onChange={(e) => setLabel(e.target.value)}
      />
      <Label htmlFor="background-image">{t("giftFlow.backgroundImage")}</Label>
      <Input
        id="background-image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          setError("");
          try {
            setImage(await prepareGiftPhoto(f));
          } catch {
            setError(t("giftFlow.errors.gift_invalid_photo"));
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
      {image && (
        <img
          src={image}
          alt=""
          className="h-40 max-w-full rounded-xl object-contain"
        />
      )}
      <Button
        disabled={busy || !label.trim() || !image}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const { error } = await supabase
              .from("gift_backgrounds")
              .insert({ label: label.trim(), image_data: image! });
            if (error) throw error;
            setLabel("");
            setImage(null);
            await qc.invalidateQueries({ queryKey: ["gift-backgrounds"] });
          } catch {
            setError(t("giftFlow.genericError"));
          } finally {
            setBusy(false);
          }
        }}
      >
        {t("giftFlow.save")}
      </Button>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {query.isError && <p role="alert">{t("giftFlow.loadError")}</p>}
      <ul className="grid gap-4 sm:grid-cols-3">
        {query.data?.map((b) => (
          <li key={b.id} className="space-y-2 rounded-xl border p-3">
            <img
              src={b.image_data}
              alt=""
              className="h-28 w-full object-cover"
            />
            <p>{b.label}</p>
            <Button
              variant="outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const { error } = await supabase
                    .from("gift_backgrounds")
                    .update({ is_active: !b.is_active })
                    .eq("id", b.id)
                    .select("id")
                    .single();
                  if (error) throw error;
                  await qc.invalidateQueries({
                    queryKey: ["gift-backgrounds"],
                  });
                } catch {
                  setError(t("giftFlow.genericError"));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t(
                b.is_active
                  ? "giftFlow.hideBackground"
                  : "giftFlow.showBackground",
              )}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
