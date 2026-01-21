import { ArrowLeft, Music, CheckCircle, XCircle, AlertTriangle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
const MusicRules = () => {
  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <SEO 
        canonical="/regras"
        title="Regras de Criação Musical"
        description="Conheça as diretrizes para criar sua música personalizada. Dicas para um briefing perfeito, tipos de música permitidos e nossa garantia de satisfação."
        keywords="como criar música personalizada, regras música IA, dicas briefing musical, tipos de música, garantia satisfação"
      />
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
            <Music className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Regras de Criação Musical</h1>
            <p className="text-muted-foreground">Diretrizes para criar sua música perfeita</p>
          </div>
        </div>
        
        <div className="space-y-8">
          {/* Como funciona */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              Como Funciona a Criação
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Nossa inteligência artificial cria músicas únicas e personalizadas com base nas 
                informações que você fornece. Quanto mais detalhes no briefing, melhor será o resultado!
              </p>
              <div className="grid md:grid-cols-3 gap-4 mt-4">
                <div className="bg-muted/50 p-4 rounded-lg text-center">
                  <span className="text-3xl">1️⃣</span>
                  <h4 className="font-semibold mt-2">Briefing</h4>
                  <p className="text-sm">Conte sua história e preferências</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg text-center">
                  <span className="text-3xl">2️⃣</span>
                  <h4 className="font-semibold mt-2">Letra</h4>
                  <p className="text-sm">IA cria e você aprova a letra</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg text-center">
                  <span className="text-3xl">3️⃣</span>
                  <h4 className="font-semibold mt-2">Música</h4>
                  <p className="text-sm">Produção completa da música</p>
                </div>
              </div>
            </div>
          </Card>

          {/* O que pode */}
          <Card className="p-6 border-green-500/30">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-green-500">
              <CheckCircle className="w-5 h-5" />
              O Que Você Pode Criar
            </h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                <span><strong>Homenagens:</strong> Para aniversários, casamentos, formaturas, aposentadorias</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                <span><strong>Músicas românticas:</strong> Declarações de amor, pedidos de casamento, bodas</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                <span><strong>Músicas infantis:</strong> Para crianças, personalizadas com nome e história</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                <span><strong>Músicas religiosas:</strong> Louvores, músicas de fé e gratidão</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                <span><strong>Paródias:</strong> Versões humorísticas e divertidas (sem ofensas)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                <span><strong>Músicas motivacionais:</strong> Para inspirar e encorajar</span>
              </li>
            </ul>
          </Card>

          {/* O que NÃO pode */}
          <Card className="p-6 border-red-500/30">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-red-500">
              <XCircle className="w-5 h-5" />
              Conteúdo Não Permitido
            </h2>
            <p className="text-muted-foreground mb-4">
              Não criamos músicas que contenham os seguintes elementos:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 mt-1 shrink-0" />
                <span>Discurso de ódio, preconceito ou discriminação de qualquer tipo</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 mt-1 shrink-0" />
                <span>Apologia ao crime, drogas ou violência</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 mt-1 shrink-0" />
                <span>Difamação ou ofensas direcionadas a pessoas reais</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 mt-1 shrink-0" />
                <span>Conteúdo sexual explícito ou pornográfico</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 mt-1 shrink-0" />
                <span>Cópia de músicas existentes ou violação de direitos autorais</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 mt-1 shrink-0" />
                <span>Conteúdo que incite bullying ou assédio</span>
              </li>
            </ul>
          </Card>

          {/* Dicas para um bom briefing */}
          <Card className="p-6 border-yellow-500/30">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-yellow-500">
              <AlertTriangle className="w-5 h-5" />
              Dicas para o Melhor Resultado
            </h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">💡</span>
                <span><strong>Seja específico:</strong> Mencione nomes, datas, lugares e situações importantes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">💡</span>
                <span><strong>Conte a história:</strong> Quanto mais detalhes, mais personalizada será a letra</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">💡</span>
                <span><strong>Inclua "piadas internas":</strong> Momentos especiais que só vocês entendem</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">💡</span>
                <span><strong>Defina a emoção:</strong> Alegre? Emocionante? Engraçada? Isso guia toda a criação</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">💡</span>
                <span><strong>Palavras obrigatórias:</strong> Use esse recurso para garantir termos importantes</span>
              </li>
            </ul>
          </Card>

          {/* Garantia */}
          <Card className="p-6 border-primary/30 bg-primary/5">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Nossa Garantia de Satisfação
            </h2>
            <p className="text-muted-foreground mb-4">
              Queremos que você ame sua música! Por isso, oferecemos:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-1 shrink-0" />
                <span><strong>2 versões de letra:</strong> Geramos duas opções para você escolher a que mais combina</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-1 shrink-0" />
                <span><strong>1 modificação opcional:</strong> Você pode solicitar ajustes na letra escolhida (apenas uma vez)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-1 shrink-0" />
                <span><strong>Backup da original:</strong> Se não gostar da versão modificada, pode voltar para a original</span>
              </li>
            </ul>
            <div className="mt-4 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <p className="text-sm text-muted-foreground">
                <strong className="text-red-500">⚠️ Importante:</strong> Após aprovar a letra, <strong>não há devoluções</strong>. 
                Quanto mais informações você fornecer no briefing, melhor será a letra! Revise com atenção antes de confirmar.
              </p>
            </div>
          </Card>

          <div className="text-center pt-4">
            <Button asChild size="lg">
              <Link to="/briefing">
                <Music className="w-4 h-4 mr-2" />
                Criar Minha Música
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicRules;
