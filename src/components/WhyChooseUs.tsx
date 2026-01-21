import { Clock, Heart, Music, Shield, Sparkles, Users } from "lucide-react";

const benefits = [
  {
    icon: Clock,
    title: "Entrega Rápida",
    description: "Sua música pronta em até 48 horas após aprovação da letra. Letra gerada instantaneamente."
  },
  {
    icon: Heart,
    title: "100% Personalizada",
    description: "Cada música é única, criada especialmente a partir da sua história e emoções."
  },
  {
    icon: Music,
    title: "+10 Estilos Musicais",
    description: "Sertanejo, Pop, Gospel, Rock, MPB, Forró, Funk, Eletrônica e muito mais."
  },
  {
    icon: Users,
    title: "+500 Músicas Criadas",
    description: "Centenas de clientes satisfeitos já eternizaram seus momentos especiais conosco."
  },
  {
    icon: Shield,
    title: "Satisfação Garantida",
    description: "Você aprova a letra antes da produção. Não gostou? Geramos novas opções."
  },
  {
    icon: Sparkles,
    title: "Qualidade Profissional",
    description: "Áudio em alta qualidade com vozes realistas e arranjos musicais completos."
  }
];

const WhyChooseUs = () => {
  return (
    <section className="py-16 bg-background" id="diferenciais" aria-labelledby="why-choose-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center mb-12">
          <h2 id="why-choose-title" className="text-3xl md:text-4xl font-bold gradient-text mb-4">
            Por que escolher Criando Músicas?
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Transformamos histórias em melodias únicas. Seja para um aniversário especial, 
            casamento, declaração de amor ou homenagem, criamos a trilha sonora perfeita 
            para eternizar seus momentos mais importantes.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <article 
              key={index} 
              className="group p-6 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <benefit.icon className="w-6 h-6 text-primary" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {benefit.title}
              </h3>
              <p className="text-muted-foreground">
                {benefit.description}
              </p>
            </article>
          ))}
        </div>

        {/* Additional SEO Content */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="prose prose-lg dark:prose-invert mx-auto text-center">
            <h3 className="text-2xl font-semibold text-foreground mb-4">
              Como funciona criar uma música personalizada?
            </h3>
            <p className="text-muted-foreground mb-6">
              Criar uma música personalizada com a Criando Músicas é simples e emocionante. 
              Primeiro, você nos conta sua história - pode ser uma declaração de amor, 
              uma homenagem a alguém especial, uma lembrança de infância ou qualquer momento 
              que você queira eternizar em forma de música.
            </p>
            <p className="text-muted-foreground mb-6">
              Nossa tecnologia de inteligência artificial, combinada com produção musical profissional, 
              transforma suas palavras em uma composição única. Você escolhe o estilo musical 
              que mais combina - do sertanejo romântico ao pop animado, do gospel inspirador ao rock energético.
            </p>
            <p className="text-muted-foreground">
              Em até 48 horas, você recebe sua música exclusiva diretamente no WhatsApp, 
              pronta para emocionar, presentear e criar memórias inesquecíveis. 
              É o presente perfeito para aniversários, casamentos, Dia das Mães, Dia dos Pais, 
              formaturas e qualquer ocasião especial.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
