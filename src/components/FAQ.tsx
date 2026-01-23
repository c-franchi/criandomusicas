import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "Como funciona o processo de criação da música?",
    answer: "É simples! Você preenche um briefing contando a história que deseja transformar em música, escolhe o estilo musical e as emoções. Nossa IA cria duas versões de letra para você escolher. Após sua aprovação, produzimos a música profissionalmente em até 48 horas."
  },
  {
    question: "Quanto tempo leva para receber minha música?",
    answer: "O tempo médio de entrega é de até 48 horas após a aprovação da letra. Músicas instrumentais podem ser entregues em até 24 horas. Você recebe notificações por email e push e acompanha tudo diretamente na plataforma."
  },
  {
    question: "Posso pedir alterações na letra?",
    answer: "Sim! Após recebermos duas versões de letra, você pode solicitar uma modificação gratuita antes de aprovar. Após a aprovação, a letra é considerada final e a produção começa imediatamente."
  },
  {
    question: "A música é realmente exclusiva?",
    answer: "Absolutamente! Cada música é criada do zero especificamente para você, baseada na sua história única. Você recebe os direitos de uso pessoal da música, que nunca será vendida ou criada para outra pessoa."
  },
  {
    question: "Posso usar a música comercialmente?",
    answer: "O plano padrão inclui uso pessoal e em redes sociais. Para uso comercial (propaganda, eventos corporativos, etc.), entre em contato conosco para discutir licenciamento específico."
  },
  {
    question: "Quais estilos musicais estão disponíveis?",
    answer: "Oferecemos diversos estilos: Pop, Sertanejo, Rock, MPB, Gospel, Funk, Eletrônica, Clássico, Jazz, Bossa Nova, Reggae, Forró, Pagode e mais. Cada estilo pode ser adaptado ao ritmo e atmosfera de sua preferência."
  },
  {
    question: "Como funciona a música instrumental?",
    answer: "Músicas instrumentais não possuem letra ou vocal. Você escolhe os instrumentos, atmosfera e ritmo desejados. São perfeitas para vídeos, podcasts ou como trilha sonora de momentos especiais."
  },
  {
    question: "Posso criar um vídeo com a música?",
    answer: "Sim! Oferecemos um serviço adicional de edição de vídeo por R$50. Você pode enviar fotos ou vídeos e nossa equipe cria um vídeo profissional sincronizado com sua música. Disponível após a entrega da música."
  },
  {
    question: "Como funciona o pagamento?",
    answer: "Aceitamos cartão de crédito, PIX e boleto via Stripe. O pagamento é processado com segurança e você só paga após finalizar o briefing. Também aceitamos vouchers de desconto."
  },
  {
    question: "E se eu não gostar do resultado?",
    answer: "Nossa taxa de satisfação é de 98%! Se você seguir o briefing detalhadamente, a música refletirá exatamente sua história. Após aprovar a letra, a venda é considerada final, por isso incentivamos briefings bem detalhados."
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
            Tire suas dúvidas sobre como criamos músicas personalizadas para você
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
        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Ainda tem dúvidas? Entre em contato conosco!
          </p>
          <a 
            href="mailto:contato@criandomusicas.com.br"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            Enviar email para suporte
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
