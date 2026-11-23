import { Share2, Copy, Facebook, Twitter, MessageCircle } from 'lucide-react';
import { Fragment } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { canShareInMarket, voucherShareText, voucherShareUrl, voucherShortText, MARKET_SITE, type ShareMarket, type ShareVoucher } from '@/lib/voucher-share';

interface VoucherShareMenuProps { voucher: ShareVoucher & { id: string; is_active: boolean } }

const MARKETS: { id: ShareMarket; label: string }[] = [
  { id: 'BR', label: '🇧🇷 Brasil · português' },
  { id: 'IT', label: '🇮🇹 Itália · italiano' },
];

export function VoucherShareMenu({ voucher }: VoucherShareMenuProps) {
  const { toast } = useToast();
  const open = (url: string) => window.open(url, '_blank');
  const copy = async (m: ShareMarket) => {
    try {
      await navigator.clipboard.writeText(voucherShareText(voucher, m));
      toast({ title: 'Cupom copiado!', description: 'Cole nas suas redes sociais.' });
    } catch {
      toast({ title: 'Erro ao copiar', description: 'Tente novamente.', variant: 'destructive' });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" title="Compartilhar voucher"><Share2 className="w-4 h-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 bg-card border border-border">
        {MARKETS.map((m, i) => (
          <Fragment key={m.id}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{m.label}</DropdownMenuLabel>
            {canShareInMarket(voucher, m.id) ? (<>
              <DropdownMenuItem onClick={() => open(`https://wa.me/?text=${encodeURIComponent(voucherShareText(voucher, m.id))}`)} className="cursor-pointer">
                <MessageCircle className="w-4 h-4 mr-2 text-green-500" />WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(voucherShareUrl(voucher, m.id))}`)} className="cursor-pointer">
                <Facebook className="w-4 h-4 mr-2 text-blue-600" />Facebook
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(voucherShortText(voucher, m.id))}&url=${encodeURIComponent(MARKET_SITE[m.id])}`)} className="cursor-pointer">
                <Twitter className="w-4 h-4 mr-2 text-sky-500" />Twitter/X
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copy(m.id)} className="cursor-pointer">
                <Copy className="w-4 h-4 mr-2" />Copiar texto
              </DropdownMenuItem>
            </>) : (
              <p className="px-2 pb-2 text-xs text-muted-foreground">Na Itália só valem vouchers de porcentagem para música.</p>
            )}
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default VoucherShareMenu;
