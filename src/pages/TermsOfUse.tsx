import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const TermsOfUse = () => {
  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Link>
        </Button>

        <h1 className="text-3xl font-bold mb-8">Termos de Uso</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">1. Aceitação dos Termos</h2>
            <p className="text-muted-foreground">
              Ao utilizar os serviços da Criando Músicas, você concorda com estes Termos de Uso. 
              Se você não concordar com qualquer parte destes termos, não utilize nossos serviços.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">2. Descrição do Serviço</h2>
            <p className="text-muted-foreground">
              A Criando Músicas oferece serviços de criação de músicas personalizadas utilizando 
              inteligência artificial, com base nas informações e preferências fornecidas pelo cliente.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">3. Cadastro e Conta</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Você deve fornecer informações verdadeiras e atualizadas</li>
              <li>É responsável por manter a confidencialidade de sua conta</li>
              <li>Deve ter pelo menos 18 anos ou autorização de responsável legal</li>
              <li>Cada pessoa deve ter apenas uma conta</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">4. Processo de Criação</h2>
            <p className="text-muted-foreground">
              O processo de criação de música segue as seguintes etapas:
            </p>
            <ol className="list-decimal pl-6 text-muted-foreground space-y-2">
              <li>Preenchimento do briefing com informações da música desejada</li>
              <li>Pagamento do serviço escolhido</li>
              <li>Geração da letra pela inteligência artificial</li>
              <li>Aprovação da letra pelo cliente</li>
              <li>Produção musical completa</li>
              <li>Entrega da música finalizada</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">5. Propriedade Intelectual</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>A música criada é de propriedade do cliente após o pagamento integral</li>
              <li>O cliente tem direito de uso pessoal e não comercial da música</li>
              <li>Para uso comercial, é necessário adquirir licença específica</li>
              <li>A Criando Músicas reserva-se o direito de utilizar amostras anônimas para demonstração</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. Política de Garantia e Revisões</h2>
            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
              <h3 className="font-semibold mb-2">🎵 Nossa Garantia de Satisfação</h3>
              <p className="text-muted-foreground mb-3">
                Queremos que você ame sua música! Por isso, oferecemos:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Até 3 versões de letra:</strong> Se a primeira versão não agradar, geramos novas opções</li>
                <li><strong>Ajustes na letra:</strong> Você pode solicitar modificações específicas antes da produção</li>
                <li><strong>Nova produção musical:</strong> Se após as revisões permitidas você não estiver satisfeito com o áudio final, oferecemos uma nova produção</li>
              </ul>
            </div>
            <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20 mt-4">
              <h3 className="font-semibold mb-2">⚠️ Limitações da Garantia</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Após a aprovação da letra pelo cliente, não são aceitas alterações na letra</li>
                <li>Mudanças de briefing após o início da produção podem incorrer em custos adicionais</li>
                <li>Não oferecemos reembolso após a entrega da música finalizada</li>
                <li>A garantia não cobre preferências subjetivas após aprovação das etapas</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">7. Pagamentos</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Os pagamentos são processados de forma segura por terceiros</li>
              <li>Aceitamos Pix e cartões de crédito</li>
              <li>A produção só inicia após confirmação do pagamento</li>
              <li>Cupons de desconto seguem regras específicas de cada promoção</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">8. Política de Cancelamento e Reembolso</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Antes da geração da letra:</strong> Reembolso integral</li>
              <li><strong>Após geração da letra:</strong> Reembolso de 50% do valor</li>
              <li><strong>Após produção musical:</strong> Não há reembolso, mas garantimos revisões conforme política de garantia</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">9. Conteúdo Proibido</h2>
            <p className="text-muted-foreground">
              Não criamos músicas que contenham:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Discurso de ódio ou discriminação</li>
              <li>Apologia a crimes ou violência</li>
              <li>Conteúdo difamatório sobre terceiros</li>
              <li>Pornografia ou conteúdo sexual explícito</li>
              <li>Violação de direitos autorais de terceiros</li>
              <li>Qualquer conteúdo ilegal</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">10. Prazos de Entrega</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Geração de letras:</strong> Até 24 horas após pagamento</li>
              <li><strong>Produção musical:</strong> 3 a 7 dias úteis após aprovação da letra</li>
              <li>Prazos podem variar em períodos de alta demanda</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">11. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground">
              A Criando Músicas não se responsabiliza por:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Uso indevido das músicas pelo cliente</li>
              <li>Informações incorretas fornecidas no briefing</li>
              <li>Expectativas subjetivas não expressas no briefing</li>
              <li>Danos indiretos ou consequenciais</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">12. Alterações nos Termos</h2>
            <p className="text-muted-foreground">
              Podemos atualizar estes termos periodicamente. Mudanças significativas serão 
              comunicadas por e-mail. O uso continuado dos serviços implica aceitação dos novos termos.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">13. Foro e Lei Aplicável</h2>
            <p className="text-muted-foreground">
              Estes termos são regidos pelas leis brasileiras. Eventuais disputas serão resolvidas 
              no foro da comarca de Ribeirão Preto - SP.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">14. Contato</h2>
            <p className="text-muted-foreground">
              Para dúvidas sobre estes termos:<br />
              <strong>E-mail:</strong> contato@criandomusicas.com.br<br />
              <strong>WhatsApp:</strong> (16) 99999-9999
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse;
