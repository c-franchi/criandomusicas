import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
const PrivacyPolicy = () => {
  const currentDate = new Date().toISOString();
  
  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <SEO 
        canonical="/privacidade"
        title="Política de Privacidade"
        description="Saiba como a Criando Músicas coleta, utiliza e protege seus dados pessoais em conformidade com a LGPD. Transparência e segurança para você."
        keywords="política de privacidade, LGPD, proteção de dados, privacidade criandomusicas"
        updatedAt={currentDate}
      />
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Link>
        </Button>

        <h1 className="text-3xl font-bold mb-8">Política de Privacidade</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">1. Introdução</h2>
            <p className="text-muted-foreground">
              A Criando Músicas está comprometida em proteger sua privacidade. Esta Política de Privacidade 
              explica como coletamos, usamos, armazenamos e protegemos suas informações pessoais em conformidade 
              com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">2. Dados que Coletamos</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Dados de cadastro:</strong> Nome, e-mail, telefone e WhatsApp</li>
              <li><strong>Dados de briefing:</strong> Histórias, nomes, preferências musicais e informações fornecidas para criação das músicas</li>
              <li><strong>Dados de pagamento:</strong> Processados de forma segura por terceiros (gateways de pagamento)</li>
              <li><strong>Dados de uso:</strong> Informações sobre como você utiliza nossa plataforma</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">3. Finalidade do Tratamento</h2>
            <p className="text-muted-foreground">Utilizamos seus dados para:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Criar músicas personalizadas conforme suas especificações</li>
              <li>Entrar em contato sobre o andamento do seu pedido</li>
              <li>Enviar a música finalizada via WhatsApp ou e-mail</li>
              <li>Processar pagamentos de forma segura</li>
              <li>Melhorar nossos serviços e experiência do usuário</li>
              <li>Cumprir obrigações legais e regulatórias</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">4. Base Legal</h2>
            <p className="text-muted-foreground">
              Tratamos seus dados com base nas seguintes hipóteses legais previstas na LGPD:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Execução de contrato:</strong> Para prestar os serviços contratados</li>
              <li><strong>Consentimento:</strong> Para comunicações de marketing e uso de dados sensíveis</li>
              <li><strong>Legítimo interesse:</strong> Para melhorar nossos serviços</li>
              <li><strong>Cumprimento de obrigação legal:</strong> Para atender exigências legais</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">5. Compartilhamento de Dados</h2>
            <p className="text-muted-foreground">
              Não vendemos seus dados pessoais. Podemos compartilhar informações com:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Processadores de pagamento para finalizar transações</li>
              <li>Provedores de serviços de tecnologia que nos auxiliam</li>
              <li>Autoridades públicas quando exigido por lei</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. Seus Direitos (LGPD)</h2>
            <p className="text-muted-foreground">
              Você tem os seguintes direitos em relação aos seus dados:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Confirmar a existência de tratamento de dados</li>
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos ou desatualizados</li>
              <li>Solicitar anonimização, bloqueio ou eliminação de dados</li>
              <li>Solicitar portabilidade dos dados</li>
              <li>Revogar o consentimento a qualquer momento</li>
              <li>Obter informações sobre compartilhamento de dados</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">7. Segurança dos Dados</h2>
            <p className="text-muted-foreground">
              Implementamos medidas técnicas e organizacionais para proteger seus dados, incluindo 
              criptografia, controle de acesso e monitoramento de segurança. Armazenamos seus dados 
              em servidores seguros e seguimos as melhores práticas do mercado.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">8. Retenção de Dados</h2>
            <p className="text-muted-foreground">
              Mantemos seus dados pelo tempo necessário para prestar os serviços e cumprir obrigações 
              legais. Após esse período, os dados são eliminados ou anonimizados de forma segura.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">9. Cookies</h2>
            <p className="text-muted-foreground">
              Utilizamos cookies para melhorar sua experiência. Você pode gerenciar as preferências 
              de cookies através das configurações do seu navegador.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">10. Contato do Encarregado (DPO)</h2>
            <p className="text-muted-foreground">
              Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato:
            </p>
            <p className="text-muted-foreground">
              <strong>E-mail:</strong> privacidade@criandomusicas.com.br<br />
              <strong>WhatsApp:</strong> (16) 99999-9999
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">11. Alterações</h2>
            <p className="text-muted-foreground">
              Esta política pode ser atualizada periodicamente. Notificaremos sobre mudanças 
              significativas por e-mail ou através de aviso em nossa plataforma.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
