import { giftWizardSteps, giftStepKeys } from "@/lib/gift-wizard-flow";
import GiftBriefingSummary from "./GiftBriefingSummary";
import { useFlowBusy } from '@/hooks/useFlowBusy';
import { analytics } from '@/lib/analytics';
import { useBriefingTranslations } from "@/hooks/useBriefingTranslations";
import { ImageCardGrid } from "@/components/briefing/ImageCardGrid";
import { genreImages, typeImages } from "@/assets/briefing";
import { useGiftAvailability } from "@/hooks/useGiftAvailability";
import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import GiftDesignPicker from "./GiftDesignPicker";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useToast } from "@/hooks/use-toast";
import {
  useGift,
  useGiftCatalog,
  useGiftCommands,
  useGiftAudio,
  useOwnedGiftMusic,
} from "@/hooks/useMusicalGifts";
import {
  giftThemes,
  prepareGiftPhoto,
  quoteGift,
  type MusicalGift,
} from "@/lib/gifts";
import { mapGiftProduction } from "@/lib/briefingPurpose";
import { getLocalizedPrice } from "@/lib/i18n-format";
import { supabase } from "@/integrations/supabase/client";
import GiftShell from "./GiftShell";
import GiftExperience from "./GiftExperience";
import PageLoader from "@/components/PageLoader";
const selectClass =
  "w-full min-h-12 rounded-xl border border-input bg-background p-3 text-sm";
export default function GiftWizard() {
  const { user, loading } = useAuth();
  const { id } = useParams();
  const [params] = useSearchParams();
  const loc = useLocation();
  const draft = useGift(id);
  const availability = useGiftAvailability();
  const { t } = useTranslation("home");
  if (loading) return <PageLoader />;
  if (!user)
    return (
      <Navigate
        to={`/auth?redirect=${encodeURIComponent(loc.pathname + loc.search)}`}
        replace
      />
    );
  if (id && draft.isPending) return <PageLoader />;
  if (id && (draft.isError || !draft.data))
    return (
      <GiftShell title={t("giftFlow.create")}>
        <p role="alert">{t("giftFlow.loadError")}</p>
      </GiftShell>
    );
  if (
    (draft.data?.product || params.get("produto")) === "physical" &&
    !availability.physicalEnabled
  )
    return (
      <GiftShell title={t("giftFlow.physicalDisabledTitle")}>
        <p className="mb-6 text-muted-foreground">
          {t(
            availability.loading
              ? "giftFlow.loading"
              : "giftFlow.physicalDisabledBody",
          )}
        </p>
        <Button asChild>
          <Link to="/presentes/novo?produto=digital">
            {t("giftFlow.chooseDigital")}
          </Link>
        </Button>
      </GiftShell>
    );
  if (draft.data && draft.data.status !== "DRAFT")
    return <Navigate to={`/presentes/${id}`} replace />;
  return (
    <Editor
      key={id || params.get("produto")}
      initial={draft.data as unknown as MusicalGift}
      product={params.get("produto") || "digital"}
      duration={params.get("duracao")}
      source={params.get("origem")}
      selectedTheme={params.get("tema")}
      selectedDesign={params.get("modelo")}
    />
  );
}
function Editor({
  initial,
  product,
  duration,
  source,
  selectedTheme,
  selectedDesign,
}: {
  initial?: MusicalGift;
  product: string;
  duration: string | null;
  source: string | null;
  selectedTheme: string | null;
  selectedDesign: string | null;
}) {
  const { t, i18n } = useTranslation("home");
  const { user } = useAuth();
  const { isAdmin } = useAdminRole(user?.id);
  const nav = useNavigate();
  useFlowBusy(true);
  const { toast } = useToast();
  const commands = useGiftCommands();
  const { styleOptions } = useBriefingTranslations();
  const music = useOwnedGiftMusic();
  const { physicalEnabled } = useGiftAvailability();
  const catalog = useGiftCatalog();
  const [form, setForm] = useState<Partial<MusicalGift>>(
    () =>
      initial || {
        id: crypto.randomUUID(),
        product: ["digital", "short", "physical"].includes(product)
          ? (product as MusicalGift["product"])
          : "digital",
        music_source:
          source === "new" || product === "short" ? "new" : "existing",
        track_version: 1,
        recipient_name: "",
        sender_name: "",
        dedication: "",
        occasion: "",
        theme: (["christmas","love","birthday","family","birth","friendship","gratitude","tribute","wedding","any"].includes(selectedTheme || "") ? selectedTheme : "love") as MusicalGift["theme"],
        photo_data: null,
        has_card: product !== "short",
        duration_seconds: ["15", "30"].includes(duration || "")
          ? Number(duration)
          : product === "short"
            ? 30
            : null,
        delivery_channel: "link",
        available_from: null,
        details: {
          tone: "emotional",
          language: "Português",
          style: "pop",
          fulfillment: product === "physical" ? "self_print" : "pickup",
          card_design: ["hearts","flowers","celebration","classic"].includes(selectedDesign || "") ? selectedDesign! : "hearts",
        },
        version: 0,
      },
  );
  const genreOptions = styleOptions.map((option) => ({
    ...option,
    imageSrc: genreImages[option.id] || genreImages.pop,
  }));
  genreOptions.push({
    id: "infantil",
    label: t("briefing:steps.musicType.infantil"),
    imageSrc: typeImages.infantil,
  });
  // Preserve an existing draft's custom style without asking the customer to retype it.
  const savedStyle = form.details?.style;
  if (savedStyle && !genreOptions.some((option) => option.id === savedStyle)) {
    genreOptions.unshift({
      id: savedStyle,
      label: savedStyle,
      imageSrc: genreImages.pop,
    });
  }
  const previewAudio = useGiftAudio(form as MusicalGift);
  const [step, setStep] = useState(0);
  const steps = giftWizardSteps(!!form.has_card);
  const stepIndex = Math.max(0, steps.indexOf(step));
  useEffect(() => { analytics.giftStep(product, step + 1); }, [product, step]);
  const [authorized, setAuthorized] = useState(!!initial?.source_order_id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const patch = (p: Partial<MusicalGift>) =>
    setForm((old) => ({ ...old, ...p }));
  const details = (p: MusicalGift["details"]) =>
    setForm((old) => ({ ...old, details: { ...old.details, ...p } }));
  useEffect(() => {
    document.getElementById("gift-step-title")?.focus();
    window.scrollTo(0, 0);
  }, [step]);
  const validate = () => {
    if (
      step === 0 &&
      form.music_source === "existing" &&
      (!form.source_order_id || !authorized)
    )
      return "gift_music_unavailable";
    if (
      step === 1 &&
      (!form.recipient_name?.trim() ||
        !form.sender_name?.trim() ||
        (form.music_source === "new" &&
          ((form.details?.story?.trim().length || 0) < 20 ||
            !form.details?.style?.trim() ||
            !form.details?.language?.trim())))
    )
      return "gift_incomplete";
    if (step === 2 && form.has_card && !form.dedication?.trim())
      return "gift_incomplete";
    if (
      step === 3 &&
      form.product === "physical" &&
      form.details?.fulfillment === "shipping" &&
      (form.details.address?.trim().length || 0) < 20
    )
      return "gift_address_required";
    return "";
  };
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
  const persist = async () => {
    const mapped = mapGiftProduction(
      form.details?.tone || "emotional",
      form.details?.style || "pop",
    );
    const id = await commands.save(
      form.id!,
      { ...form, details: { ...form.details, music_type: mapped.musicType } },
      form.version || 0,
    );
    const { data, error } = await supabase
      .from("musical_gifts")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    patch(data as unknown as Partial<MusicalGift>);
    return id;
  };
  const finish = async (action?: string) => {
    setBusy(true);
    setError("");
    try {
      const id = await persist();
      const result = action ? await commands.action(id, action) : null;
      toast({ title: t("giftFlow.saved") });
      nav(
        (action === "submit" && result?.checkout_order_id && (analytics.giftSubmit(product), true))
          ? `/checkout/${result.checkout_order_id}`
          : `/presentes/${id}`,
      );
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  const total = catalog.data
    ? quoteGift(
        form as MusicalGift,
        catalog.data.prices,
        catalog.data.operations,
      )
    : null;
  const field = (key: keyof MusicalGift, label: string, multiline = false) => (
    <div className="space-y-2">
      <Label htmlFor={"gift-" + key}>{t("giftFlow." + label)}</Label>
      {multiline ? (
        <Textarea
          id={"gift-" + key}
          value={String(form[key] || "")}
          maxLength={key === "dedication" ? 2000 : 150}
          rows={4}
          onChange={(e) => patch({ [key]: e.target.value })}
        />
      ) : (
        <Input
          id={"gift-" + key}
          value={String(form[key] || "")}
          maxLength={150}
          onChange={(e) => patch({ [key]: e.target.value })}
        />
      )}
    </div>
  );
  return (
    <GiftShell title={t(form.has_card ? "giftFlow.create" : "giftFlow.songOnly")}>
      <p className="mb-5 text-sm text-muted-foreground">
        {t("giftFlow.step", { current: stepIndex + 1, total: steps.length })}
      </p>
      <p className="mb-5 font-medium sm:hidden">{t("giftFlow." + giftStepKeys[step])}</p>
      <progress aria-label={t("giftFlow.progress")} value={stepIndex + 1} max={steps.length} className="mb-5 h-2 w-full accent-purple-500 sm:hidden" />
      <ol
        className="mb-7 hidden gap-2 sm:grid"
        aria-label={t("giftFlow.progress")}
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map(
          (i) => (
            <li
              key={i}
              aria-current={i === step ? "step" : undefined}
              className={`rounded-xl border p-2 text-center text-[10px] sm:text-xs ${i === step ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}
            >
              {t("giftFlow." + giftStepKeys[i])}
            </li>
          ),
        )}
      </ol>
      <div
        className="mb-5 rounded-xl border border-primary/30 p-4 text-sm"
        role="status"
        aria-live="polite"
      >
        {t("giftFlow.total")}:{" "}
        <strong>
          {total === null
            ? t("giftFlow.pricePending")
            : getLocalizedPrice(total, i18n.language, "BRL").formatted}
        </strong>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
        <h2
          id="gift-step-title"
          tabIndex={-1}
          className="mb-6 text-xl font-semibold outline-none"
        >
          {t(
            "giftFlow." +
              giftStepKeys[step],
          )}
        </h2>
        {step === 0 && (
          <div className="space-y-5">
            <p className="font-medium">
              {t(`gifts.products.${form.product}.name`)}
            </p>
            <details open={!source || !duration || !!initial} className="rounded-xl border border-border p-4">
              <summary className="cursor-pointer font-medium">{t('giftFlow.simplify.choices')} · {form.music_source === 'existing' ? t('gifts.modalities.existing.title') : form.duration_seconds ? t('gifts.upTo', {seconds: form.duration_seconds}) : t('giftFlow.fullSong')}</summary>
              <div className="mt-4 space-y-5">
            {form.has_card && (
              <fieldset className="space-y-3">
                <legend className="font-medium">
                  {t("giftFlow.cardFormat")}
                </legend>
                <div className="flex flex-wrap gap-3">
                  {(["digital", "physical"] as const)
                    .filter((p) => p !== "physical" || physicalEnabled)
                    .map((p) => (
                      <Button
                        key={p}
                        variant={form.product === p ? "default" : "outline"}
                        aria-pressed={form.product === p}
                        onClick={() => {
                          patch({ product: p });
                          details({
                            fulfillment:
                              p === "physical" ? "self_print" : "pickup",
                          });
                        }}
                      >
                        {t(
                          p === "physical"
                            ? "giftFlow.printAtHome"
                            : "gifts.products.digital.name",
                        )}
                      </Button>
                    ))}
                </div>
              </fieldset>
            )}
            {form.product !== "short" && (
              <div className="grid gap-3 sm:grid-cols-2">
                {(["existing", "new"] as const).map((source) => (
                  <Button
                    key={source}
                    variant={
                      form.music_source === source ? "default" : "outline"
                    }
                    onClick={() =>
                      patch({ music_source: source, source_order_id: null, track_version: 1, duration_seconds: source === "existing" ? null : form.duration_seconds })
                    }
                    className="h-auto min-h-14 whitespace-normal py-3"
                    aria-pressed={form.music_source === source}
                  >
                    {t(`gifts.modalities.${source}.title`)}
                  </Button>
                ))}
              </div>
            )}
            {form.music_source === "new" && (
              <fieldset className="space-y-3">
                <legend className="font-medium">
                  {t("giftFlow.duration")}
                </legend>
                <div className="flex flex-wrap gap-3">
                  {(form.product === "short" ? [15, 30] : [15, 30, null]).map(
                    (seconds) => (
                      <Button
                        key={seconds || "normal"}
                        variant={
                          form.duration_seconds === seconds
                            ? "default"
                            : "outline"
                        }
                        aria-pressed={form.duration_seconds === seconds}
                        onClick={() => patch({ duration_seconds: seconds })}
                      >
                        {seconds
                          ? t("gifts.upTo", { seconds })
                          : t("giftFlow.fullSong")}
                      </Button>
                    ),
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("gifts.durationNote")}
                </p>
              </fieldset>
            )}
              </div>
            </details>
            {form.product === "short" && (
              <label className="flex items-center gap-3 text-sm">
                <Checkbox
                  checked={!!form.has_card}
                  onCheckedChange={(value) =>
                    patch({ has_card: value === true })
                  }
                />
                {t("giftFlow.addCard")}
              </label>
            )}
            {form.music_source === "new" && (
              <section className="space-y-3" aria-label={t("giftFlow.style")}>
                <h3 className="font-medium">{t("giftFlow.style")}</h3>
                <ImageCardGrid
                  options={genreOptions}
                  selectedId={form.details?.style}
                  onSelect={(style) => details({ style })}
                  title={t("giftFlow.style")}
                  variant="square"
                  showOther={false}
                />
              </section>
            )}
            {form.music_source === "existing" && (
              <>
                <Label htmlFor="source-song">{t("giftFlow.song")}</Label>
                {music.isError ? (
                  <p role="alert">{t("giftFlow.loadError")}</p>
                ) : (
                  <select
                    id="source-song"
                    className={selectClass}
                    value={
                      form.source_order_id
                        ? `${form.source_order_id}:${form.track_version}`
                        : ""
                    }
                    onChange={(e) => {
                      const [id, version] = e.target.value.split(":");
                      patch({
                        source_order_id: id || null,
                        track_version: Number(version) || 1,
                      });
                      setAuthorized(false);
                    }}
                  >
                    <option value="">
                      {t(
                        music.isPending
                          ? "giftFlow.loading"
                          : "giftFlow.selectSong",
                      )}
                    </option>
                    {music.data?.map((track) => (
                      <option
                        key={`${track.order_id}:${track.version}`}
                        value={`${track.order_id}:${track.version}`}
                      >
                        {track.title} — V{track.version}
                      </option>
                    ))}
                  </select>
                )}
                {!music.isPending && !music.data?.length && (
                  <p className="text-sm text-muted-foreground">
                    {t("giftFlow.noSongs")}{" "}
                    <Link to="/briefing" className="underline">
                      {t("giftFlow.existingFlow")}
                    </Link>
                  </p>
                )}
                {form.source_order_id && (
                  <audio
                    controls
                    preload="none"
                    className="w-full"
                    src={
                      music.data?.find(
                        (m) =>
                          m.order_id === form.source_order_id &&
                          m.version === form.track_version,
                      )?.audio_url || undefined
                    }
                  />
                )}
                <label className="flex items-start gap-3 text-sm leading-relaxed">
                  <Checkbox
                    checked={authorized}
                    onCheckedChange={(v) => setAuthorized(v === true)}
                  />
                  {t("giftFlow.authorization")}
                </label>
              </>
            )}
          </div>
        )}
        {step === 1 && (
          <div className="space-y-5">
            {field("recipient_name", "recipient")}
            {field("sender_name", "sender")}
            {form.music_source === "new" && <p className="text-sm text-muted-foreground">{t("giftFlow.simplify.storyHelp")}</p>}
            <div className="space-y-2">
              <Label htmlFor="gift-occasion">{t("giftFlow.occasion")}</Label>
              <select
                id="gift-occasion"
                className={selectClass}
                value={form.occasion || "any"}
                onChange={(e) =>
                  patch({
                    occasion: e.target.value,
                    theme: e.target.value as MusicalGift["theme"],
                  })
                }
              >
                {giftThemes.map((theme) => (
                  <option key={theme} value={theme}>
                    {t("gifts.themes." + theme)}
                  </option>
                ))}
                {form.occasion &&
                  !giftThemes.includes(
                    form.occasion as MusicalGift["theme"],
                  ) && <option value={form.occasion}>{form.occasion}</option>}
              </select>
            </div>
            {!form.has_card && field("dedication", "messageOptional", true)}
            {form.music_source === "new" && (
              <>
                {(["relationship", "feelings", "story", "notes"] as const).map(
                  (key) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={"detail-" + key}>
                        {t("giftFlow." + key)}
                      </Label>
                      <Textarea
                        id={"detail-" + key}
                        value={form.details?.[key] || ""}
                        maxLength={key === "story" ? 6000 : 1000}
                        rows={key === "story" ? 5 : 2}
                        onChange={(e) => details({ [key]: e.target.value })}
                      />
                    </div>
                  ),
                )}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tone">{t("giftFlow.tone")}</Label>
                    <select
                      id="tone"
                      value={form.details?.tone}
                      className={selectClass}
                      onChange={(e) => details({ tone: e.target.value })}
                    >
                      {[
                        "funny",
                        "emotional",
                        "romantic",
                        "festive",
                        "affectionate",
                      ].map((tone) => (
                        <option key={tone} value={tone}>
                          {t("giftFlow.tones." + tone)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(["language"] as const).map((key) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={key}>{t("giftFlow." + key)}</Label>
                      <Input
                        id={key}
                        maxLength={100}
                        value={form.details?.[key] || ""}
                        onChange={(e) => details({ [key]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {step === 2 && (
          <div className="space-y-5">
            {field(
              "dedication",
              form.has_card ? "dedication" : "messageOptional",
              true,
            )}
            {form.has_card && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="theme">{t("giftFlow.theme")}</Label>
                  <select
                    id="theme"
                    value={form.theme}
                    className={selectClass}
                    onChange={(e) =>
                      patch({ theme: e.target.value as MusicalGift["theme"] })
                    }
                  >
                    {giftThemes.map((theme) => (
                      <option key={theme} value={theme}>
                        {t("gifts.themes." + theme)}
                      </option>
                    ))}
                  </select>
                </div>
                <GiftDesignPicker
                  details={form.details || {}}
                  onChange={details}
                />
                <div className="space-y-2">
                  <Label htmlFor="photo">{t("giftFlow.photo")}</Label>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={photoBusy}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setPhotoBusy(true);
                      try {
                        patch({ photo_data: await prepareGiftPhoto(file) });
                      } catch (err) {
                        fail(err);
                      } finally {
                        setPhotoBusy(false);
                        e.target.value = "";
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("giftFlow.photoHelp")}
                  </p>
                  {form.photo_data && (
                    <>
                      <img
                        src={form.photo_data}
                        alt={t("giftFlow.photoAlt")}
                        className="h-36 w-36 rounded-xl object-cover"
                      />
                      <Button
                        variant="outline"
                        onClick={() => patch({ photo_data: null })}
                      >
                        {t("giftFlow.removePhoto")}
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
        {(step === 3 || (step === 4 && !form.has_card)) && (
          <details open={form.has_card} className="space-y-5">
            <summary className="cursor-pointer font-medium">{t("giftFlow.simplify.deliveryOptions")}</summary>
            <div className="space-y-2">
              <Label htmlFor="channel">{t("giftFlow.channel")}</Label>
              <select
                id="channel"
                value={form.delivery_channel}
                className={selectClass}
                onChange={(e) =>
                  patch({
                    delivery_channel: e.target
                      .value as MusicalGift["delivery_channel"],
                  })
                }
              >
                {["link", "whatsapp", "email"].map((channel) => (
                  <option key={channel} value={channel}>
                    {t("giftFlow.channels." + channel)}
                  </option>
                ))}
              </select>
              <p className="text-sm text-muted-foreground">
                {t("giftFlow.manualDelivery")}
              </p>
            </div>
            {form.product !== "physical" && (
              <div className="space-y-2">
                <Label htmlFor="release-date">
                  {t("giftFlow.releaseDate")}
                </Label>
                <Input
                  id="release-date"
                  type="datetime-local"
                  value={
                    form.available_from
                      ? new Date(
                          new Date(form.available_from).getTime() -
                            new Date().getTimezoneOffset() * 60000,
                        )
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    patch({
                      available_from: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t("giftFlow.releaseHelp")}
                </p>
              </div>
            )}
            {form.product === "physical" && (
              <>
                <p className="text-sm text-muted-foreground">
                  {catalog.data?.operations.print_format ||
                    t("giftFlow.physicalPending")}
                </p>
                <Label htmlFor="fulfillment">{t("giftFlow.fulfillment")}</Label>
                <select
                  id="fulfillment"
                  value={form.details?.fulfillment}
                  className={selectClass}
                  onChange={(e) => details({ fulfillment: e.target.value })}
                >
                  <option value="self_print">
                    {t("giftFlow.printAtHome")}
                  </option>
                  {catalog.data?.operations.pickup_enabled && (
                    <option value="pickup">{t("giftFlow.pickup")}</option>
                  )}
                  {catalog.data?.operations.shipping_enabled && (
                    <option value="shipping">{t("giftFlow.shipping")}</option>
                  )}
                </select>
                {form.details?.fulfillment === "shipping" && (
                  <div className="space-y-2">
                    <Label htmlFor="address">{t("giftFlow.address")}</Label>
                    <Textarea
                      id="address"
                      rows={4}
                      value={form.details.address || ""}
                      maxLength={1500}
                      onChange={(e) => details({ address: e.target.value })}
                    />
                  </div>
                )}
              </>
            )}
          </details>
        )}
        {step === 4 && (
          <div className="grid gap-7 md:grid-cols-2">
            {form.has_card ? <GiftExperience
              key={JSON.stringify([form.theme, form.photo_data])}
              data={{ ...form, ...previewAudio.data } as MusicalGift}
              preview
            /> : <p className="rounded-xl bg-muted p-4 text-sm">{t("giftFlow.newMusicPreview")}</p>}
            <div className="space-y-4">
              <h3 className="font-semibold">{t("giftFlow.summary")}</h3>
              {form.music_source === "new" && form.has_card && (
                <p
                  role="status"
                  className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm leading-relaxed"
                >
                  {t("giftFlow.newMusicPreview")}
                </p>
              )}
              <p>{t(`gifts.products.${form.product}.name`)}</p>
              <p>
                {t("giftFlow.recipient")}: {form.recipient_name}
              </p>
              {form.duration_seconds && (
                <p>{t("gifts.upTo", { seconds: form.duration_seconds })}</p>
              )}
              <GiftBriefingSummary gift={form} />
              <Button variant="outline" onClick={() => setStep(1)}>{t("giftFlow.simplify.editStory")}</Button>
              <p className="text-2xl font-semibold">
                {total === null
                  ? t("giftFlow.pricePending")
                  : getLocalizedPrice(total, i18n.language, "BRL").formatted}
              </p>
              {catalog.data?.operations.production_estimate && (
                <p className="text-sm">
                  {catalog.data.operations.production_estimate}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {t("giftFlow.pixHelp")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("giftFlow.productionHelp")}
              </p>
              {form.product === "physical" && (
                <p className="text-sm text-muted-foreground">
                  {t("giftFlow.shippingIncluded")}
                </p>
              )}
              <Button
                onClick={() => void finish("submit")}
                disabled={busy || photoBusy || total === null}
                className="h-auto min-h-12 w-full whitespace-normal py-3"
              >
                {t("giftFlow.proceedPix")}
              </Button>
              {total === null && (
                <p role="status" className="text-sm text-muted-foreground">
                  {t("giftFlow.canSaveDraft")}
                </p>
              )}
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => void finish("test")}
                  disabled={busy || photoBusy}
                  className="h-auto min-h-12 w-full whitespace-normal py-3"
                >
                  {t("giftFlow.adminTest")}
                </Button>
              )}
            </div>
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-destructive/30 p-4 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-5">
          {step > 0 && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => { setError(""); setStep(steps[stepIndex - 1]); }}
            >
              {t("giftFlow.previous")}
            </Button>
          )}
          {step < 4 && (
            <Button
              disabled={busy || photoBusy}
              onClick={() => {
                const e = validate();
                if (e) setError(t("giftFlow.errors." + e));
                else {
                  setError("");
                  setStep(steps[stepIndex + 1]);
                }
              }}
            >
              {t("giftFlow.next")}
            </Button>
          )}
          <Button
            variant="ghost"
            disabled={busy || photoBusy}
            onClick={() => void finish()}
          >
            {t(busy ? "giftFlow.saving" : "giftFlow.saveDraft")}
          </Button>
        </div>
      </div>
    </GiftShell>
  );
}
