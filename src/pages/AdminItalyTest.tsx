import AdminHeader from "@/components/admin/AdminHeader";
import { useCallback, useEffect, useState, useRef } from "react";
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
type CheckoutRow = { id: string; order_id: string; status: string; amount_cents: number; items: CatalogRow[]; created_at: string; paid_at: string | null; fulfillment_order_id?: string | null; fulfillment_gift_id?: string | null };
type OrderRow = { id: string; song_title: string | null; plan_id: string | null; status: string; payment_status: string; created_at: string };

const db = supabase as any; // new IT test tables are read through RLS (admin + owner only)

export default function AdminItalyTest() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole(user?.id);
  const [params] = useSearchParams();
  const loadingRef = useRef(false);
  const [configured,setConfigured]=useState(false);
  const [missing,setMissing]=useState<string[]>([]);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [checkouts, setCheckouts] = useState<CheckoutRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!user || loadingRef.current) return;
    loadingRef.current=true;
    try {
      const [c,o,k,config]=await Promise.all([
        db.from("it_test_catalog").select("plan_id,price_id,unit_amount").eq("active",true).order("unit_amount"),
        supabase.from("orders").select("id,song_title,plan_id,status,payment_status,created_at").eq("user_id",user.id).eq("payment_status","PENDING").is("sandbox_market",null).neq("status","CANCELLED").order("created_at",{ascending:false}).limit(20),
        db.from("it_test_checkouts").select("id,order_id,status,amount_cents,items,created_at,paid_at,fulfillment_order_id,fulfillment_gift_id").order("created_at",{ascending:false}).limit(20),
        supabase.functions.invoke("create-it-test-checkout",{body:{action:"status"}}),
      ]);
      for(const result of [c,o,k,config]) if(result.error) throw result.error;
      setCatalog(c.data??[]);setOrders((o.data as OrderRow[])??[]);setCheckouts(k.data??[]);
      setConfigured(config.data?.configured===true);setMissing(config.data?.missing??[]);
    } catch { setConfigured(false);setMessage({kind:"error",text:"Não foi possível consultar o ambiente de testes. Tente atualizar a lista."}); }
    finally { loadingRef.current=false; }
  },[user]);

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
    if(!configured || busy) return;
    setBusy(orderId);setMessage(null);
    try {
      const {data,error}=await supabase.functions.invoke("create-it-test-checkout",{body:{orderId}});
      let payload=data;
      if(error) {try {payload=await (error as any).context?.json();} catch {payload=null;} }
      if(error || !payload?.url) throw Error(payload?.error || "Checkout de teste indisponível.");
      const url=new URL(payload.url);
      if(url.protocol!=="https:" || url.hostname!=="checkout.stripe.com") throw Error("Endereço de pagamento inesperado.");
      window.location.assign(url.toString());
    } catch(e) {setMessage({kind:"error",text:e instanceof Error?e.message:"Não foi possível abrir o teste."});}
    finally {setBusy(null);}
  };

  const returned = params.get("checkout");
  const returnedRow = checkouts.find((c) => c.id === returned);

  return (
    <div className="admin-workspace min-h-screen bg-background">
      <AdminHeader title="Teste de compra — Itália" description="Sandbox · EUR · sem cobrança real" />
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Button variant="ghost" asChild><Link to="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Voltar ao ADM</Link></Button>
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><FlaskConical className="h-6 w-6" />Teste de compra — Itália</h1>
        <Alert>
          <AlertTitle>Ambiente de TESTE · sem cobrança real</AlertTitle>
          <AlertDescription>Conta Stripe Sandbox (Itália), preços em EUR do catálogo de teste. Os pagamentos brasileiros não são afetados. Somente o aviso assinado do Stripe confirma o pagamento; cartões continuam dependendo da liberação no ADM e nenhuma geração é iniciada automaticamente.</AlertDescription>
        </Alert>
      </header>

      <Alert><AlertTitle>{configured ? "Configuração presente — iniciar validação" : "Compra de teste indisponível"}</AlertTitle><AlertDescription>
        {configured ? "Use apenas dados de cartão de teste da Stripe. O pedido real será preservado e uma cópia de teste será criada após a confirmação." : "Configure a chave restrita de teste e o segredo do webhook no Lovable. Nenhum pagamento será iniciado enquanto faltar a configuração."}
        {missing.length>0 && <ul className="mt-2 space-y-1">{missing.map(name=><li className="break-all" key={name}>{name}</li>)}</ul>}
      </AlertDescription></Alert>
      <Button variant="outline" onClick={()=>void load()}>Atualizar lista e configuração</Button>
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
          {catalog.map((c) => <li key={c.plan_id} className="glass-card flex flex-wrap justify-between gap-3 rounded-lg p-3 text-sm"><span className="min-w-0 break-words">{({gift_short_15:"Música curta 15s",gift_short_30:"Música curta 30s",music_full:"Música completa",gift_short_card:"Adicional de cartão",gift_digital_existing:"Cartão com música existente",gift_digital_new_15:"Cartão + música 15s",gift_digital_new_30:"Cartão + música 30s",gift_digital_new:"Cartão + música completa"} as Record<string,string>)[c.plan_id] || c.plan_id}</span><strong>{formatEurCents(c.unit_amount)}</strong></li>)}
        </ul>
        <p className="text-xs text-muted-foreground">Sem frete, impressão ou cupons no teste Itália. O preço é definido pelo servidor a partir do tipo do pedido.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Seus pedidos aguardando pagamento</h2>
        <p className="text-sm text-muted-foreground">Use o briefing de um pedido pendente como modelo. O teste não paga nem libera o pedido brasileiro: após a confirmação, cria uma cópia separada para testar aprovação e produção.</p>
        {orders.length === 0 && <p className="text-sm">Nenhum pedido pendente.</p>}
        {orders.map((o) => (
          <div key={o.id} className="glass-card flex flex-wrap items-center justify-between gap-2 rounded-lg p-3">
            <div className="text-sm"><div className="font-medium">{o.song_title || "Pedido"} <Badge variant="outline">{o.plan_id || "single"}</Badge></div><div className="text-xs text-muted-foreground">{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleString("pt-BR")}</div></div>
            <Button size="sm" onClick={() => start(o.id)} disabled={!configured || busy !== null}>{busy === o.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Pagar em TESTE (EUR)</Button>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Checkouts de teste</h2>
        {checkouts.map((c) => (
          <div key={c.id} className="glass-card flex flex-wrap justify-between gap-3 rounded-lg p-3 text-sm">
            <span>{c.order_id.slice(0, 8)} · {c.items.map((i) => i.plan_id).join(" + ")}</span>
            <span>{formatEurCents(c.amount_cents)} · <Badge>{itTestStatusLabel(c.status)}</Badge></span>
            {c.fulfillment_gift_id ? <Button asChild variant="outline"><Link to={`/admin/presentes?presente=${c.fulfillment_gift_id}`}>Abrir cópia do cartão</Link></Button> : c.fulfillment_order_id && <Button asChild variant="outline"><Link to={`/pedido/${c.fulfillment_order_id}`}>Abrir música de teste</Link></Button>}
          </div>
        ))}
      </section>
    </main>
    </div>
  );
}
