import i18n from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export interface OrderStatusValidation {
  isValid: boolean;
  order?: {
    id: string;
    status: string | null;
    approved_lyric_id: string | null;
    has_custom_lyric?: boolean | null;
    is_instrumental?: boolean | null;
  };
  error?: string;
}

const PROCESSED_STATUSES = new Set([
  "LYRICS_APPROVED",
  "MUSIC_GENERATING",
  "MUSIC_READY",
  "COMPLETED",
]);

export class OrderStatusService {
  static async validateOrderState(orderId: string): Promise<OrderStatusValidation> {
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, status, approved_lyric_id, has_custom_lyric, is_instrumental")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return {
        isValid: false,
        error: error?.message || i18n.t("checkout:orderNotFound"),
      };
    }

    if (order.status === "CANCELLED") {
      return {
        isValid: false,
        order,
        error: i18n.t("dashboard:statuses.CANCELLED"),
      };
    }

    return {
      isValid: true,
      order,
    };
  }

  static async checkIfAlreadyProcessed(orderId: string): Promise<boolean> {
    const validation = await this.validateOrderState(orderId);

    if (!validation.isValid || !validation.order) {
      return false;
    }

    const { status, approved_lyric_id } = validation.order;

    if (approved_lyric_id) {
      return true;
    }

    return status ? PROCESSED_STATUSES.has(status) : false;
  }
}
