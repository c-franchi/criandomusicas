import { supabase } from "@/integrations/supabase/client";

export const reprocessPaidOrders = async () => {
  try {
    console.log('Reprocessing paid orders...');
    
    // Get all paid orders
    const { data: paidOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, user_id')
      .eq('status', 'PAID')
      .eq('payment_status', 'PAID');

    if (ordersError) throw ordersError;

    console.log(`Found ${paidOrders?.length || 0} paid orders`);

    const results = [];

    for (const order of paidOrders || []) {
      // Check if lyrics already exist
      const { data: existingLyrics } = await supabase
        .from('lyrics')
        .select('id')
        .eq('order_id', order.id);

      if (existingLyrics && existingLyrics.length > 0) {
        console.log(`Order ${order.id} already has lyrics, skipping`);
        continue;
      }

      try {
        // Call generate-lyrics function
        console.log(`Generating lyrics for order ${order.id}`);
        const { data, error } = await supabase.functions.invoke('generate-lyrics', {
          body: { orderId: order.id }
        });

        if (error) {
          console.error(`Error generating lyrics for order ${order.id}:`, error);
          results.push({ orderId: order.id, status: 'error', error: error.message });
        } else {
          console.log(`Successfully generated lyrics for order ${order.id}`);
          results.push({ orderId: order.id, status: 'success' });
        }
      } catch (functionError: any) {
        console.error(`Function error for order ${order.id}:`, functionError);
        results.push({ orderId: order.id, status: 'error', error: functionError.message });
      }
    }

    return { results, totalProcessed: results.filter(r => r.status === 'success').length };
  } catch (error: any) {
    console.error('Error reprocessing orders:', error);
    throw error;
  }
};