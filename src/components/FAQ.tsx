import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "Preciso saber algo de música para criar?",
    answer: "Não precisa saber nada de música. Você só conta a história, o resto é com a gente. É simples: você escreve o que quer contar, escolhe o estilo e a gente transforma em música."
  },
  {
    question: "Quanto tempo leva para receber minha música?",
    answer: "O tempo médio de entrega é de até 48 horas após você aprovar a letra. Você acompanha tudo pela plataforma e recebe notificações quando sua música estiver pronta."
  },
  {
    question: "Posso pedir alterações na letra?",
    answer: "Sim! Você recebe duas versões de letra para escolher e pode pedir ajustes antes de aprovar. Depois que você aprova, a música começa a ser produzida."
  },
  {
    question: "A música é realmente minha e exclusiva?",
    answer: "Sim! Cada música é criada do zero, só para você. Ela nunca será vendida ou usada por outra pessoa. A música é sua para sempre."
  },
  {
    question: "Quais estilos musicais vocês fazem?",
    answer: "Fazemos vários estilos: Pop, Sertanejo, Rock, MPB, Gospel, Funk, Forró, Pagode, Bossa Nova e muito mais. Você escolhe o que combina com a sua história."
  },
  {
    question: "Posso fazer uma música sem letra (instrumental)?",
    answer: "Pode sim! Músicas instrumentais são perfeitas para vídeos, podcasts ou momentos especiais. Você escolhe os instrumentos e o clima que deseja."
  },
  {
    question: "Vocês fazem vídeo também?",
    answer: "Sim! A partir de R$50, você pode receber um vídeo personalizado com fotos ou clipes, sincronizado com sua música. Perfeito para compartilhar nas redes sociais. Para outros tipos de vídeo ou projetos especiais, entre em contato pelo WhatsApp."
  },
  {
    question: "Como funciona o pagamento?",
    answer: "Aceitamos PIX, cartão de crédito e débito. O pagamento é 100% seguro e você só paga depois de preencher o briefing. Também aceitamos cupons de desconto."
  },
  {
    question: "E se eu não gostar do resultado?",
    answer: "Nossa taxa de satisfação é de 98%! Quanto mais detalhes você colocar no briefing, melhor fica a música. Você aprova a letra antes, então não tem surpresas."
  },
  // Novas perguntas para criadores
  {
    question: "Posso usar as músicas em vídeos monetizados?",
    answer: "Sim! As músicas criadas são 100% originais e você tem todos os direitos para uso comercial, incluindo monetização no YouTube, TikTok, Instagram e outras plataformas. Não há risco de strikes ou reivindicações."
  },
  {
    question: "Como funciona a assinatura Creator?",
    answer: "Na assinatura, você recebe créditos todo mês para criar músicas. É ideal para criadores de conteúdo que precisam de várias músicas regularmente. Os créditos são renovados automaticamente e você pode cancelar quando quiser."
  },
  {
    question: "Os créditos da assinatura expiram?",
    answer: "Sim, os créditos da assinatura Creator renovam mensalmente. Créditos não utilizados não acumulam para o mês seguinte. Se você prefere créditos que nunca expiram, escolha os pacotes avulsos."
  },
  {
    question: "Posso cancelar minha assinatura?",
    answer: "Sim, você pode cancelar sua assinatura a qualquer momento pelo painel do usuário. Você continua com acesso até o fim do período pago e seus créditos restantes podem ser usados até lá."
  }
];

const FAQ = () => {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6" id="faq" aria-labelledby="faq-heading">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Dúvidas Frequentes</span>
          </div>
          <h2 id="faq-heading" className="text-3xl sm:text-4xl font-bold mb-4">
            Perguntas <span className="gradient-text">Frequentes</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tudo o que você precisa saber antes de criar sua música
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="border border-border/50 rounded-lg px-6 bg-card/50 backdrop-blur-sm"
            >
              <AccordionTrigger className="text-left hover:no-underline py-5">
                <span className="text-base sm:text-lg font-medium pr-4">
                  {faq.question}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5 text-base leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* CTA após FAQ */}
        <div className="mt-12 text-center space-y-4">
          <p className="text-muted-foreground">
            Ainda tem dúvidas? Entre em contato conosco!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href="https://wa.me/5516997310587?text=Olá! Tenho uma dúvida sobre o Criando Músicas."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              Falar no WhatsApp
            </a>
            <a 
              href="mailto:contato@criandomusicas.com.br"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              Ou enviar email para suporte
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
