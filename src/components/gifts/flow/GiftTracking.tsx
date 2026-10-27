import { useGiftAvailability } from "@/hooks/useGiftAvailability";
import { useAdminRole } from "@/hooks/useAdminRole";
import { visibleGiftProducts } from "@/components/gifts/products";
import { useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import {
  useGift,
  useGiftCommands,
  useGiftList,
  useGiftAudio,
} from "@/hooks/useMusicalGifts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getLocalizedPrice } from "@/lib/i18n-format";
import { giftUrl, type MusicalGift, type GiftPresentation } from "@/lib/gifts";
import GiftShell from "./GiftShell";
import GiftExperience from "./GiftExperience";
import GiftQr from "./GiftQr";
import PageLoader from "@/components/PageLoader";
export function GiftList() {
  const { user, loading } = useAuth();
  const { t, i18n } = useTranslation("home");
  const query = useGiftList();
  const { physicalEnabled } = useGiftAvailability();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth?redirect=%2Fpresentes" replace />;
  return (
    <GiftShell title={t("giftFlow.myGifts")}>
      <div className="mb-7 flex flex-wrap gap-3">
        {visibleGiftProducts(physicalEnabled).map(({ id: p }) => (
          <Button
            key={p}
            asChild
            variant="outline"
            className="h-auto min-h-12 whitespace-normal py-3"
          >
            <Link to={`/presentes/novo?produto=${p}`}>
              {t(`gifts.products.${p}.name`)}
            </Link>
          </Button>
        ))}
      </div>
      {query.isPending ? (
        <p>{t("giftFlow.loading")}</p>
      ) : query.isError ? (
        <p role="alert">{t("giftFlow.loadError")}</p>
      ) : !query.data.length ? (
        <p className="text-muted-foreground">{t("giftFlow.noGifts")}</p>
      ) : (
        <div className="space-y-4">
          {query.data.map((g) => (
            <Link
              key={g.id}
              to={`/presentes/${g.id}`}
              className="block rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">
                  {g.recipient_name || t("giftFlow.untitled")} —{" "}
                  {t(`gifts.products.${g.product}.name`)}
                </h2>
                <span className="text-sm text-primary">
                  {t("giftFlow.status." + g.status)}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {new Date(g.created_at).toLocaleString(i18n.language)}
                {g.is_test ? " · " + t("giftFlow.testBadge") : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </GiftShell>
  );
}
export default function GiftTracking() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const loc = useLocation();
  const { t } = useTranslation("home");
  const query = useGift(id);
  if (loading) return <PageLoader />;
  if (!user)
    return (
      <Navigate
        to={`/auth?redirect=${encodeURIComponent(loc.pathname)}`}
        replace
      />
    );
  if (query.isPending) return <PageLoader />;
  if (query.isError || !query.data)
    return (
      <GiftShell title={t("giftFlow.tracking")}>
        <p role="alert">{t("giftFlow.loadError")}</p>
      </GiftShell>
    );
  return <TrackingContent gift={query.data} />;
}
function TrackingContent({ gift: g }: { gift: MusicalGift }) {
  const { t, i18n } = useTranslation("home");
  const { toast } = useToast();
  const commands = useGiftCommands();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const audio = useGiftAudio(g);
  const { user } = useAuth();
  const { isAdmin } = useAdminRole(user?.id);
  const { physicalEnabled } = useGiftAvailability();
  const history = useQuery({
    queryKey: ["gift-history", g.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("musical_gift_events")
        .select("id,event,created_at")
        .eq("gift_id", g.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const pix = useQuery({
    queryKey: ["gift-pix"],
    enabled: ["AWAITING_PAYMENT", "RECEIPT_SENT"].includes(g.status),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pix_config")
        .select("pix_key,pix_name,qr_code_url")
        .eq("is_active", true)
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });
  const fail = (e: unknown) => {
    const code =
      e && typeof e === "object" && "message" in e
        ? String(e.message)
        : String(e);
    setError(
      t("giftFlow.errors." + code, {
        defaultValue: t("giftFlow.genericError"),
      }),
    );
  };
  const action = async (name: string) => {
    setBusy(true);
    setError("");
    try {
      await commands.action(g.id, name);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file?: File) => {
    if (!file) return;
    if (
      file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
        file.type,
      )
    ) {
      setError(t("giftFlow.receiptHelp"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const ext =
        file.type === "application/pdf"
          ? "pdf"
          : file.type === "image/png"
            ? "png"
            : file.type === "image/webp"
              ? "webp"
              : "jpg";
      const path = `${g.owner_id}/${g.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("pix-receipts")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      await commands.action(g.id, "receipt", { path });
      toast({ title: t("giftFlow.receiptSent") });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  const url = g.status === "ACTIVE" ? giftUrl(g.public_token) : "";
  return (
    <GiftShell title={t("giftFlow.tracking")}>
      <div className="mb-7 rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <p className="text-xl font-semibold">{g.recipient_name}</p>
        <p className="mt-2 text-primary" role="status">
          {t("giftFlow.status." + g.status)}
        </p>
        {g.is_test && <p className="mt-3 text-sm">{t("giftFlow.testBadge")}</p>}
        {g.admin_message && (
          <p className="mt-3 whitespace-pre-line text-sm">{g.admin_message}</p>
        )}
        {g.amount_cents && (
          <p className="mt-4 font-semibold">
            {getLocalizedPrice(g.amount_cents, i18n.language, "BRL").formatted}
          </p>
        )}
        {g.available_from && (
          <p className="mt-3 text-sm">
            {t("giftFlow.releaseDate")}:{" "}
            {new Date(g.available_from).toLocaleString(i18n.language)}
          </p>
        )}
      </div>
      {g.music_source === "new" && !audio.data?.audio_url && (
        <section
          role="status"
          className="mb-7 space-y-4 rounded-2xl border border-primary/30 bg-primary/5 p-5"
        >
          <h2 className="text-lg font-semibold">
            {t("giftFlow.musicNotReadyTitle")}
          </h2>
          <p className="text-sm leading-relaxed">
            {t(
              g.production_order_id
                ? "giftFlow.musicProductionPending"
                : "giftFlow.musicProductionNotStarted",
            )}
          </p>
          {isAdmin && (
            <Button asChild variant="outline">
              <Link to={`/admin/presentes?presente=${g.id}`}>
                {t("giftFlow.manageProduction")}
              </Link>
            </Button>
          )}
        </section>
      )}
      {g.product === "physical" && !physicalEnabled && (
        <section className="mb-7 space-y-4 rounded-xl border border-border p-5">
          <p className="text-sm">{t("giftFlow.physicalDisabledBody")}</p>
          <Button asChild>
            <Link to="/presentes/novo?produto=digital">
              {t("giftFlow.chooseDigital")}
            </Link>
          </Button>
        </section>
      )}
      {g.checkout_order_id &&
        ["AWAITING_PAYMENT", "RECEIPT_SENT"].includes(g.status) && (
          <Button asChild className="mb-6">
            <Link to={`/checkout/${g.checkout_order_id}`}>
              {t("giftFlow.openCheckout")}
            </Link>
          </Button>
        )}
      {g.production_order_id && (g.is_test || g.payment_confirmed_at) && (
        <section className="mb-7 space-y-4 rounded-xl border border-primary/30 p-5">
          <h2 className="font-semibold">
            {t("giftFlow.customerApprovalTitle")}
          </h2>
          <p className="text-sm">{t("giftFlow.customerApprovalBody")}</p>
          <Button asChild>
            <Link to={`/criar-musica?orderId=${g.production_order_id}`}>
              {t("giftFlow.reviewLyrics")}
            </Link>
          </Button>
        </section>
      )}
      {g.status === "AWAITING_PAYMENT" && (
        <Button
          className="mb-6"
          variant="outline"
          disabled={busy}
          onClick={() => void action("cancel")}
        >
          {t("giftFlow.cancelOrder")}
        </Button>
      )}
      {g.status === "DRAFT" && (
        <div className="mb-7 flex flex-wrap gap-3">
          <Button asChild>
            <Link to={`/presentes/${g.id}/editar`}>
              {t("giftFlow.continueDraft")}
            </Link>
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void action("cancel")}
          >
            {t("giftFlow.cancel")}
          </Button>
        </div>
      )}
      {!g.checkout_order_id &&
        ["AWAITING_PAYMENT", "RECEIPT_SENT"].includes(g.status) && (
          <section className="mb-8 rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 text-xl font-semibold">
              {t("giftFlow.payment")}
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              {t("giftFlow.pixHelp")}
            </p>
            {pix.isPending ? (
              <p>{t("giftFlow.loading")}</p>
            ) : pix.isError ? (
              <p role="alert">{t("giftFlow.pixUnavailable")}</p>
            ) : (
              <>
                <p className="font-medium">{pix.data.pix_name}</p>
                <code className="my-4 block break-all rounded-lg bg-muted p-4 text-sm">
                  {pix.data.pix_key}
                </code>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(pix.data.pix_key);
                      toast({ title: t("giftFlow.copied") });
                    } catch {
                      setError(t("giftFlow.copyError"));
                    }
                  }}
                >
                  {t("giftFlow.copyPix")}
                </Button>
                {pix.data.qr_code_url && (
                  <img
                    src={pix.data.qr_code_url}
                    alt={t("giftFlow.pixQr")}
                    className="mt-5 h-48 w-48 object-contain"
                  />
                )}
                <p className="mt-5 text-sm">{t("giftFlow.receiptHelp")}</p>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="mt-3"
                  disabled={busy}
                  onChange={(e) => {
                    void upload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </>
            )}
            {g.status === "RECEIPT_SENT" && (
              <p className="mt-5 text-sm font-medium">
                {t("giftFlow.waitingApproval")}
              </p>
            )}
          </section>
        )}
      {error && (
        <p
          role="alert"
          className="mb-6 rounded-xl border border-destructive/30 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <div className="grid gap-7 md:grid-cols-2">
        <GiftExperience
          key={g.version}
          data={{ ...g, ...audio.data } as GiftPresentation}
          preview
        />
        <section className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-xl font-semibold">{t("giftFlow.delivery")}</h2>
          {g.status === "ACTIVE" ? (
            <>
              <p className="text-sm text-muted-foreground">
                {t("giftFlow.linkReady")}
              </p>
              <code className="block break-all rounded-xl bg-muted p-3 text-xs">
                {url}
              </code>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {t("giftFlow.openGift")}
                  </a>
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url);
                      toast({ title: t("giftFlow.copied") });
                    } catch {
                      setError(t("giftFlow.copyError"));
                    }
                  }}
                >
                  {t("giftFlow.copyLink")}
                </Button>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(url)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a
                    href={`mailto:?subject=${encodeURIComponent(t("giftFlow.received"))}&body=${encodeURIComponent(url)}`}
                  >
                    {t("giftFlow.email")}
                  </a>
                </Button>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("giftFlow.manualDelivery")}
              </p>
              <GiftQr url={url} />
              {g.product === "physical" && (
                <>
                  <p>{t("giftFlow.shippingStatus." + g.shipping_status)}</p>
                  {g.tracking_code && (
                    <p className="break-all text-sm">
                      {t("giftFlow.trackingCode")}: {g.tracking_code}
                    </p>
                  )}
                </>
              )}
            </>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("giftFlow.releaseRequirements")}
            </p>
          )}
          {g.production_order_id && (
            <Button asChild variant="outline">
              <Link to={`/pedido/${g.production_order_id}`}>
                {t("giftFlow.followMusic")}
              </Link>
            </Button>
          )}
          <h3 className="border-t border-border pt-5 font-semibold">
            {t("giftFlow.history")}
          </h3>
          {history.isError ? (
            <p className="text-sm">{t("giftFlow.loadError")}</p>
          ) : (
            <ol className="space-y-3">
              {history.data?.map((e) => (
                <li key={e.id} className="text-sm">
                  <p>
                    {t("giftFlow.events." + e.event, { defaultValue: e.event })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString(i18n.language)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </GiftShell>
  );
}
