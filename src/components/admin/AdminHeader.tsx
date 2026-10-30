import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { Music, Home, ClipboardList, Gift, Megaphone, Settings } from "lucide-react";
import "./admin-responsive.css";

const sections = [
  { to: "/admin", label: "Pedidos", icon: ClipboardList, end: true },
  { to: "/admin/presentes", label: "Cartões", icon: Gift, end: false },
  { to: "/admin/marketing", label: "Marketing", icon: Megaphone, end: false },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings, end: false },
];

/** One navigation for every admin route. Grid tracks may shrink below label width. */
export default function AdminHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <header className="admin-header">
    <div className="admin-header-inner">
      <div className="admin-heading">
        <Music className="admin-brand-icon" aria-hidden="true" />
        <div><p className="admin-eyebrow">Criando Músicas · ADM</p><h1>{title}</h1>{description && <p className="admin-description">{description}</p>}</div>
        <Link to="/" className="admin-home" aria-label="Ir para o site"><Home size={20} /></Link>
      </div>
      <nav className="admin-section-tabs" aria-label="Áreas do painel administrativo">
        {sections.map(({to,label,icon:Icon,end})=><NavLink key={to} to={to} end={end} className={({isActive})=>isActive ? "admin-section-tab is-active" : "admin-section-tab"}><Icon size={18} aria-hidden="true"/><span>{label}</span></NavLink>)}
      </nav>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </div>
  </header>;
}
