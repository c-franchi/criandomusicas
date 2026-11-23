import { useTranslation } from 'react-i18next';
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Volume2, Loader2 } from "lucide-react";

interface Pronunciation {
  term: string;
  phonetic: string;
}

// Dicionário de pronúncias brasileiras comuns
const BRAZILIAN_PRONUNCIATIONS: Record<string, string> = {
  // Siglas pronunciadas como palavras
  'UTI': 'utei',
  'ONU': 'onu',
  'FIFA': 'fifa',
  'NASA': 'nasa',
  'PIX': 'pix',
  'INSS': 'inésse',
  'PIB': 'pib',
  'FGTS': 'éfe gê tê ésse',
  'SUS': 'sus',
  'DETRAN': 'detrân',
  'ENEM': 'enêm',
  'SAMU': 'samu',
  'PROUNI': 'prouni',
  // Siglas soletradas
  'CPF': 'cê pê éfe',
  'RG': 'érre gê',
  'CEO': 'ci-i-ôu',
  'DJ': 'di-jêi',
  'PT': 'pê tê',
  'CNPJ': 'cê ene pê jota',
  'OAB': 'ô á bê',
  'CRM': 'cê érre ême',
  'CREA': 'cê érre é á',
  'TJ': 'tê jota',
  'MP': 'ême pê',
  'TSE': 'tê ésse é',
  'STF': 'ésse tê éfe',
  'STJ': 'ésse tê jota',
  // Estados brasileiros (siglas)
  'AC': 'a-cê', 'AL': 'a-éle', 'AP': 'a-pê', 'AM': 'a-ême',
  'BA': 'bê-á', 'CE': 'cê-é', 'DF': 'dê-éfe', 'ES': 'é-ésse',
  'GO': 'gê-ó', 'MA': 'ême-á', 'MT': 'ême-tê', 'MS': 'ême-ésse',
  'MG': 'ême gê', 'PA': 'pê-á', 'PB': 'pê-bê', 'PE': 'pê-é',
  'PI': 'pê-í', 'RJ': 'érre jota', 'RN': 'érre-ene', 'RS': 'érre ésse',
  'RO': 'érre-ó', 'RR': 'érre-érre', 'SC': 'ésse-cê', 'SP': 'ésse pê',
  'SE': 'ésse-é', 'TO': 'tê-ó', 'PR': 'pê érre',
  // Times de futebol brasileiros
  'Flamengo': 'flamêngo',
  'Corinthians': 'coríntiâns',
  'Palmeiras': 'paumêiras',
  'São Paulo': 'são páulo',
  'Santos': 'sântos',
  'Grêmio': 'grêmio',
  'Internacional': 'internacionau',
  'Cruzeiro': 'cruzêiro',
  'Atlético': 'atlético',
  'Vasco': 'vásco',
  'Botafogo': 'botafógo',
  'Fluminense': 'fluminênse',
  'Bahia': 'baía',
  'Fortaleza': 'fortalêza',
  'Ceará': 'ceará',
  'Sport': 'espórt',
  'Náutico': 'náutico',
  'Santa Cruz': 'sânta cruz',
  'Coritiba': 'coritíba',
  'Athletico': 'atlétiko',
  'Goiás': 'goiás',
  'Vitória': 'vitória',
  'Chapecoense': 'xapecoênse',
  'Avaí': 'avaí',
  'Figueirense': 'figuerênse',
  'Ponte Preta': 'pônte préta',
  'Guarani': 'guarâni',
  'Bragantino': 'bragantíno',
  'Cuiabá': 'cuiabá',
  'América': 'amérika',
  // Marcas e termos populares
  'iPhone': 'aifón',
  'WhatsApp': 'uóts-épi',
  'Instagram': 'instágrém',
  'TikTok': 'tíc-tóc',
  'YouTube': 'iútubi',
  'Netflix': 'nétflics',
  'Spotify': 'espótifái',
  'Uber': 'úber',
  'iFood': 'ai-fúd',
  'Nubank': 'nubânc',
  'Itaú': 'itaú',
  'Bradesco': 'bradésco',
  'Santander': 'santânder',
  'Petrobras': 'petrobrás',
  'Volkswagen': 'fólcs-váguen',
  'Samsung': 'sãmsung',
  'Xiaomi': 'xiaômi',
  'Havaianas': 'havaianás',
  'Natura': 'natúra',
  'Boticário': 'boticário',
  'Magalu': 'magalú',
  'Renner': 'rênner',
  'Riachuelo': 'riachuêlo',
  'Casas Bahia': 'cázas baía',
  'Americanas': 'amerikânas',
  'Coca-Cola': 'cóca-cóla',
  'Guaraná': 'guaraná',
  'Skol': 'escól',
  'Brahma': 'bráma',
  'Antarctica': 'antártika',
  'Ambev': 'âmbev',
  'JBS': 'jóta bê ésse',
  'Globo': 'glôbo',
  'Record': 'recórd',
  'SBT': 'ésse bê tê',
  'Band': 'bând',
  'RedeTV': 'rêde tê-vê',
  'Gol': 'gól',
  'Azul': 'azúl',
  'LATAM': 'latám',
  'TAM': 'tám',
  'Embraer': 'embraér',
  'Vale': 'váli',
  'Eletrobras': 'eletrobrás',
  'Oi': 'ói',
  'Vivo': 'vívo',
  'Claro': 'cláro',
  'TIM': 'tím',
  'Porto Seguro': 'pôrto segúro',
  'Bradesco Seguros': 'bradésco segúros',
  'Unimed': 'uniméd',
  'Hapvida': 'hapivída',
  'Drogasil': 'drogasíl',
  'Raia': 'ráia',
  'Pão de Açúcar': 'pão di assúcar',
  'Carrefour': 'carrefúr',
  'Atacadão': 'atacadão',
  'Assaí': 'assaí',
  'Makro': 'mákro',
  'Leroy Merlin': 'lerói merlín',
  'Tok&Stok': 'tóc i stóc',
  'Centauro': 'centáuro',
  'Netshoes': 'nét-xúz',
  'Mercado Livre': 'mercádo lívre',
  'Amazon': 'amazón',
  'AliExpress': 'áli-esprés',
  'Shopee': 'xopí',
  'Shein': 'xiín',
  // Termos de internet/tech
  'Wi-Fi': 'uái-fái',
  'Bluetooth': 'blutúf',
  'USB': 'u-ésse-bê',
  'LED': 'léd',
  'GPS': 'gê-pê-ésse',
  'HD': 'agá-dê',
  'SSD': 'ésse-ésse-dê',
  'PC': 'pê-cê',
  'TV': 'tê-vê',
  'DVD': 'dê-vê-dê',
  'CD': 'cê-dê',
  'MP3': 'ême-pê-três',
  'PDF': 'pê-dê-éfe',
  'JPG': 'jóta-pê-gê',
  'PNG': 'pê-ene-gê',
  'URL': 'u-érre-éle',
  'API': 'a-pê-í',
  'SQL': 'ésse-quê-éle',
  // Expressões comuns
  'VIP': 'víp',
  'PDV': 'pê-dê-vê',
  'MEI': 'mêi',
  'LTDA': 'limitáda',
  'CIA': 'companhía',
  'S/A': 'ésse-á',
  // Outros termos populares
  'COVID': 'côvid',
  'Uber Eats': 'úber íts',
  'Rappi': 'rápi',
  '99': 'novênta i nóvi',
  'Cabify': 'cabifái',
  'PayPal': 'pêi-pál',
  'PicPay': 'píc-pêi',
  'Mercado Pago': 'mercádo págo',
};

interface PronunciationModalProps {
  open: boolean;
  onClose: () => void;
  missingTerms: string[];
  onSubmit: (pronunciations: Pronunciation[]) => void;
  loading?: boolean;
}

const PronunciationModal = ({
  open,
  onClose,
  missingTerms,
  onSubmit,
  loading = false
}: PronunciationModalProps) => {
  const { t: tb } = useTranslation('uiBriefing');
  // Pre-populate with known pronunciations
  const [pronunciations, setPronunciations] = useState<Record<string, string>>(
    Object.fromEntries(
      missingTerms.map(term => [term, BRAZILIAN_PRONUNCIATIONS[term] || ''])
    )
  );

  const handleSubmit = () => {
    const result: Pronunciation[] = missingTerms.map(term => ({
      term,
      phonetic: pronunciations[term] || term
    }));
    onSubmit(result);
  };

  const allFilled = missingTerms.every(term => pronunciations[term]?.trim());

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            {tb('text136')}
          </DialogTitle>
          <DialogDescription className="text-left">
            <span className="block mb-2">
              {tb('text137')}
            </span>
            <span className="block text-primary font-medium">
              {tb('text138')}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {missingTerms.map((term) => (
            <div key={term} className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
              <Label className="flex items-center gap-2">
                <span className="font-mono bg-primary/20 px-3 py-1.5 rounded text-primary font-bold text-lg">{term}</span>
                <Volume2 className="w-4 h-4 text-muted-foreground" />
              </Label>
              <Input
                placeholder={tb('text139', { term })}
                value={pronunciations[term] || ''}
                onChange={(e) => setPronunciations(prev => ({
                  ...prev,
                  [term]: e.target.value
                }))}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                {tb('text140')} <strong>{tb('text141')}</strong>
              </p>
            </div>
          ))}
        </div>

        <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg text-sm space-y-2">
          <p className="font-medium text-foreground">{tb('text142')}</p>
          <ul className="text-muted-foreground space-y-1 list-disc list-inside">
            <li><strong>UTI</strong> {tb('text143')}</li>
            <li><strong>CPF</strong> {tb('text144')}</li>
            <li><strong>iPhone</strong> → "aifón"</li>
            <li><strong>Wi-Fi</strong> → "uái-fái"</li>
            <li><strong>CEO</strong> {tb('text145')}</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-2">
            {tb('text146')}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {tb('text128')}
          </Button>
          <Button onClick={handleSubmit} disabled={!allFilled || loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {tb('text147')}
              </>
            ) : (
              tb('text148')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PronunciationModal;
