/** Bound transient retries to one invocation, keeping the event idempotency key. */
export async function emailFetch(url:string, options:RequestInit, send:typeof fetch=fetch, pause:(ms:number)=>Promise<void>=ms=>new Promise(r=>setTimeout(r,ms))) {
 for(let attempt=0;attempt<3;attempt++) {
  try {
   const response=await send(url,{...options,signal:AbortSignal.timeout(10000)});
   if((response.status!==429&&response.status<500)||attempt===2) return response;
   await response.body?.cancel();
  } catch(e) {if(attempt===2) throw e;}
  await pause(500*2**attempt);
 }
 throw Error('email_retry_exhausted');
}
