import { Share2, Copy, Facebook, Twitter, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface Voucher {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  valid_until: string | null;
  plan_ids: string[] | null;
  is_active: boolean;
}

interface VoucherShareMenuProps {
  voucher: Voucher;
}

const PLAN_LABELS: Record<string, string> = {
  single: '1 Crédito Universal + cartões',
  package: 'Pacote 3 Músicas',
  subscription: 'Pacote 5 Músicas',
  single_custom_lyric: 'Letra Própria',
  creator_start: 'Creator Start',
  creator_pro: 'Creator Pro',
  creator_studio: 'Creator Studio',
};

const formatPlanNames = (planIds: string[] | null): string => {
  if (!planIds || planIds.length === 0) {
    return 'Todos os planos';
  }
  
  const planNames = planIds.map(id => PLAN_LABELS[id] || id);
  
  if (planNames.length === 1) {
    return planNames[0];
  }
  
  if (planNames.length === 2) {
    return planNames.join(' e ');
  }
  
  // 3+ plans: "Plan1, Plan2 e Plan3"
  const lastPlan = planNames.pop();
  return `${planNames.join(', ')} e ${lastPlan}`;
};

const generateVoucherShareText = (voucher: Voucher): string => {
  const discount = voucher.discount_type === 'percent'
    ? `${voucher.discount_value}% de desconto`
    : `R$ ${(voucher.discount_value / 100).toFixed(2).replace('.', ',')} de desconto`;

  const expiry = voucher.valid_until
    ? `\nVálido até: ${format(new Date(voucher.valid_until), "dd/MM/yyyy", { locale: ptBR })}`
    : '';

  const plansText = `\nVálido para: ${formatPlanNames(voucher.plan_ids)}`;

  return `🎵 CUPOM DE DESCONTO 🎵\n\n` +
    `Use o código: *${voucher.code}*\n` +
    `Desconto: ${discount}` +
    `${plansText}` +
    `${expiry}\n\n` +
    `🎶 Crie sua música personalizada em:\n` +
    `https://criandomusicas.com.br`;
};

export function VoucherShareMenu({ voucher }: VoucherShareMenuProps) {
  const { toast } = useToast();

  const shareVoucherWhatsApp = () => {
    const text = generateVoucherShareText(voucher);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareVoucherFacebook = () => {
    const url = `https://criandomusicas.com.br?voucher=${encodeURIComponent(voucher.code)}`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  const shareVoucherTwitter = () => {
    const plansInfo = voucher.plan_ids && voucher.plan_ids.length > 0 
      ? ` para ${formatPlanNames(voucher.plan_ids)}` 
      : '';
    const text = `🎵 Use o cupom ${voucher.code} e ganhe desconto${plansInfo} na sua música personalizada! 🎶`;
    const url = `https://criandomusicas.com.br`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const copyVoucherText = async () => {
    const text = generateVoucherShareText(voucher);
    try {
      await navigator.clipboard.writeText(text);
      toast({ 
        title: 'Cupom copiado!', 
        description: 'Cole nas suas redes sociais.' 
      });
    } catch {
      toast({ 
        title: 'Erro ao copiar', 
        description: 'Tente novamente.', 
        variant: 'destructive' 
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" title="Compartilhar voucher">
          <Share2 className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-card border border-border">
        <DropdownMenuItem onClick={shareVoucherWhatsApp} className="cursor-pointer">
          <MessageCircle className="w-4 h-4 mr-2 text-green-500" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareVoucherFacebook} className="cursor-pointer">
          <Facebook className="w-4 h-4 mr-2 text-blue-600" />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareVoucherTwitter} className="cursor-pointer">
          <Twitter className="w-4 h-4 mr-2 text-sky-500" />
          Twitter/X
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyVoucherText} className="cursor-pointer">
          <Copy className="w-4 h-4 mr-2" />
          Copiar Texto
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default VoucherShareMenu;
