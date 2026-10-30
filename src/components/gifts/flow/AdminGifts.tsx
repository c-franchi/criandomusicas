import AdminHeader from "@/components/admin/AdminHeader";
import { useFlowBusy } from '@/hooks/useFlowBusy';
import GiftProductionPanel from "./GiftProductionPanel";
import { giftAudioLimit } from "@/lib/gift-duration";
import GiftShare from "./GiftShare";
import GiftBackgroundAdmin from "./GiftBackgroundAdmin";
import { useGiftAvailability } from "@/hooks/useGiftAvailability";
import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import {
  useGift,
  useGiftCatalog,
  useGiftCommands,
  useGiftList,
  useGiftAudio,
} from "@/hooks/useMusicalGifts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  giftUrl,
  parseLrc,
  type GiftPrice,
  type GiftOperations,
} from "@/lib/gifts";
import { getLocalizedPrice } from "@/lib/i18n-format";
import type { MusicalGift, GiftPresentation } from "@/lib/gifts";
import GiftShell from "./GiftShell";
import GiftQr from "./GiftQr";
import GiftExperience from "./GiftExperience";
import PageLoader from "@/components/PageLoader";
export default function AdminGifts() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole(user?.id);
  const { t } = useTranslation("home");
  const list = useGiftList(true);
  const [productFilter,setProductFilter]=useState("all");
  const [statusFilter,setStatusFilter]=useState("all");
  const [search,setSearch]=useState("");
  const visible=(list.data||[]).filter(g=>(productFilter==="all"||g.product===productFilter)&&(statusFilter==="all"||g.status===statusFilter)&&[g.id,g.recipient_name,g.sender_name,g.production_order_id,g.checkout_order_id].some(v=>v?.toLowerCase().includes(search.toLowerCase().trim())));
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<string | undefined>(
    params.get("presente") || undefined,
  );
  useEffect(() => { setSelected(params.get('presente') || undefined); }, [params]);
  useEffect(() => { if(selected) window.scrollTo(0,0); }, [selected]);
  if (loading || roleLoading) return <PageLoader />;
  if (!user)
    return <Navigate to="/auth?redirect=%2Fadmin%2Fpresentes" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return (
    <GiftShell title={t("giftFlow.adminTitle")} header={<AdminHeader title="Cartões e presentes" description="Produção, conferência e liberação" />}>
      <Tabs defaultValue="orders">
        <TabsList className="admin-function-tabs" aria-label="Gestão de cartões">
          <TabsTrigger value="orders">{t("giftFlow.orders")}</TabsTrigger>
          <TabsTrigger value="commerce">{t("giftFlow.commerce")}</TabsTrigger>
        </TabsList>
        <TabsContent value="orders">
          <div className={selected ? "mt-6 hidden gap-3 lg:grid lg:grid-cols-3" : "mt-6 grid gap-3 sm:grid-cols-3"}>
            <Input aria-label={t('giftFlow.searchOrders')} placeholder={t('giftFlow.searchOrders')} value={search} onChange={e=>setSearch(e.target.value)} />
            <select aria-label={t('giftFlow.filterProduct')} className="min-h-12 rounded-lg border border-border bg-background px-3" value={productFilter} onChange={e=>setProductFilter(e.target.value)}><option value="all">{t('giftFlow.allOrders')}</option>{['digital','short','physical'].map(p=><option key={p} value={p}>{t(`gifts.products.${p}.name`)}</option>)}</select>
            <select aria-label={t('giftFlow.filterStatus')} className="min-h-12 rounded-lg border border-border bg-background px-3" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">{t('giftFlow.allOrders')}</option>{['DRAFT','AWAITING_PAYMENT','RECEIPT_SENT','PAID','APPROVED_TEST','PRODUCTION','ACTIVE','CANCELLED'].map(status=><option key={status} value={status}>{t('giftFlow.status.'+status)}</option>)}</select>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className={selected ? "hidden min-w-0 space-y-3 lg:block" : "min-w-0 space-y-3"}>
              {list.isPending ? (
                <p>{t("giftFlow.loading")}</p>
              ) : list.isError ? (
                <p role="alert">{t("giftFlow.loadError")}</p>
              ) : (
                visible.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setParams({presente:g.id})}
                    className={`block w-full rounded-xl border bg-card p-4 text-left ${selected === g.id ? "border-primary" : "border-border"}`}
                  >
                    <p className="font-medium">
                      {g.recipient_name || t("giftFlow.untitled")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t(`gifts.products.${g.product}.name`)} ·{" "}
                      {t("giftFlow.status." + g.status)}
                    </p>
                    {g.is_test && (
                      <p className="mt-2 text-xs text-amber-600">
                        {t("giftFlow.testBadge")}
                      </p>
                    )}
                  </button>
                ))
              )}
              {visible.length === 0 && <p>{t("giftFlow.noGifts")}</p>}
            </div>
            <div className="min-w-0">
              {selected && <Button variant="outline" className="mb-4 w-full lg:hidden" onClick={()=>setParams({})}>{t('giftFlow.adminSync.backList')}</Button>}
              {selected ? (
                <GiftAdminDetail key={selected} id={selected} />
              ) : (
                <p className="p-5 text-muted-foreground">
                  {t("giftFlow.selectOrder")}
                </p>
              )}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="commerce">
          <GiftCommerce />
        </TabsContent>
      </Tabs>
    </GiftShell>
  );
}
function GiftAdminDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const query = useGift(id);
  const { physicalEnabled } = useGiftAvailability();
  const g = query.data as unknown as MusicalGift;
  const audio = useGiftAudio(g);
  const commands = useGiftCommands();
  const { t, i18n } = useTranslation("home");
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  useFlowBusy(busy || uploadingAudio);
  const [error, setError] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [qrChecked, setQrChecked] = useState(false);
  const [note, setNote] = useState("");
  const [lrc, setLrc] = useState("");
  const [tracking, setTracking] = useState("");
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [lrcLoaded, setLrcLoaded] = useState(false);
  useEffect(() => {
    if (g && !lrcLoaded) {
      setLrc(
        g.lyric_cues
          .map(
            (c) =>
              `[${String(Math.floor(c.time / 60)).padStart(2, "0")}:${(c.time % 60).toFixed(2).padStart(5, "0")}]${c.text}`,
          )
          .join("\n"),
      );
      setLrcLoaded(true);
    }
  }, [g, lrcLoaded]);
  useEffect(() => {
    setReviewed(false);
    setQrChecked(false);
  }, [audio.data?.audio_url,g?.dedication,g?.recipient_name,g?.sender_name,g?.photo_data,g?.track_version]);
  useEffect(()=>{ setAudioDuration(audio.data?.duration_seconds || null); },[audio.data?.audio_url,audio.data?.duration_seconds]);
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
  const action = async (name: string, data: Record<string, unknown> = {}) => {
    setBusy(true);
    setError("");
    try {
      await commands.action(id, name, data);
      toast({ title: t("giftFlow.saved") });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  if (query.isPending) return <PageLoader />;
  if (query.isError || !g) return <p role="alert">{t("giftFlow.loadError")}</p>;
  const retryReady = async () => {
    setBusy(true);setError('');
    try {
      const {data,error}=await supabase.functions.invoke('send-music-ready-email',{body:{orderId:g.checkout_order_id||g.production_order_id,userId:g.owner_id}});
      if(error||!data?.success) throw Error(t('giftFlow.genericError'));
      toast({description:t('giftFlow.retryReadyDone')});
    }catch(e){setError(e instanceof Error?e.message:t('giftFlow.genericError'));}finally{setBusy(false);}
  };
  const url = g.status === "ACTIVE" ? giftUrl(g.public_alias || g.public_token, window.location.origin, g.product) : "";
  const physicalTestBlocked =
    g.product === "physical" && g.is_test && !physicalEnabled;
  return (
    <Tabs defaultValue="production" className="space-y-4">
      <TabsList className="admin-function-tabs" aria-label="Funções do presente">
        <TabsTrigger value="production">Produção e liberação</TabsTrigger>
        <TabsTrigger value="preview">Prévia do cartão</TabsTrigger>
        <TabsTrigger value="lyrics">Letra sincronizada</TabsTrigger>
      </TabsList>
      <TabsContent value="production" forceMount className="data-[state=inactive]:hidden">
      <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-xl font-semibold">{g.recipient_name}</h2>
        <p>
          {t("giftFlow.status." + g.status)}
          {g.is_test ? " · " + t("giftFlow.testBadge") : ""}
        </p>
        <p className="break-all text-xs text-muted-foreground">{g.id}</p>
        {g.amount_cents !== null && (
          <p className="font-semibold">
            {getLocalizedPrice(g.amount_cents, i18n.language, "BRL").formatted}
          </p>
        )}
        {g.voucher_code && <p className="mt-3 text-sm text-muted-foreground">{t("giftFlow.voucherAppliedLine",{code:g.voucher_code,discount:getLocalizedPrice(g.voucher_discount_cents || 0,i18n.language,"BRL").formatted})}</p>}
        <p className="whitespace-pre-line text-sm">{g.dedication}</p>
        {g.available_from && (
          <p className="text-sm">
            {t("giftFlow.releaseDate")}:{" "}
            {new Date(g.available_from).toLocaleString(i18n.language)}
          </p>
        )}
        {!!g.duration_seconds && (
          <p>{t("gifts.upTo", { seconds: g.duration_seconds })}</p>
        )}
        {g.details.address && (
          <p className="whitespace-pre-line break-words text-sm">
            {t("giftFlow.address")}: {g.details.address}
          </p>
        )}
        {physicalTestBlocked && (
          <div className="space-y-3 rounded-xl border border-border p-4">
            <p className="text-sm">{t("giftFlow.physicalDisabledBody")}</p>
            <Button asChild variant="outline">
              <Link to="/presentes/novo?produto=digital">
                {t("giftFlow.chooseDigital")}
              </Link>
            </Button>
          </div>
        )}
        {g.music_source === "new" && (
          <details>
            <summary className="cursor-pointer font-medium">
              {t("giftFlow.briefing")}
            </summary>
            <dl className="mt-4 space-y-3">
              {[
                "story",
                "relationship",
                "feelings",
                "tone",
                "style",
                "language",
                "notes",
              ].map((k) => (
                <div key={k}>
                  <dt className="text-xs font-semibold">
                    {t("giftFlow." + k)}
                  </dt>
                  <dd className="whitespace-pre-line break-words text-sm text-muted-foreground">
                    {g.details[k as keyof typeof g.details]}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        )}
        <GiftProductionPanel gift={g} onBusyChange={setUploadingAudio}/>
        {g.production_order_id && <p className="break-all text-xs text-muted-foreground">{t('giftFlow.productionId')}: {g.production_order_id}</p>}
        {g.receipt_path && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              const { data, error } = await supabase.storage
                .from("pix-receipts")
                .createSignedUrl(g.receipt_path!, 300);
              if (error) {
                fail(error);
                return;
              }
              window.open(data.signedUrl, "_blank", "noopener,noreferrer");
            }}
          >
            {t("giftFlow.viewReceipt")}
          </Button>
        )}
        {!g.checkout_order_id && g.status === "RECEIPT_SENT" && (
          <div className="space-y-4 border-t border-border pt-5">
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={reviewed}
                onCheckedChange={(v) => setReviewed(v === true)}
              />
              {t("giftFlow.reviewPayment")}
            </label>
            <Button
              disabled={busy || !reviewed}
              onClick={() => void action("confirm_payment", { reviewed: true })}
            >
              {t("giftFlow.confirmPayment")}
            </Button>
            <Label htmlFor="rejection">{t("giftFlow.rejectionReason")}</Label>
            <Textarea
              id="rejection"
              value={note}
              maxLength={1000}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button
              variant="outline"
              disabled={busy || !note.trim()}
              onClick={() => void action("reject_payment", { message: note })}
            >
              {t("giftFlow.rejectPayment")}
            </Button>
          </div>
        )}
        {!physicalTestBlocked && g.music_source==='new' && !g.production_order_id && ['PAID','APPROVED_TEST','PRODUCTION'].includes(g.status) && <Button disabled={busy} onClick={()=>void action('start_production')}>{t('giftFlow.startProduction')}</Button>}
        {!physicalTestBlocked &&
          ["PAID", "APPROVED_TEST", "PRODUCTION"].includes(g.status) && (
            <div id="gift-release" className="space-y-4 border-t border-border pt-5">
              <p className="text-sm text-muted-foreground">
                {t("giftFlow.releaseRequirements")}
              </p>
              <label className="flex items-start gap-3 text-sm">
                <Checkbox
                  checked={reviewed}
                  onCheckedChange={(v) => setReviewed(v === true)}
                />
                {t("giftFlow.reviewGift")}
              </label>
              {!!g.duration_seconds && <p className="text-sm text-muted-foreground">{t('giftFlow.durationMargin',{seconds:g.duration_seconds,max:giftAudioLimit(g.duration_seconds)})} {audioDuration!==null && t('giftFlow.measuredDuration',{seconds:audioDuration.toFixed(1)})}</p>}
              {!!g.duration_seconds &&
                audioDuration !== null &&
                audioDuration > giftAudioLimit(g.duration_seconds || 30) + 0.05 && (
                  <p role="alert" className="text-sm text-destructive">
                    {t("giftFlow.durationExceeded")}
                  </p>
                )}
              <Button
                disabled={
                  busy ||
                  uploadingAudio || audio.isError || audio.isPending ||
                  !reviewed ||
                  !audio.data?.audio_url ||
                  (g.music_source === "new" &&
                    !audio.data?.approved_lyric_id) ||
                  (!!g.duration_seconds &&
                    (!reviewed ||
                      audioDuration === null ||
                      !Number.isFinite(audioDuration) ||
                      audioDuration > giftAudioLimit(g.duration_seconds || 30) + 0.05))
                }
                onClick={() =>
                  void action("publish", {
                    reviewed: true,
                    duration_checked: reviewed,
                    audio_duration_seconds: audioDuration,
                  })
                }
              >
                {t("giftFlow.publish")}
              </Button>
            </div>
          )}
        {g.status === "ACTIVE" && (
          <div className="space-y-4 border-t border-border pt-5">
            <Button asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                {t("giftFlow.openGift")}
              </a>
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                if (window.confirm(t("giftFlow.revokeConfirm")))
                  void action("revoke");
              }}
            >
              {t("giftFlow.revoke")}
            </Button>
            <><Button variant="outline" disabled={busy||g.is_test} onClick={()=>void retryReady()} className="mb-4 min-h-12">{t('giftFlow.retryReady')}</Button><GiftShare url={url} recipient={g.recipient_name}/></>
            <GiftQr url={url} />
            {g.product === "physical" && (
              <>
                <Button asChild variant="outline">
                  <Link
                    to={`/presentes/${g.id}/imprimir`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("giftFlow.printProof")}
                  </Link>
                </Button>
                <p className="text-sm">
                  {t("giftFlow.shippingStatus." + g.shipping_status)}
                </p>
                {g.shipping_status === "PENDING" && (
                  <>
                    <label className="flex items-start gap-3 text-sm">
                      <Checkbox
                        checked={qrChecked}
                        onCheckedChange={(v) => setQrChecked(v === true)}
                      />
                      {t("giftFlow.reviewQr")}
                    </label>
                    <Button
                      disabled={busy || !qrChecked}
                      onClick={() =>
                        void action("print_ready", { qr_checked: qrChecked })
                      }
                    >
                      {t("giftFlow.printReady")}
                    </Button>
                  </>
                )}
                {g.shipping_status === "PRINT_READY" && g.details.fulfillment !== "self_print" && (
                  <>
                    <Label htmlFor="tracking-code">
                      {t("giftFlow.trackingCode")}
                    </Label>
                    <Input
                      id="tracking-code"
                      value={tracking}
                      maxLength={150}
                      onChange={(e) => setTracking(e.target.value)}
                    />
                    <Button
                      disabled={busy}
                      onClick={() => void action("shipped", { tracking })}
                    >
                      {t("giftFlow.markShipped")}
                    </Button>
                  </>
                )}
                {g.details.fulfillment !== "self_print" && ["PRINT_READY", "SHIPPED"].includes(g.shipping_status) && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => void action("delivered")}
                  >
                    {t("giftFlow.markDelivered")}
                  </Button>
                )}
              </>
            )}
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </section>
      </TabsContent>
      <TabsContent value="lyrics" forceMount className="data-[state=inactive]:hidden">
        <details className="border-t border-border pt-5">
          <summary className="cursor-pointer font-medium">
            {t("giftFlow.syncLyrics")}
          </summary>
          <p className="my-3 text-xs text-muted-foreground">
            {t("giftFlow.lrcHelp")}
          </p>
          <Textarea
            rows={5}
            value={lrc}
            maxLength={100000}
            onChange={(e) => setLrc(e.target.value)}
            aria-label={t("giftFlow.syncLyrics")}
          />
          <Button
            className="mt-3"
            disabled={busy}
            variant="outline"
            onClick={() => {
              try {
                void action("cues", { cues: parseLrc(lrc) });
              } catch (e) {
                fail(e);
              }
            }}
          >
            {t("giftFlow.saveCues")}
          </Button>
        </details>
      </TabsContent>
      <TabsContent value="preview" forceMount className="data-[state=inactive]:hidden">
      <GiftExperience
        key={g.version}
        data={{ ...g, ...audio.data } as unknown as GiftPresentation}
        preview
        onDuration={setAudioDuration}
      />
      </TabsContent>
    </Tabs>
  );
}
function GiftCommerce() {
  const catalog = useGiftCatalog();
  const { t } = useTranslation("home");
  if (catalog.isPending) return <PageLoader />;
  if (catalog.isError) return <p role="alert">{t("giftFlow.loadError")}</p>;
  return (
    <div className="mt-6 space-y-6">
      <p className="text-sm leading-relaxed text-muted-foreground">
        {t("giftFlow.priceConfigHelp")}
      </p>
      {catalog.data.prices.map((p) => (
        <PriceEditor key={p.id} price={p} />
      ))}
      <GiftBackgroundAdmin />
      <OperationsEditor initial={catalog.data.operations} />
    </div>
  );
}
function PriceEditor({ price }: { price: GiftPrice }) {
  const { t } = useTranslation("home");
  const qc = useQueryClient();
  const { toast } = useToast();
  const [value, setValue] = useState((price.price_cents / 100).toFixed(2));
  const [active, setActive] = useState(!!price.is_active);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <h3 className="font-semibold">{price.name}</h3>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label htmlFor={price.id}>{t("giftFlow.priceBrl")}</Label>
          <Input
            id={price.id}
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-2"
          />
        </div>
        <label className="flex min-h-12 items-center gap-3 text-sm">
          <Switch checked={active} onCheckedChange={setActive} />
          {t("giftFlow.sellEnabled")}
        </label>
        <Button
          disabled={busy}
          onClick={async () => {
            const cents = Math.round(Number(value.replace(",", ".")) * 100);
            if (
              !Number.isFinite(cents) ||
              cents < 0 ||
              (active && cents <= 0)
            ) {
              setError(t("giftFlow.invalidPrice"));
              return;
            }
            setBusy(true);
            setError("");
            try {
              const { error } = await supabase
                .from("pricing_config")
                .update({
                  price_cents: cents,
                  price_promo_cents: null,
                  is_active: active,
                  price_display: getLocalizedPrice(cents, "pt-BR", "BRL")
                    .formatted,
                  credits: 0,
                })
                .eq("id", price.id)
                .select("id")
                .single();
              if (error) throw error;
              void qc.invalidateQueries({ queryKey: ["gift-catalog"] });
              void qc.invalidateQueries({ queryKey: ["gift-availability"] });
              toast({ title: t("giftFlow.saved") });
            } catch {
              setError(t("giftFlow.genericError"));
            } finally {
              setBusy(false);
            }
          }}
        >
          {t("giftFlow.save")}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
function OperationsEditor({ initial }: { initial: GiftOperations }) {
  const { t } = useTranslation("home");
  const qc = useQueryClient();
  const { toast } = useToast();
  const [ops, setOps] = useState(initial);
  const [fee, setFee] = useState(
    initial.shipping_fee_cents === null
      ? ""
      : (initial.shipping_fee_cents / 100).toFixed(2),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="space-y-5 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-xl font-semibold">{t("giftFlow.operation")}</h2>
      <p className="text-sm text-muted-foreground">
        {t("giftFlow.physicalToggleHelp")}
      </p>
      {(
        ["physical_enabled", "pickup_enabled", "shipping_enabled"] as const
      ).map((key) => (
        <label key={key} className="flex items-center gap-3 text-sm">
          <Switch
            checked={ops[key]}
            onCheckedChange={(v) => setOps({ ...ops, [key]: v })}
          />
          {t("giftFlow.operations." + key)}
        </label>
      ))}
      <div className="space-y-2">
        <Label htmlFor="gift-shipping-fee">{t("giftFlow.shippingFee")}</Label>
        <Input
          id="gift-shipping-fee"
          inputMode="decimal"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
        />
      </div>
      {(["print_format", "production_estimate"] as const).map((key) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={"operation-" + key}>
            {t("giftFlow.operations." + key)}
          </Label>
          <Input
            id={"operation-" + key}
            value={ops[key] || ""}
            maxLength={key === "print_format" ? 150 : 500}
            onChange={(e) => setOps({ ...ops, [key]: e.target.value })}
          />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        {t("giftFlow.operationHelp")}
      </p>
      <Button
        disabled={busy}
        onClick={async () => {
          const cents =
            fee.trim() === ""
              ? null
              : Math.round(Number(fee.replace(",", ".")) * 100);
          if (
            (cents !== null && (!Number.isFinite(cents) || cents < 0)) ||
            (ops.physical_enabled &&
              !ops.print_format?.trim()) ||
            (ops.shipping_enabled && cents === null)
          ) {
            setError(t("giftFlow.invalidOperation"));
            return;
          }
          setBusy(true);
          setError("");
          try {
            const { error } = await supabase
              .from("gift_operations")
              .update({
                physical_enabled: ops.physical_enabled,
                pickup_enabled: ops.pickup_enabled,
                shipping_enabled: ops.shipping_enabled,
                shipping_fee_cents: cents,
                print_format: ops.print_format,
                production_estimate: ops.production_estimate,
              })
              .eq("id", true)
              .select("id")
              .single();
            if (error) throw error;
            void qc.invalidateQueries({ queryKey: ["gift-catalog"] });
            void qc.invalidateQueries({ queryKey: ["gift-availability"] });
            toast({ title: t("giftFlow.saved") });
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
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
