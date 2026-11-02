/** Server-side suppression for IT sandbox side effects. Never trust a caller's test flag. */
export async function isItalySandboxOrder(client: any, orderId: unknown): Promise<boolean> {
 if(typeof orderId !== 'string' || !/^[0-9a-f-]{36}$/i.test(orderId)) return false;
 const {data,error}=await client.from('orders').select('sandbox_market').eq('id',orderId).maybeSingle();
 if(error) throw error;
 return data?.sandbox_market==='IT_TEST';
}
