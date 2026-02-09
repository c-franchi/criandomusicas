import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trash2, Music, RefreshCw, AlertTriangle } from "lucide-react";
import { TFunction } from "i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

interface OrderAccordionProps {
  orders: Order[];
  t: TFunction;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string, isInstrumental?: boolean) => string;
  setDeleteOrderId: (id: string | null) => void;
  stuckOrderIds?: Set<string>;
  onRetryOrder?: (orderId: string) => Promise<void>;
}

export const OrderAccordion = ({ 
  orders, 
  t, 
  getStatusColor, 
  getStatusText,
  setDeleteOrderId,
  stuckOrderIds,
  onRetryOrder,
}: OrderAccordionProps) => {
  const [retryingOrderId, setRetryingOrderId] = useState<string | null>(null);

  const handleRetry = async (orderId: string) => {
    if (!onRetryOrder) return;
    setRetryingOrderId(orderId);
    try {
      await onRetryOrder(orderId);
    } finally {
      setRetryingOrderId(null);
    }
  };

  return (
    <Accordion type="single" collapsible className="w-full space-y-2">
      {orders.map((order) => {
        const isStuck = stuckOrderIds?.has(order.id) ?? false;
        const isRetrying = retryingOrderId === order.id;

        return (
          <AccordionItem 
            key={order.id} 
            value={order.id}
            className={`border rounded-lg bg-card/50 backdrop-blur-sm px-4 data-[state=open]:bg-card transition-colors ${isStuck ? 'border-amber-500/50' : ''}`}
          >
            <AccordionTrigger className="hover:no-underline py-3 sm:py-4">
              <div className="flex flex-1 items-center justify-between gap-2 sm:gap-4 pr-2 sm:pr-4 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className="shrink-0">
                    {isStuck ? (
                      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                    ) : (
                      <Music className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    )}
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <p className="font-semibold text-xs sm:text-base truncate">
                      {order.song_title || order.lyric_title || `${order.music_type || 'Música'}`}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {order.music_style || 'Estilo'} • {new Date(order.created_at || '').toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {isStuck ? (
                    <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 whitespace-nowrap">
                      ⚠️ {t('statuses.stuck', 'Requer ação')}
                    </Badge>
                  ) : (
                    <Badge className={`${getStatusColor(order.status || 'DRAFT')} text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 whitespace-nowrap max-w-[80px] sm:max-w-none truncate`}>
                      {getStatusText(order.status || 'DRAFT', order.is_instrumental)}
                    </Badge>
                  )}
                  <span className="font-bold text-primary text-xs sm:text-sm hidden sm:block">
                    R$ {((order.amount || 0) / 100).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2 pb-4 space-y-4">
                {/* Stuck order warning */}
                {isStuck && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        {t('order.stuckTitle', 'Geração de letras não completou')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('order.stuckDescription', 'O crédito foi consumido mas a letra não foi gerada. Clique em "Tentar novamente" para reprocessar.')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {order.has_custom_lyric && (
                    <Badge variant="outline" className="text-xs border-accent/50 text-accent bg-accent/10">
                      {t('badges.customLyric')}
                    </Badge>
                  )}
                  {order.is_instrumental && !order.has_custom_lyric && (
                    <Badge variant="outline" className="text-xs border-primary/50 text-primary bg-primary/10">
                      {t('badges.instrumental')}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground sm:hidden font-bold">
                    R$ {((order.amount || 0) / 100).toFixed(2).replace('.', ',')}
                  </span>
                </div>

                {/* Story preview */}
                {order.story && (
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      "{order.story.slice(0, 200)}
                      {order.story.length > 200 ? '...' : ''}"
                    </p>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  {isStuck && onRetryOrder ? (
                    <Button 
                      size="sm" 
                      className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-600 text-white"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRetry(order.id);
                      }}
                      disabled={isRetrying}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                      {isRetrying 
                        ? t('order.retrying', 'Processando...') 
                        : t('order.retry', 'Tentar novamente')
                      }
                    </Button>
                  ) : (
                    <Button asChild size="sm" className="flex-1 sm:flex-none">
                      <Link to={`/pedido/${order.id}`}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {t('order.view')}
                      </Link>
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteOrderId(order.id);
                    }}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('order.delete')}
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};

export default OrderAccordion;
