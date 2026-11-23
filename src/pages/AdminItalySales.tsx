import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Euro,
  Loader2,
  Music2,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import AdminHeader from "@/components/admin/AdminHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import {
  filterItalySales,
  formatItalyEur,
  italyPaymentStatusLabel,
  summarizeItalySales,
  type ItalyPayment,
  type ItalySaleOrder,
  type ItalySaleProfile,
  type ItalySaleRow,
  type ItalySalesFilter,
} from "@/lib/italy-sales";

const PAGE_SIZE = 250;
const paymentFields = "id,order_id,user_id,plan_id,price_id,amount_cents,currency,session_id,status,paid_at,created_at,updated_at";
const orderFields = "id,song_title,music_style,language,status,payment_status";

const productionLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  AWAITING_PAYMENT: "Aguardando pagamento",
  PAID: "Pago · aguardando briefing",
  BRIEFING_COMPLETE: "Briefing completo",
  LYRICS_PENDING: "Letra em preparação",
  LYRICS_GENERATED: "Letra para revisão",
  LYRICS_APPROVED: "Letra aprovada",
  MUSIC_GENERATING: "Música em produção",
  MUSIC_READY: "Música pronta",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

function formatDate(value: string | null) {
  if (!value) return "Não registrado";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function PaymentBadge({ payment }: { payment: ItalyPayment }) {
  if (payment.status === "paid") {
    return <Badge className="gap-1 whitespace-nowrap border-[hsl(var(--status-success))]/30 bg-[hsl(var(--status-success))]/10 text-[hsl(var(--status-success))] hover:bg-[hsl(var(--status-success))]/15"><CheckCircle2 size={13} aria-hidden="true" />{italyPaymentStatusLabel(payment.status)}</Badge>;
  }
  if (payment.status === "failed" || payment.status === "expired") {
    return <Badge variant="destructive" className="gap-1 whitespace-nowrap"><XCircle size={13} aria-hidden="true" />{italyPaymentStatusLabel(payment.status)}</Badge>;
  }
  return <Badge variant="secondary" className="gap-1 whitespace-nowrap"><Clock3 size={13} aria-hidden="true" />{italyPaymentStatusLabel(payment.status)}</Badge>;
}

function SaleDetails({ row }: { row: ItalySaleRow }) {
  return <>
    <div className="min-w-0">
      <p className="truncate font-medium" title={row.order?.song_title || "Música completa"}>{row.order?.song_title || "Música completa"}</p>
      <p className="mt-1 text-xs text-muted-foreground">{[row.order?.music_style, row.order?.language?.toUpperCase()].filter(Boolean).join(" · ") || "Pedido não encontrado"}</p>
      <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">Pedido {row.order_id}</p>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <PaymentBadge payment={row} />
      <Badge variant="outline" className="whitespace-normal">{row.order ? productionLabels[row.order.status] || row.order.status : "Pedido indisponível"}</Badge>
    </div>
  </>;
}

export default function AdminItalySales() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole(user?.id);
  const [rows, setRows] = useState<ItalySaleRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<ItalySalesFilter>("all");
  const [search, setSearch] = useState("");
  const loadingRef = useRef(false);

  const loadSales = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setRefreshing(true);
    setError("");
    try {
      const paymentsResult = await supabase
        .from("it_live_payments")
        .select(paymentFields, { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (paymentsResult.error) throw paymentsResult.error;
      const payments = (paymentsResult.data || []) as ItalyPayment[];
      const orderIds = [...new Set(payments.map(payment => payment.order_id))];
      const userIds = [...new Set(payments.map(payment => payment.user_id))];
      const orders: ItalySaleOrder[] = [];
      const profiles: ItalySaleProfile[] = [];

      await Promise.all([
        (async () => {
          for (let start = 0; start < orderIds.length; start += 100) {
            const result = await supabase.from("orders").select(orderFields).in("id", orderIds.slice(start, start + 100));
            if (result.error) throw result.error;
            orders.push(...(result.data || []));
          }
        })(),
        (async () => {
          for (let start = 0; start < userIds.length; start += 100) {
            const result = await supabase.from("profiles").select("user_id,name").in("user_id", userIds.slice(start, start + 100));
            if (result.error) throw result.error;
            profiles.push(...(result.data || []));
          }
        })(),
      ]);

      const orderMap = new Map(orders.map(order => [order.id, order]));
      const profileMap = new Map(profiles.map(profile => [profile.user_id, profile]));
      setRows(payments.map(payment => ({
        ...payment,
        order: orderMap.get(payment.order_id) || null,
        profile: profileMap.get(payment.user_id) || null,
      })));
      setTotalRecords(paymentsResult.count ?? payments.length);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar as vendas da Itália.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void loadSales();
  }, [isAdmin, loadSales]);

  useEffect(() => {
    if (!isAdmin) return;
    const interval = setInterval(() => void loadSales(), 60000);
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") void loadSales();
    };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [isAdmin, loadSales]);

  const summary = useMemo(() => summarizeItalySales(rows), [rows]);
  const filteredRows = useMemo(() => filterItalySales(rows, filter, search), [rows, filter, search]);

  if (authLoading || roleLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-7 w-7 animate-spin text-primary" aria-label="Verificando permissões" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    return <div className="flex min-h-screen items-center justify-center bg-background p-4"><Card className="max-w-md p-8 text-center"><AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" /><h1 className="mb-2 text-xl font-bold">Acesso negado</h1><p className="mb-4 text-muted-foreground">Esta área é exclusiva para administradores.</p><Button asChild><Link to="/dashboard">Voltar ao Dashboard</Link></Button></Card></div>;
  }

  const metrics = [
    { label: "Faturamento confirmado", value: formatItalyEur(summary.paidRevenueCents), icon: Euro, detail: "Somente pagamentos liberados pelo webhook" },
    { label: "Vendas pagas", value: String(summary.paidCount), icon: CheckCircle2, detail: "Pedidos italianos confirmados" },
    { label: "Aguardando pagamento", value: String(summary.awaitingCount), icon: Clock3, detail: "Checkouts abertos ou em criação" },
    { label: "Sem pagamento", value: String(summary.closedWithoutPaymentCount), icon: XCircle, detail: "Checkouts falhos ou expirados" },
  ];

  return <div className="admin-workspace min-h-screen bg-background">
    <AdminHeader
      title="Vendas da Itália"
      description="Pagamentos reais em EUR · confirmação pelo webhook"
      actions={<Button variant="outline" size="sm" onClick={() => void loadSales()} disabled={refreshing}><RefreshCw className={`mr-2 h-4 w-4 shrink-0 ${refreshing ? "animate-spin" : ""}`} />Atualizar vendas</Button>}
    />
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <section aria-labelledby="italy-sales-heading" className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium text-primary"><ShieldCheck className="h-4 w-4" aria-hidden="true" />Conta italiana · ambiente ao vivo</p>
          <h2 id="italy-sales-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">Vendas em euros</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">Acompanhe somente as cobranças reais da Itália. Os pedidos brasileiros e os testes do sandbox não entram nesta página.</p>
        </div>
        <Badge variant="outline" className="w-fit gap-1.5 px-3 py-1.5"><span className="h-2 w-2 rounded-full bg-[hsl(var(--status-success))]" aria-hidden="true" />Atualização automática a cada minuto</Badge>
      </section>

      {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Não foi possível atualizar as vendas</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      <section aria-label="Resumo das vendas da Itália" className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy={loading}>
        {metrics.map(({ label, value, icon: Icon, detail }) => <Card key={label} className="min-w-0 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2"><p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p><Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /></div>
          <p className="break-words text-xl font-bold tracking-tight sm:text-3xl">{loading ? "…" : value}</p>
          <p className="mt-2 hidden text-xs text-muted-foreground sm:block">{detail}</p>
        </Card>)}
      </section>

      <section aria-labelledby="italy-payments-heading" className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div><h2 id="italy-payments-heading" className="text-xl font-semibold">Pagamentos</h2><p className="text-sm text-muted-foreground">{totalRecords > PAGE_SIZE ? `Exibindo os ${PAGE_SIZE} registros mais recentes de ${totalRecords}.` : `${totalRecords} ${totalRecords === 1 ? "registro" : "registros"} no checkout ao vivo.`}</p></div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem] lg:w-full lg:max-w-2xl">
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={search} onChange={event => setSearch(event.target.value)} className="pl-9" placeholder="Buscar cliente, música ou pedido" aria-label="Buscar vendas da Itália" /></div>
            <Select value={filter} onValueChange={value => setFilter(value as ItalySalesFilter)}><SelectTrigger aria-label="Filtrar situação do pagamento"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as situações</SelectItem><SelectItem value="paid">Pagos</SelectItem><SelectItem value="awaiting">Aguardando pagamento</SelectItem><SelectItem value="failed">Pagamentos falhos</SelectItem><SelectItem value="expired">Checkouts expirados</SelectItem></SelectContent></Select>
          </div>
        </div>

        {loading ? <Card className="flex min-h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" aria-label="Carregando vendas" /></Card> : filteredRows.length === 0 ? <Card className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><div className="mb-4 rounded-full bg-primary/10 p-4"><Music2 className="h-8 w-8 text-primary" aria-hidden="true" /></div><h3 className="text-lg font-semibold">{rows.length === 0 ? "Nenhuma venda da Itália ainda" : "Nenhum pagamento encontrado"}</h3><p className="mt-2 max-w-md text-sm text-muted-foreground">{rows.length === 0 ? "Quando uma compra em euros for iniciada, ela aparecerá aqui. O faturamento só aumenta depois da confirmação do webhook." : "Tente limpar a busca ou escolher outra situação de pagamento."}</p>{rows.length > 0 && <Button variant="outline" className="mt-4" onClick={() => { setSearch(""); setFilter("all"); }}>Limpar filtros</Button>}</Card> : <>
          <div className="space-y-3 md:hidden">{filteredRows.map(row => <Card key={row.id} className="space-y-4 p-4">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-medium">{row.profile?.name || `Cliente ${row.user_id.slice(0, 8)}`}</p><p className="mt-1 text-xs text-muted-foreground">Iniciado em {formatDate(row.created_at)}</p></div><strong className="shrink-0 text-lg">{formatItalyEur(row.amount_cents)}</strong></div>
            <SaleDetails row={row} />
            <div className="border-t pt-3 text-xs text-muted-foreground"><span className="font-medium text-foreground">Confirmado pelo webhook:</span> {formatDate(row.paid_at)}</div>
            <Button variant="outline" size="sm" asChild className="w-full"><Link to={`/admin?pedido=${row.order_id}`}>Abrir no painel de pedidos<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </Card>)}</div>

          <Card className="hidden overflow-hidden md:block"><Table><TableHeader><TableRow><TableHead>Cliente / data</TableHead><TableHead>Música / pedido</TableHead><TableHead>Valor</TableHead><TableHead>Pagamento</TableHead><TableHead>Produção</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader><TableBody>{filteredRows.map(row => <TableRow key={row.id}>
            <TableCell className="max-w-48"><p className="truncate font-medium" title={row.profile?.name || row.user_id}>{row.profile?.name || `Cliente ${row.user_id.slice(0, 8)}`}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(row.created_at)}</p></TableCell>
            <TableCell className="max-w-64"><p className="truncate font-medium" title={row.order?.song_title || "Música completa"}>{row.order?.song_title || "Música completa"}</p><p className="mt-1 text-xs text-muted-foreground">{[row.order?.music_style, row.order?.language?.toUpperCase()].filter(Boolean).join(" · ") || "Pedido não encontrado"}</p><p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{row.order_id}</p></TableCell>
            <TableCell className="whitespace-nowrap font-semibold">{formatItalyEur(row.amount_cents)}</TableCell>
            <TableCell><PaymentBadge payment={row} /><p className="mt-2 whitespace-nowrap text-xs text-muted-foreground">{row.paid_at ? formatDate(row.paid_at) : "Sem confirmação"}</p></TableCell>
            <TableCell><Badge variant="outline" className="whitespace-normal">{row.order ? productionLabels[row.order.status] || row.order.status : "Pedido indisponível"}</Badge></TableCell>
            <TableCell className="text-right"><Button variant="outline" size="sm" asChild><Link to={`/admin?pedido=${row.order_id}`}>Abrir pedido<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></TableCell>
          </TableRow>)}</TableBody></Table></Card>
        </>}
      </section>
    </main>
  </div>;
}
