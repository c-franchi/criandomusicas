import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UseTourOptions {
  onComplete?: () => void;
  onSkip?: () => void;
}

export const useTour = (options?: UseTourOptions) => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  const getTourSteps = useCallback((): DriveStep[] => {
    const baseSteps: DriveStep[] = [
      {
        popover: {
          title: t('tour.welcome.title', 'Bem-vindo ao Criando Músicas! 🎵'),
          description: t('tour.welcome.description', 'Vamos fazer um tour rápido para você conhecer todas as funcionalidades da plataforma.'),
          side: "bottom",
          align: "center",
        },
      },
      {
        element: '#tour-hero-cta',
        popover: {
          title: t('tour.quickMode.title', '🚀 Modo Rápido'),
          description: t('tour.quickMode.description', 'Este botão leva você direto para a Criação Rápida. Basta contar sua história em um campo de texto e escolher o estilo. Sua música fica pronta em até 12 horas, sem precisar aprovar a letra!'),
          side: "bottom",
          align: "center",
        },
      },
      {
        element: '#tour-hero-secondary-cta',
        popover: {
          title: t('tour.completeMode.title', '📝 Modo Completo'),
          description: t('tour.completeMode.description', 'Prefere mais controle? O modo completo permite escolher tipo de voz, instrumentos, aprovar a letra antes da produção e muito mais. Ideal para presentes especiais e ocasiões importantes!'),
          side: "bottom",
          align: "center",
        },
      },
      {
        popover: {
          title: t('tour.modesComparison.title', 'Qual modo escolher?'),
          description: t('tour.modesComparison.description', '🚀 Rápido: Simples e veloz, entrega em até 12h\n📝 Completo: Mais opções de personalização, você aprova a letra'),
          side: "bottom",
          align: "center",
        },
      },
      {
        element: '#tour-process',
        popover: {
          title: t('tour.process.title', 'Como Funciona'),
          description: t('tour.process.description', 'Entenda o passo a passo para criar sua música. É simples: conte sua história, escolha o estilo e receba sua música!'),
          side: "top",
          align: "center",
        },
      },
      {
        element: '#tour-examples',
        popover: {
          title: t('tour.examples.title', 'Ouça Exemplos'),
          description: t('tour.examples.description', 'Escute algumas músicas que já criamos para nossos clientes. Inspire-se!'),
          side: "top",
          align: "center",
        },
      },
      {
        element: '#tour-plans',
        popover: {
          title: t('tour.plans.title', 'Escolha seu Plano'),
          description: t('tour.plans.description', 'Temos opções para todos os gostos e bolsos. Escolha o plano ideal para você.'),
          side: "top",
          align: "center",
        },
      },
    ];

    // Add user-specific steps if logged in
    if (user) {
      baseSteps.push(
        {
          element: '#tour-dashboard-link',
          popover: {
            title: t('tour.dashboard.title', 'Seus Pedidos'),
            description: t('tour.dashboard.description', 'Acompanhe o status das suas músicas aqui. Você receberá notificações quando ficarem prontas!'),
            side: "bottom",
            align: "center",
          },
        },
        {
          element: '#tour-profile-link',
          popover: {
            title: t('tour.profile.title', 'Seu Perfil'),
            description: t('tour.profile.description', 'Gerencie seus dados, créditos e configurações da conta.'),
            side: "bottom",
            align: "center",
          },
        }
      );
    }

    // Final step
    baseSteps.push({
      popover: {
        title: t('tour.finish.title', 'Pronto para começar! 🎉'),
        description: t('tour.finish.description', 'Agora você conhece a plataforma. Que tal criar sua primeira música?'),
        side: "bottom",
        align: "center",
      },
    });

    return baseSteps;
  }, [t, user]);

  const markTourComplete = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ tour_completed: true })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error marking tour as complete:', error);
    }
  }, [user]);

  const startTour = useCallback(() => {
    const steps = getTourSteps();

    driverRef.current = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      steps,
      nextBtnText: t('tour.buttons.next', 'Próximo'),
      prevBtnText: t('tour.buttons.previous', 'Anterior'),
      doneBtnText: t('tour.buttons.done', 'Concluir'),
      progressText: t('tour.progress', '{{current}} de {{total}}'),
      popoverClass: 'tour-popover',
      onDestroyStarted: () => {
        // User clicked close/skip
        options?.onSkip?.();
        markTourComplete();
        driverRef.current?.destroy();
      },
      onDestroyed: () => {
        options?.onComplete?.();
        markTourComplete();
      },
    });

    driverRef.current.drive();
  }, [getTourSteps, t, options, markTourComplete]);

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
  };
};
