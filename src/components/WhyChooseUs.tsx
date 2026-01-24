import { Clock, Heart, Music, Shield, Sparkles, Users } from "lucide-react";

const benefits = [
  {
    icon: Clock,
    title: "Processo simples e rápido",
    description: "Você conta a história, escolhe o estilo e recebe sua música. Sem complicação."
  },
  {
    icon: Heart,
    title: "Músicas personalizadas de verdade",
    description: "Cada música é única, criada do zero a partir da sua história e emoções."
  },
  {
    icon: Music,
    title: "Opção de vídeo pronto",
    description: "Além da música, você pode receber um vídeo editado para compartilhar."
  },
  {
    icon: Users,
    title: "Atendimento humano",
    description: "Suporte real e transparente. Nada de robôs ou respostas automáticas."
  },
  {
    icon: Shield,
    title: "Sem promessas falsas",
    description: "Você aprova a letra antes. Sem surpresas, sem pegadinhas."
  },
  {
    icon: Sparkles,
    title: "+500 músicas criadas",
    description: "Centenas de clientes satisfeitos já eternizaram seus momentos especiais."
  }
];

// Target audience section
const targetAudience = [
  "Quer dar um presente diferente e inesquecível",
  "Quer homenagear alguém especial",
  "Quer transformar sentimentos em música",
  "Quer uma música própria, mesmo sem saber compor",
  "Quer compartilhar algo único nas redes sociais"
];

const WhyChooseUs = () => {
  return (
    <section className="py-16 bg-background" id="diferenciais" aria-labelledby="why-choose-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Target Audience */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Esse serviço é perfeito{" "}
            <span className="gradient-text">para quem:</span>
          </h2>
          <ul className="max-w-2xl mx-auto space-y-3">
            {targetAudience.map((item, index) => (
              <li key={index} className="flex items-center gap-3 text-lg text-muted-foreground">
                <Heart className="w-5 h-5 text-primary flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <header className="text-center mb-12">
          <h2 id="why-choose-title" className="text-3xl md:text-4xl font-bold gradient-text mb-4">
            Por que escolher Criando Músicas?
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Um jeito simples, confiável e emocionante de criar músicas personalizadas 
            para presentear, homenagear ou eternizar momentos especiais.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <article 
              key={index} 
              className="group p-6 rounded-xl bg-card/80 border border-primary/30 hover:border-[hsl(45,100%,50%)] hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mb-4 group-hover:bg-primary/25 transition-colors">
                <benefit.icon className="w-6 h-6 text-primary" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {benefit.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
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
