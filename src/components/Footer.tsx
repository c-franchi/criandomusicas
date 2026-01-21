import { Music } from "lucide-react";
const Footer = () => {
  return <footer className="py-12 px-6 border-t border-border/50">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">Criando Músicas</span>
            </div>
            <p className="text-muted-foreground mb-4 max-w-md">
              Transformamos suas histórias mais especiais em músicas únicas e emocionantes. 
              Sua trilha sonora personalizada está a um clique de distância.
            </p>
          </div>
          
          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Produto</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="/#processo" className="hover:text-primary transition-colors">Como funciona</a></li>
              <li><a href="/#exemplos" className="hover:text-primary transition-colors">Exemplos</a></li>
              <li><a href="/planos" className="hover:text-primary transition-colors">Preços</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="/termos" className="hover:text-primary transition-colors">Termos de Uso</a></li>
              <li><a href="/privacidade" className="hover:text-primary transition-colors">Política de Privacidade</a></li>
              <li><a href="/regras" className="hover:text-primary transition-colors">Regras de Criação</a></li>
              <li><a href="https://wa.me/5511999999999?text=Olá! Gostaria de saber mais sobre o Criando Músicas" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Contato</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border/50 mt-8 pt-8 text-center text-muted-foreground">
          <p>© 2025 Criando Músicas. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>;
};
export default Footer;