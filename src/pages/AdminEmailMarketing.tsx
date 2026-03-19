import { useState, useEffect, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  BarChart3,
  Clock,
  Megaphone,
  Gift,
  Zap,
  Heart,
  PartyPopper,
  TrendingUp,
  Copy,
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
    // Replace CTA placeholders
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
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  // Campaign history
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

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
        .eq('campaign_type', 'marketing')
        .order('sent_at', { ascending: false })
        .limit(20);

      setCampaigns(data || []);
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
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {campaigns.map((c) => (
                      <div key={c.id} className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
                        <p className="text-xs font-medium truncate">{c.email?.replace('Campaign: ', '')}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(c.sent_at).toLocaleDateString('pt-BR', {
                              day: '2-digit', month: '2-digit', year: '2-digit',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {c.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
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
    </div>
  );
};

export default AdminEmailMarketing;
