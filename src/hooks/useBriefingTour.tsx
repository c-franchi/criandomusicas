import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

interface UseBriefingTourOptions {
  mode: 'quick' | 'detailed';
  onComplete?: () => void;
  onSkip?: () => void;
}

export const useBriefingTour = (options: UseBriefingTourOptions) => {
  const { t } = useTranslation('briefing');
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const [hasShownTour, setHasShownTour] = useState(false);

  const getQuickModeSteps = useCallback((): DriveStep[] => {
    return [
      {
        popover: {
          title: t('tour.quickMode.welcome.title', '🚀 Modo Criação Rápida'),
          description: t('tour.quickMode.welcome.description', 'Este é o modo mais rápido para criar sua música! Vamos te mostrar como funciona.'),
          side: "bottom",
          align: "center",
        },
      },
      {
        element: 'textarea',
        popover: {
          title: t('tour.quickMode.prompt.title', '📝 Conte sua história'),
          description: t('tour.quickMode.prompt.description', 'Escreva aqui o que você quer na sua música: a história, os sentimentos, nomes importantes, momentos especiais... Quanto mais detalhes, melhor a letra!'),
          side: "bottom",
          align: "center",
        },
      },
      {
        element: '[class*="ImageCardGrid"]',
        popover: {
          title: t('tour.quickMode.genre.title', '🎵 Escolha o gênero'),
          description: t('tour.quickMode.genre.description', 'Selecione o estilo musical que combina com sua música. Toque para ver todas as opções!'),
          side: "top",
          align: "center",
        },
      },
      {
        element: '[class*="Switch"]',
        popover: {
          title: t('tour.quickMode.instrumental.title', '🎹 Instrumental'),
          description: t('tour.quickMode.instrumental.description', 'Ative se quiser uma música sem vocal, apenas instrumental.'),
          side: "top",
          align: "center",
        },
      },
      {
        element: 'button[class*="hero"]',
        popover: {
          title: t('tour.quickMode.create.title', '✨ Criar Música'),
          description: t('tour.quickMode.create.description', 'Quando tudo estiver pronto, clique aqui! Sua música ficará pronta em até 12 horas, sem precisar aprovar letra.'),
          side: "top",
          align: "center",
        },
      },
      {
        element: 'button[class*="from-primary"]',
        popover: {
          title: t('tour.quickMode.detailed.title', '📝 Quer mais controle?'),
          description: t('tour.quickMode.detailed.description', 'Se preferir escolher voz, instrumentos e aprovar a letra antes, use o "Modo Completo" clicando aqui!'),
          side: "top",
          align: "center",
        },
      },
      {
        popover: {
          title: t('tour.quickMode.finish.title', 'Pronto! 🎉'),
          description: t('tour.quickMode.finish.description', 'Agora é só contar sua história e criar sua música. Boa criação!'),
          side: "bottom",
          align: "center",
        },
      },
    ];
  }, [t]);

  const getDetailedModeSteps = useCallback((): DriveStep[] => {
    return [
      {
        popover: {
          title: t('tour.detailedMode.welcome.title', '📝 Modo Completo'),
          description: t('tour.detailedMode.welcome.description', 'Este modo permite personalizar cada detalhe da sua música!'),
          side: "bottom",
          align: "center",
        },
      },
      {
        popover: {
          title: t('tour.detailedMode.steps.title', '🎯 Passo a passo'),
          description: t('tour.detailedMode.steps.description', 'Você vai responder perguntas sobre tipo de música, emoção, voz, instrumentos e muito mais. No final, você aprova a letra antes da produção!'),
          side: "bottom",
          align: "center",
        },
      },
      {
        popover: {
          title: t('tour.detailedMode.finish.title', 'Vamos criar! 🎉'),
          description: t('tour.detailedMode.finish.description', 'Responda às perguntas e crie uma música única e personalizada!'),
          side: "bottom",
          align: "center",
        },
      },
    ];
  }, [t]);

  const startTour = useCallback(() => {
    if (hasShownTour) return;

    const steps = options.mode === 'quick' ? getQuickModeSteps() : getDetailedModeSteps();

    driverRef.current = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      steps,
      nextBtnText: t('tour.buttons.next', 'Próximo'),
      prevBtnText: t('tour.buttons.previous', 'Anterior'),
      doneBtnText: t('tour.buttons.done', 'Entendi!'),
      progressText: t('tour.progress', '{{current}} de {{total}}'),
      popoverClass: 'tour-popover briefing-tour',
      onDestroyStarted: () => {
        options?.onSkip?.();
        setHasShownTour(true);
        driverRef.current?.destroy();
      },
      onDestroyed: () => {
        options?.onComplete?.();
        setHasShownTour(true);
      },
    });

    driverRef.current.drive();
  }, [getQuickModeSteps, getDetailedModeSteps, t, options, hasShownTour]);

  const stopTour = useCallback(() => {
    driverRef.current?.destroy();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      driverRef.current?.destroy();
    };
  }, []);

  return {
    startTour,
    stopTour,
    hasShownTour,
  };
};
