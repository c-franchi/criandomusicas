import { Music } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const Footer = () => {
  const navigate = useNavigate();

  const scrollToSection = (sectionId: string) => {
    // Se já está na homepage, apenas scroll
    if (window.location.pathname === '/') {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Navega para homepage e depois faz scroll
      navigate('/');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

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
              <li><button onClick={() => scrollToSection('processo')} className="hover:text-primary transition-colors text-left">Como funciona</button></li>
              <li><button onClick={() => scrollToSection('exemplos')} className="hover:text-primary transition-colors text-left">Exemplos</button></li>
              <li><Link to="/planos" className="hover:text-primary transition-colors">Preços</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/termos" className="hover:text-primary transition-colors">Termos de Uso</Link></li>
              <li><Link to="/privacidade" className="hover:text-primary transition-colors">Política de Privacidade</Link></li>
              <li><Link to="/regras" className="hover:text-primary transition-colors">Regras de Criação</Link></li>
              <li><a href="https://wa.me/5516997813038?text=Olá! Gostaria de saber mais sobre o Criando Músicas" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Contato</a></li>
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