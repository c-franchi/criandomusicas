import { Card } from "@/components/ui/card";
import { CheckCircle, PlayCircle, Music, FileText } from "lucide-react";

interface StatusCounts {
  ready: number;
  generating: number;
  completed: number;
  total: number;
  awaitingPix: number;
}

interface AdminStatsCardsProps {
  statusCounts: StatusCounts;
}

const AdminStatsCards = ({ statusCounts }: AdminStatsCardsProps) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
      <Card className="p-3 sm:p-4 bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20 hover:border-green-500/40 transition-colors">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold text-green-400">{statusCounts.ready}</p>
            <p className="text-[10px] sm:text-sm text-muted-foreground leading-tight">Prontos p/ Produção</p>
          </div>
        </div>
      </Card>
      
      <Card className="p-3 sm:p-4 bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20 hover:border-yellow-500/40 transition-colors">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
            <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold text-yellow-400">{statusCounts.generating}</p>
            <p className="text-[10px] sm:text-sm text-muted-foreground leading-tight">Em Produção</p>
          </div>
        </div>
      </Card>
      
      <Card className="p-3 sm:p-4 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Music className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-400">{statusCounts.completed}</p>
            <p className="text-[10px] sm:text-sm text-muted-foreground leading-tight">Concluídos</p>
          </div>
        </div>
      </Card>
      
      <Card className="p-3 sm:p-4 bg-gradient-to-br from-primary/10 to-transparent border-primary/20 hover:border-primary/40 transition-colors">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold text-primary">{statusCounts.total}</p>
            <p className="text-[10px] sm:text-sm text-muted-foreground leading-tight">Total de Pedidos</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminStatsCards;
