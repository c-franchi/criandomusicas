import type { GiftStatus } from './gifts';
export function giftNextStep(status:GiftStatus, existing:boolean, approved:boolean, audio:boolean) {
 if(status==='DRAFT') return 'draft';
 if(status==='CANCELLED') return 'cancel';
 if(status==='AWAITING_PAYMENT') return 'pay';
 if(status==='RECEIPT_SENT') return 'receipt';
 if(status==='ACTIVE') return 'share';
 if(!existing && !approved) return 'lyrics';
 if(!audio) return 'audio';
 return 'release';
}
