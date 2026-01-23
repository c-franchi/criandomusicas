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
    answer: "Sim! Por R$50, você pode receber um vídeo personalizado com fotos ou clipes, sincronizado com sua música. Perfeito para compartilhar nas redes sociais."
  },
  {
    question: "Como funciona o pagamento?",
    answer: "Aceitamos PIX, cartão de crédito e débito. O pagamento é 100% seguro e você só paga depois de preencher o briefing. Também aceitamos cupons de desconto."
  },
  {
    question: "E se eu não gostar do resultado?",
    answer: "Nossa taxa de satisfação é de 98%! Quanto mais detalhes você colocar no briefing, melhor fica a música. Você aprova a letra antes, então não tem surpresas."
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
