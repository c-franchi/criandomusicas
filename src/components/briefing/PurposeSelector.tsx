import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronDown, ChevronRight, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PurposeId } from "@/lib/briefingPurpose";
import { cn } from "@/lib/utils";

interface PurposeSelectorProps {
  onSelect: (purpose: PurposeId) => void;
  onBack: () => void;
}

type MainCard = { id: PurposeId | 'company'; emoji: string; title: string; desc: string };

export const PurposeSelector = ({ onSelect, onBack }: PurposeSelectorProps) => {
  const { t } = useTranslation('briefing');
  const [companyOpen, setCompanyOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const main: MainCard[] = [
    { id: 'gift', emoji: '🎁', title: t('purpose.gift', 'Presente ou homenagem'), desc: t('purpose.giftDesc', 'Para mãe, amor, amigo, aniversário, casamento…') },
    { id: 'company', emoji: '🏢', title: t('purpose.company', 'Empresa ou equipe'), desc: t('purpose.companyDesc', 'Motivar equipe, música da empresa ou propaganda') },
    { id: 'motivation', emoji: '💪', title: t('purpose.motivation', 'Motivação pessoal'), desc: t('purpose.motivationDesc', 'Treino, estudo, superação, recomeço') },
    { id: 'faith', emoji: '🙏', title: t('purpose.faith', 'Fé / Gospel'), desc: t('purpose.faithDesc', 'Louvor, adoração, gratidão a Deus') },
    { id: 'kids', emoji: '🎈', title: t('purpose.kids', 'Infantil'), desc: t('purpose.kidsDesc', 'Para crianças: rotina, aprendizado, diversão') },
    { id: 'video', emoji: '🎬', title: t('purpose.video', 'Vídeo ou projeto'), desc: t('purpose.videoDesc', 'Trilha para vídeo, podcast, redes sociais') },
  ];

  const company: { id: PurposeId; title: string; desc: string }[] = [
    { id: 'company_team', title: t('purpose.companyTeam', 'Motivar minha equipe / evento interno'), desc: t('purpose.companyTeamDesc', 'Metas, união, convenção de vendas, celebração') },
    { id: 'company_anthem', title: t('purpose.companyAnthem', 'Hino ou música institucional da empresa'), desc: t('purpose.companyAnthemDesc', 'A história e os valores da empresa') },
    { id: 'company_jingle', title: t('purpose.companyJingle', 'Jingle / propaganda de produto ou serviço'), desc: t('purpose.companyJingleDesc', 'Com nome, telefone e chamada para ação') },
  ];

  const more: { id: PurposeId; emoji: string; title: string }[] = [
    { id: 'custom_lyric', emoji: '📝', title: t('purpose.customLyric', 'Já tenho a letra') },
    { id: 'instrumental', emoji: '🎹', title: t('purpose.instrumental', 'Só instrumental (sem voz)') },
    { id: 'audio', emoji: '🎙️', title: t('purpose.audio', 'Criar contando por áudio') },
  ];

  const cardClass = "w-full text-left flex items-center gap-4 p-4 min-h-[72px] rounded-2xl border border-border bg-card hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors";

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="border-b bg-card/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={companyOpen ? () => setCompanyOpen(false) : onBack} aria-label={t('purpose.back', 'Voltar')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Music className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground">{t('purpose.progress', 'Passo {{n}} de 3', { n: companyOpen ? 2 : 1 })}</span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        {!companyOpen ? (
          <>
            <h1 className="text-2xl font-bold mb-1">{t('purpose.title', 'Qual é a finalidade da sua música?')}</h1>
            <p className="text-muted-foreground mb-5">{t('purpose.subtitle', 'Escolha uma opção. Você revisa tudo antes de pagar.')}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {main.map(c => (
                <button
                  key={c.id}
                  type="button"
                  data-purpose={c.id}
                  className={cardClass}
                  onClick={() => (c.id === 'company' ? setCompanyOpen(true) : onSelect(c.id))}
                >
                  <span className="text-3xl" aria-hidden>{c.emoji}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold">{c.title}</span>
                    <span className="block text-sm text-muted-foreground">{c.desc}</span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setMoreOpen(o => !o)}
              aria-expanded={moreOpen}
              className="mt-6 w-full flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground py-3"
            >
              {t('purpose.more', 'Ver mais opções')}
              <ChevronDown className={cn("w-4 h-4 transition-transform", moreOpen && "rotate-180")} />
            </button>
            {moreOpen && (
              <div className="grid gap-2 sm:grid-cols-3">
                {more.map(m => (
                  <button key={m.id} type="button" data-purpose={m.id} onClick={() => onSelect(m.id)} className="flex items-center gap-3 p-3 min-h-[56px] rounded-xl border border-border bg-card/60 hover:border-primary text-sm font-medium text-left">
                    <span className="text-xl" aria-hidden>{m.emoji}</span>{m.title}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-1">{t('purpose.companyTitle', 'O que a música vai fazer pela empresa?')}</h1>
            <p className="text-muted-foreground mb-5">{t('purpose.companySubtitle', 'Escolha o objetivo mais próximo.')}</p>
            <div className="grid gap-3">
              {company.map(c => (
                <button key={c.id} type="button" data-purpose={c.id} className={cardClass} onClick={() => onSelect(c.id)}>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold">{c.title}</span>
                    <span className="block text-sm text-muted-foreground">{c.desc}</span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
            <button type="button" data-purpose="company_voiceover" onClick={() => onSelect('company_voiceover')} className="mt-5 w-full text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 py-3">
              {t('purpose.companyVoiceover', 'Prefiro uma narração / chamada falada')}
            </button>
          </>
        )}
      </main>
    </div>
  );
};

export default PurposeSelector;
