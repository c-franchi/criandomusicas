import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trash2 } from "lucide-react";
import { TFunction } from "i18next";

interface Order {
  id: string;
  status?: string;
  payment_status?: string;
  created_at?: string;
  music_type?: string;
  music_style?: string;
  story?: string;
  approved_lyric_id?: string;
  lyric_title?: string;
  amount?: number;
  is_instrumental?: boolean;
  has_custom_lyric?: boolean;
  song_title?: string;
}

interface OrderCardProps {
  order: Order;
  index: number;
  t: TFunction;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string, isInstrumental?: boolean) => string;
  setDeleteOrderId: (id: string | null) => void;
}

export const OrderCard = ({ 
  order, 
  index, 
  t, 
  getStatusColor, 
  getStatusText,
  setDeleteOrderId 
}: OrderCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 * Math.min(index, 5) }}
      whileHover={{ scale: 1.01, y: -2 }}
    >
      <Link to={`/pedido/${order.id}`} className="block group">
        <Card className="p-4 sm:p-6 transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 cursor-pointer">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg mb-1 break-words text-foreground group-hover:text-primary transition-colors">
                {order.song_title || order.lyric_title || `Música ${order.music_type || 'Personalizada'}`}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                {order.music_style || 'Estilo'} • {order.music_type || 'Tipo'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={getStatusColor(order.status || 'DRAFT')}>
                  {getStatusText(order.status || 'DRAFT', order.is_instrumental)}
                </Badge>
                {order.has_custom_lyric && (
                  <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                    {t('badges.customLyric')}
                  </Badge>
                )}
                {order.is_instrumental && !order.has_custom_lyric && (
                  <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-600 dark:text-purple-400 bg-purple-500/10">
                    {t('badges.instrumental')}
                  </Badge>
                )}
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {t('order.createdAt', { date: order.created_at ? new Date(order.created_at).toLocaleDateString() : '' })}
                </span>
              </div>
            </div>
            
            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0">
              <div className="text-xl sm:text-2xl font-bold text-primary">
                R$ {((order.amount || 0) / 100).toFixed(2).replace('.', ',')}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="pointer-events-none">
                  {t('order.view')}
                  <ExternalLink className="w-4 h-4 ml-1 sm:ml-2" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeleteOrderId(order.id);
                  }}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  title={t('order.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {order.story && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground break-words line-clamp-2">
                {order.story.slice(0, 150)}
                {order.story.length > 150 ? '...' : ''}
              </p>
            </div>
          )}
        </Card>
      </Link>
    </motion.div>
  );
};

export default OrderCard;
