import { useState, useEffect, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Mail,
  Send,
  Users,
  Eye,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Target,
  Clock,
  Megaphone,
  Gift,
  Zap,
  Heart,
  PartyPopper,
  TrendingUp,
  RefreshCw,
  FileText,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const EMAIL_TEMPLATES = [
  {
    id: 'discount',
    name: '🎁 Cupom de Desconto',
    icon: Gift,
    subject: '🎁 Presente exclusivo para você!',
    body: `Olá, {{nome}}! 👋

Preparamos um presente especial para você:

🎫 Use o cupom DESCONTO20 e ganhe 20% OFF na sua próxima música!

Crie uma música personalizada para alguém especial em menos de 2 minutos.

[CRIAR MINHA MÚSICA →]

Abraços,
Equipe Criando Músicas 🎵`,
  },
  {
    id: 'reengagement',
    name: '💡 Reengajamento',
    icon: Zap,
    subject: '✨ Sentimos sua falta! Volte e crie sua música',
    body: `Olá, {{nome}}! 👋

Faz um tempo que você não nos visita, e queríamos lembrar que sua criatividade musical está esperando!

🎵 Em menos de 2 minutos, você pode criar uma música personalizada e surpreender alguém especial.

🎁 Para te motivar, temos um crédito especial te esperando!

[VOLTAR E CRIAR →]

Com carinho,
Equipe Criando Músicas`,
  },
  {
    id: 'seasonal',
    name: '🎉 Data Comemorativa',
    icon: PartyPopper,
    subject: '🎉 Não perca essa data especial!',
    body: `Olá, {{nome}}! 🎶

Uma data especial está chegando e nada melhor do que presentear com uma música exclusiva!

🎵 Imagine a surpresa de quem você ama ao receber uma música feita especialmente para ela.

⏰ Garanta sua música a tempo — crie agora!

[CRIAR MÚSICA AGORA →]

Abraços,
Equipe Criando Músicas`,
  },
  {
    id: 'testimonial',
    name: '❤️ Prova Social',
    icon: Heart,
    subject: '❤️ Veja o que nossos clientes estão dizendo!',
    body: `Olá, {{nome}}! 👋

Milhares de pessoas já transformaram suas histórias em músicas inesquecíveis!

⭐⭐⭐⭐⭐ "Foi a melhor surpresa que já preparei!" — Maria S.

⭐⭐⭐⭐⭐ "Meu pai chorou de emoção ao ouvir!" — João P.

🎵 Agora é a sua vez de criar algo especial.

[CRIAR MINHA MÚSICA →]

Com carinho,
Equipe Criando Músicas`,
  },
  {
    id: 'custom',
    name: '✏️ Personalizado',
    icon: Sparkles,
    subject: '',
    body: '',
  },
];

function textToHtml(text: string, ctaUrl: string, ctaText: string): string {
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const paragraphs = escapedText.split('\n\n').map(p => {
    const lines = p.split('\n').join('<br/>');
    if (lines.includes('[') && lines.includes('→]')) {
      return `<div style="text-align:center;margin:30px 0;">
        <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);color:#ffffff;font-size:16px;font-weight:bold;padding:16px 40px;border-radius:12px;text-decoration:none;">${ctaText}</a>
      </div>`;
    }
    return `<p style="margin:0 0 16px;color:#4b5563;font-size:16px;line-height:1.7;">${lines}</p>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f3f4f6;">
<table role="presentation" style="width:100%;border-collapse:collapse;">
<tr><td style="padding:40px 20px;">
<table role="presentation" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
  <tr>
    <td style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);padding:40px 30px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">🎵 Criando Músicas</h1>
      <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Transforme histórias em músicas inesquecíveis</p>
    </td>
  </tr>
  <tr>
    <td style="padding:40px 30px;">
      ${paragraphs}
    </td>
  </tr>
  <tr>
    <td style="padding:0 30px 30px;">
      <div style="border-top:1px solid #e5e7eb;padding-top:20px;text-align:center;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} Criando Músicas. Todos os direitos reservados.</p>
        <p style="margin:8px 0 0;color:#9ca3af;font-size:11px;">
          Você recebeu este e-mail porque se cadastrou na plataforma Criando Músicas.
        </p>
      </div>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

interface CampaignMetadata {
  subject?: string;
  sentEmails?: string[];
  failedEmails?: string[];
  targetAudience?: string;
  total?: number;
}

interface CampaignLog {
  id: string;
  email: string;
  status: string;
  sent_at: string;
  campaign_type: string;
  metadata: CampaignMetadata | null;
}

const AdminEmailMarketing = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole(user?.id);
  const { toast } = useToast();

  const [selectedTemplate, setSelectedTemplate] = useState<string>('discount');
  const [subject, setSubject] = useState(EMAIL_TEMPLATES[0].subject);
  const [bodyText, setBodyText] = useState(EMAIL_TEMPLATES[0].body);
  const [targetAudience, setTargetAudience] = useState<string>('all');
  const [ctaUrl, setCtaUrl] = useState('https://criandomusicas.lovable.app/briefing');
  const [ctaText, setCtaText] = useState('Criar minha música');

  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number; failedEmails?: string[] } | null>(null);

  // Campaign history
  const [campaigns, setCampaigns] = useState<CampaignLog[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  // Report dialog
  const [reportCampaign, setReportCampaign] = useState<CampaignLog | null>(null);
  const [resending, setResending] = useState(false);

  // User stats
  const [userStats, setUserStats] = useState({ total: 0, active: 0, inactive: 0 });

  const fetchStats = useCallback(async () => {
    try {
      const { count: totalCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: activeCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('has_created_music', true);

      setUserStats({
        total: totalCount || 0,
        active: activeCount || 0,
        inactive: (totalCount || 0) - (activeCount || 0),
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('email_campaign_logs')
        .select('*')
        .in('campaign_type', ['marketing', 'resend'])
        .order('sent_at', { ascending: false })
        .limit(30);

      setCampaigns((data as CampaignLog[]) || []);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchCampaigns();
    }
  }, [isAdmin, fetchStats, fetchCampaigns]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBodyText(template.body);
    }
  };

  const getHtmlPreview = () => {
    return textToHtml(bodyText, ctaUrl, ctaText);
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast({ title: 'Digite um e-mail para teste', variant: 'destructive' });
      return;
    }
    setSendingTest(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('send-campaign-email', {
        body: {
          subject,
          htmlBody: getHtmlPreview(),
          testEmail,
        },
        headers: { Authorization: `Bearer ${session?.session?.access_token}` },
      });
      if (error) throw error;
      toast({ title: '✅ E-mail de teste enviado!', description: `Enviado para ${testEmail}` });
    } catch (err) {
      toast({ title: 'Erro ao enviar teste', description: String(err), variant: 'destructive' });
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!subject || !bodyText) {
      toast({ title: 'Preencha o assunto e o conteúdo', variant: 'destructive' });
      return;
    }

    const audienceCount = targetAudience === 'all' ? userStats.total
      : targetAudience === 'active' ? userStats.active
      : userStats.inactive;

    if (!confirm(`Tem certeza que deseja enviar para ${audienceCount} usuários?`)) return;

    setSending(true);
    setResult(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('send-campaign-email', {
        body: {
          subject,
          htmlBody: getHtmlPreview(),
          targetAudience,
        },
        headers: { Authorization: `Bearer ${session?.session?.access_token}` },
      });
      if (error) throw error;
      setResult(data);
      toast({ title: '🚀 Campanha enviada!', description: `${data.sent} e-mails enviados com sucesso.` });
      fetchCampaigns();
    } catch (err) {
      toast({ title: 'Erro ao enviar campanha', description: String(err), variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleResendFailed = async (campaign: CampaignLog) => {
    const failedEmails = campaign.metadata?.failedEmails;
    if (!failedEmails || failedEmails.length === 0) {
      toast({ title: 'Nenhum e-mail para reenviar', variant: 'destructive' });
      return;
    }

    const campaignSubject = campaign.metadata?.subject || campaign.email?.replace('Campaign: ', '') || subject;

    if (!confirm(`Reenviar para ${failedEmails.length} e-mails que falharam?`)) return;

    setResending(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('send-campaign-email', {
        body: {
          subject: campaignSubject,
          htmlBody: getHtmlPreview(),
          resendEmails: failedEmails,
        },
        headers: { Authorization: `Bearer ${session?.session?.access_token}` },
      });
      if (error) throw error;
      toast({
        title: '🔄 Reenvio concluído!',
        description: `${data.sent} enviados, ${data.failed} falhas`,
      });
      fetchCampaigns();
      setReportCampaign(null);
    } catch (err) {
      toast({ title: 'Erro ao reenviar', description: String(err), variant: 'destructive' });
    } finally {
      setResending(false);
    }
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const audienceCount = targetAudience === 'all' ? userStats.total
    : targetAudience === 'active' ? userStats.active
    : userStats.inactive;

  const parseStatus = (status: string) => {
    const match = status?.match(/sent:(\d+),failed:(\d+)/);
    if (match) return { sent: parseInt(match[1]), failed: parseInt(match[2]) };
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="font-bold text-xl flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-primary" />
                <span className="gradient-text">Central de Marketing</span>
              </h1>
              <p className="text-sm text-muted-foreground">Campanhas de e-mail em massa</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Audience Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/20">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userStats.total}</p>
                  <p className="text-xs text-muted-foreground">Total de Usuários</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-500/20">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userStats.active}</p>
                  <p className="text-xs text-muted-foreground">Usuários Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500/20">
                  <Target className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userStats.inactive}</p>
                  <p className="text-xs text-muted-foreground">Usuários Inativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Campaign Builder */}
          <div className="lg:col-span-2 space-y-4">
            {/* Template Selector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Template
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {EMAIL_TEMPLATES.map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateChange(template.id)}
                      className={`p-3 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                        selectedTemplate === template.id
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border/50 hover:border-primary/30'
                      }`}
                    >
                      <template.icon className="w-5 h-5 mb-1.5 text-primary" />
                      <p className="text-xs font-medium leading-tight">{template.name}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Email Content */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Conteúdo do E-mail
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Assunto</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Assunto do e-mail"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    Corpo do E-mail
                    <span className="text-xs text-muted-foreground ml-2">Use {"{{nome}}"} para personalizar</span>
                  </Label>
                  <Textarea
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    placeholder="Escreva o conteúdo do e-mail..."
                    className="mt-1 min-h-[250px] font-mono text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">URL do CTA</Label>
                    <Input
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                      placeholder="https://..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Texto do Botão</Label>
                    <Input
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      placeholder="Criar minha música"
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={() => setShowPreview(true)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Pré-visualizar E-mail
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right: Send Controls */}
          <div className="space-y-4">
            {/* Audience Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Público-Alvo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={targetAudience} onValueChange={setTargetAudience}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      📧 Todos os usuários ({userStats.total})
                    </SelectItem>
                    <SelectItem value="active">
                      ✅ Usuários ativos ({userStats.active})
                    </SelectItem>
                    <SelectItem value="inactive">
                      💤 Usuários inativos ({userStats.inactive})
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {audienceCount} destinatários
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {targetAudience === 'all' && 'Todos os usuários cadastrados'}
                    {targetAudience === 'active' && 'Usuários que já criaram músicas'}
                    {targetAudience === 'inactive' && 'Usuários que ainda não criaram músicas'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Test Send */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  🧪 Enviar Teste
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSendTest}
                  disabled={sendingTest || !testEmail}
                >
                  {sendingTest ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Enviar Teste
                </Button>
              </CardContent>
            </Card>

            {/* Send Campaign */}
            <Card className="border-primary/30">
              <CardContent className="pt-6">
                <Button
                  className="w-full h-12 text-base font-bold"
                  onClick={handleSendCampaign}
                  disabled={sending || !subject || !bodyText}
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Disparar Campanha
                    </>
                  )}
                </Button>
                {result && (
                  <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <p className="text-sm font-medium flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      Campanha enviada!
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ✅ {result.sent} enviados · ❌ {result.failed} falhas · 📊 {result.total} total
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Campaign History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Histórico
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingCampaigns ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : campaigns.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma campanha enviada
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {campaigns.map((c) => {
                      const stats = parseStatus(c.status || '');
                      const hasFailed = stats && stats.failed > 0;
                      const hasMetadata = c.metadata && (c.metadata.sentEmails || c.metadata.failedEmails);

                      return (
                        <div key={c.id} className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-medium truncate flex-1">
                              {c.email?.replace('Campaign: ', '')}
                            </p>
                            {c.campaign_type === 'resend' && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-500 border-blue-500/30 shrink-0">
                                Reenvio
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(c.sent_at).toLocaleDateString('pt-BR', {
                                day: '2-digit', month: '2-digit', year: '2-digit',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                            {stats && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-green-500 font-medium">✅ {stats.sent}</span>
                                {stats.failed > 0 && (
                                  <span className="text-[10px] text-red-500 font-medium">❌ {stats.failed}</span>
                                )}
                              </div>
                            )}
                          </div>
                          {hasMetadata && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full mt-1.5 h-7 text-[11px] text-muted-foreground hover:text-foreground"
                              onClick={() => setReportCampaign(c)}
                            >
                              <FileText className="w-3 h-3 mr-1.5" />
                              Ver Relatório
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pré-visualização do E-mail</DialogTitle>
          </DialogHeader>
          <div className="mt-4 border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 border-b">
              <p className="text-xs text-muted-foreground">Assunto: <span className="font-medium text-foreground">{subject}</span></p>
            </div>
            <iframe
              srcDoc={getHtmlPreview().replace(/\{\{nome\}\}/g, 'João')}
              className="w-full h-[500px] border-0"
              title="Email Preview"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Campaign Report Modal */}
      <Dialog open={!!reportCampaign} onOpenChange={(open) => !open && setReportCampaign(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Relatório da Campanha
            </DialogTitle>
          </DialogHeader>

          {reportCampaign && (
            <div className="space-y-4 mt-2">
              {/* Campaign info */}
              <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                <p className="text-sm font-medium">
                  {reportCampaign.metadata?.subject || reportCampaign.email?.replace('Campaign: ', '')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(reportCampaign.sent_at).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
                {reportCampaign.campaign_type === 'resend' && (
                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/30">
                    Reenvio
                  </Badge>
                )}
              </div>

              {/* Stats summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-green-500">{reportCampaign.metadata?.sentEmails?.length || 0}</p>
                  <p className="text-[11px] text-muted-foreground">Enviados</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                  <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-red-500">{reportCampaign.metadata?.failedEmails?.length || 0}</p>
                  <p className="text-[11px] text-muted-foreground">Falharam</p>
                </div>
              </div>

              {/* Sent emails list */}
              {reportCampaign.metadata?.sentEmails && reportCampaign.metadata.sentEmails.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    E-mails Entregues ({reportCampaign.metadata.sentEmails.length})
                  </p>
                  <div className="bg-muted/20 rounded-lg border border-border/50 max-h-[150px] overflow-y-auto">
                    {reportCampaign.metadata.sentEmails.map((email, i) => (
                      <div key={i} className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border/30 last:border-0 flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                        {email}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed emails list */}
              {reportCampaign.metadata?.failedEmails && reportCampaign.metadata.failedEmails.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    E-mails com Falha ({reportCampaign.metadata.failedEmails.length})
                  </p>
                  <div className="bg-red-500/5 rounded-lg border border-red-500/20 max-h-[150px] overflow-y-auto">
                    {reportCampaign.metadata.failedEmails.map((email, i) => (
                      <div key={i} className="px-3 py-1.5 text-xs text-red-400 border-b border-red-500/10 last:border-0 flex items-center gap-2">
                        <XCircle className="w-3 h-3 text-red-500 shrink-0" />
                        {email}
                      </div>
                    ))}
                  </div>

                  {/* Resend button */}
                  <Button
                    className="w-full mt-3"
                    variant="destructive"
                    onClick={() => handleResendFailed(reportCampaign)}
                    disabled={resending}
                  >
                    {resending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Reenviando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reenviar para {reportCampaign.metadata.failedEmails.length} e-mails com falha
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* No metadata warning for old campaigns */}
              {!reportCampaign.metadata?.sentEmails && !reportCampaign.metadata?.failedEmails && (
                <div className="bg-muted/30 rounded-lg p-4 text-center">
                  <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Detalhes não disponíveis para campanhas anteriores à atualização.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmailMarketing;
