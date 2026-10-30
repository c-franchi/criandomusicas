import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, FlaskConical, ArrowLeft } from "lucide-react";
import { formatEurCents, itTestStatusLabel } from "@/lib/itTestCheckout";

type CatalogRow = { plan_id: string; price_id: string; unit_amount: number };
type CheckoutRow = { id: string; order_id: string; status: string; amount_cents: number; items: CatalogRow[]; created_at: string; paid_at: string | null };
type OrderRow = { id: string; song_title: string | null; plan_id: string | null; status: string; payment_status: string; created_at: string };

const db = supabase as any; // new IT test tables are read through RLS (admin + owner only)

export default function AdminItalyTest() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole(user?.id);
  const [params] = useSearchParams();
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [checkouts, setCheckouts] = useState<CheckoutRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [c, o, k] = await Promise.all([
      db.from("it_test_catalog").select("plan_id,price_id,unit_amount").eq("active", true).order("unit_amount"),
      supabase.from("orders").select("id,song_title,plan_id,status,payment_status,created_at").eq("user_id", user.id).eq("payment_status", "PENDING").neq("status", "CANCELLED").order("created_at", { ascending: false }).limit(20),
      db.from("it_test_checkouts").select("id,order_id,status,amount_cents,items,created_at,paid_at").order("created_at", { ascending: false }).limit(20),
    ]);
    setCatalog(c.data ?? []);
    setOrders((o.data as OrderRow[]) ?? []);
    setCheckouts(k.data ?? []);
  }, [user]);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);
  // After returning from Stripe, only the webhook can confirm; poll the stored status.
  useEffect(() => {
    if (!isAdmin || !params.get("checkout")) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [isAdmin, params, load]);

  if (authLoading || roleLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  const start = async (orderId: string) => {
    setBusy(orderId); setMessage(null);
    const { data, error } = await supabase.functions.invoke("create-it-test-checkout", { body: { orderId } });
    setBusy(null);
    const payload = (data ?? (error as any)?.context && await (error as any).context.json?.().catch(() => null)) as any;
    if (payload?.url) { window.open(payload.url, "_blank", "noopener"); setMessage({ kind: "info", text: `Checkout de TESTE aberto: ${formatEurCents(payload.amount_cents)}. Use um cartão de teste do Stripe; nenhuma cobrança real.` }); load(); return; }
    setMessage({ kind: "error", text: payload?.error || "Checkout de teste indisponível." });
  };

  const returned = params.get("checkout");
  const returnedRow = checkouts.find((c) => c.id === returned);

  return (
    <main className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Button variant="ghost" asChild><Link to="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Voltar ao ADM</Link></Button>
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><FlaskConical className="h-6 w-6" />Teste de compra — Itália</h1>
        <Alert>
          <AlertTitle>Ambiente de TESTE · sem cobrança real</AlertTitle>
          <AlertDescription>Conta Stripe Sandbox (Itália), preços em EUR do catálogo de teste. Os pagamentos brasileiros não são afetados. Somente o aviso assinado do Stripe confirma o pagamento; cartões continuam dependendo da liberação no ADM e nenhuma geração é iniciada automaticamente.</AlertDescription>
        </Alert>
      </header>

      {returned && (
        <Alert>
          <AlertTitle>Retorno do checkout de teste</AlertTitle>
          <AlertDescription>{returnedRow ? `Situação confirmada pelo servidor: ${itTestStatusLabel(returnedRow.status)}` : "Aguardando confirmação do servidor…"}</AlertDescription>
        </Alert>
      )}
      {message && <Alert variant={message.kind === "error" ? "destructive" : "default"}><AlertDescription>{message.text}</AlertDescription></Alert>}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Catálogo de teste (EUR)</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {catalog.map((c) => <li key={c.plan_id} className="glass-card flex justify-between rounded-lg p-3 text-sm"><span>{c.plan_id}</span><strong>{formatEurCents(c.unit_amount)}</strong></li>)}
        </ul>
        <p className="text-xs text-muted-foreground">Sem frete, impressão ou cupons no teste Itália. O preço é definido pelo servidor a partir do tipo do pedido.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Seus pedidos aguardando pagamento</h2>
        <p className="text-sm text-muted-foreground">Crie o pedido normalmente (briefing ou cartão) e volte aqui para pagar no teste.</p>
        {orders.length === 0 && <p className="text-sm">Nenhum pedido pendente.</p>}
        {orders.map((o) => (
          <div key={o.id} className="glass-card flex flex-wrap items-center justify-between gap-2 rounded-lg p-3">
            <div className="text-sm"><div className="font-medium">{o.song_title || "Pedido"} <Badge variant="outline">{o.plan_id || "single"}</Badge></div><div className="text-xs text-muted-foreground">{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleString("pt-BR")}</div></div>
            <Button size="sm" onClick={() => start(o.id)} disabled={busy !== null}>{busy === o.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Pagar em TESTE (EUR)</Button>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Checkouts de teste</h2>
        {checkouts.map((c) => (
          <div key={c.id} className="glass-card flex justify-between rounded-lg p-3 text-sm">
            <span>{c.order_id.slice(0, 8)} · {c.items.map((i) => i.plan_id).join(" + ")}</span>
            <span>{formatEurCents(c.amount_cents)} · <Badge>{itTestStatusLabel(c.status)}</Badge></span>
          </div>
        ))}
      </section>
    </main>
  );
}
