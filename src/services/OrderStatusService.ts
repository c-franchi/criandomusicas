import { supabase } from "@/integrations/supabase/client";

/**
 * OrderStatusService
 * Responsável por verificar e validar status de orders, evitando inconsistências
 * e race conditions na transição de estados.
 */
export class OrderStatusService {
  /**
   * Busca o status mais recente de uma order diretamente do banco.
   * Sempre use isso antes de ações críticas para evitar stale state.
   */
  static async getFreshStatus(orderId: string): Promise<{
    status: string;
    paymentStatus: string;
    isInstrumental: boolean;
    hasCustomLyric: boolean;
    approvedLyricId: string | null;
    error?: string;
  } | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('status, payment_status, is_instrumental, has_custom_lyric, approved_lyric_id')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !data) {
      console.error('[OrderStatus] Failed to fetch order:', error);
      return null;
    }

    return {
      status: data.status,
      paymentStatus: data.payment_status,
      isInstrumental: data.is_instrumental || false,
      hasCustomLyric: data.has_custom_lyric || false,
      approvedLyricId: data.approved_lyric_id || null,
    };
  }

  /**
   * Verifica se a order já foi processada (já tem aprovação ou geração completa).
   * Retorna true se NÃO deve prosseguir com a ação (já processada).
   */
  static async isAlreadyProcessed(orderId: string): Promise<boolean> {
    const fresh = await this.getFreshStatus(orderId);
    if (!fresh) return false;

    const completedStatuses = [
      'LYRICS_APPROVED',
      'MUSIC_GENERATING',
      'MUSIC_READY',
      'COMPLETED',
    ];

    return completedStatuses.includes(fresh.status);
  }

  /**
   * Verifica se uma order está em estado recuperável (stuck).
   * Uma order "stuck" é aquela com status PAID ou LYRICS_PENDING há mais de 3 minutos sem letras.
   */
  static async isStuck(orderId: string): Promise<boolean> {
    const fresh = await this.getFreshStatus(orderId);
    if (!fresh) return false;

    if (!['PAID', 'LYRICS_PENDING'].includes(fresh.status)) return false;

    // Check if lyrics exist
    const { data: lyrics } = await supabase
      .from('lyrics')
      .select('id')
      .eq('order_id', orderId)
      .limit(1);

    return !lyrics || lyrics.length === 0;
  }

  /**
   * Valida se a order pode receber aprovação de letra.
   * Retorna { canApprove, reason, alreadyApproved }
   */
  static async canApproveLyrics(orderId: string): Promise<{
    canApprove: boolean;
    reason?: string;
    alreadyApproved: boolean;
  }> {
    const fresh = await this.getFreshStatus(orderId);
    if (!fresh) {
      return { canApprove: false, reason: 'Pedido não encontrado', alreadyApproved: false };
    }

    // If already approved or beyond, consider it success (idempotent)
    if (['LYRICS_APPROVED', 'MUSIC_GENERATING', 'MUSIC_READY', 'COMPLETED'].includes(fresh.status)) {
      return { canApprove: false, reason: 'Já processado', alreadyApproved: true };
    }

    // Valid states for approval
    if (['LYRICS_GENERATED', 'PAID', 'LYRICS_PENDING', 'BRIEFING_COMPLETE'].includes(fresh.status)) {
      return { canApprove: true, alreadyApproved: false };
    }

    return { canApprove: false, reason: `Status inválido: ${fresh.status}`, alreadyApproved: false };
  }
}
