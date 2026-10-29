export type LyricApprovalState = 'approved' | 'pending' | 'inconsistent';
/** A selected ID alone is not proof that both approval records committed. */
export function lyricApprovalEvidence(order: {id?:string;approved_lyric_id?:string|null;status?:string}, lyric?: {id?:string;order_id?:string;is_approved?:boolean|null}|null): LyricApprovalState {
  if(!order.approved_lyric_id) return 'pending';
  if(lyric?.id===order.approved_lyric_id && lyric.order_id===order.id && lyric.is_approved===true) return 'approved';
  return 'inconsistent';
}
export function giftAdminStage(status:string, existing:boolean, approval:LyricApprovalState|undefined, audio:boolean) {
  if(status==='DRAFT') return 'draft';
  if(status==='AWAITING_PAYMENT') return 'pay';
  if(status==='RECEIPT_SENT') return 'receipt';
  if(status==='CANCELLED') return 'cancel';
  if(status==='ACTIVE') return 'released';
  if(existing || !approval) return 'check';
  if(approval==='inconsistent') return 'inconsistent';
  if(approval!=='approved') return 'lyrics';
  return audio?'release':'audio';
}
