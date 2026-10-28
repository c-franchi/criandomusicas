import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validGiftResponse, giftResponseEmail } from '../../supabase/functions/_shared/giftResponse.ts';
test('reply requires one of the provided emojis', () => {
  assert.equal(validGiftResponse({emoji:'💜',message:'Obrigada!'}),true);
  assert.equal(validGiftResponse({emoji:'🚫',message:'Obrigada!'}),false);
});
test('personal reply text is limited to 500 characters', () => {
  assert.equal(validGiftResponse({emoji:'💜',message:'a'.repeat(500)}),true);
  assert.equal(validGiftResponse({emoji:'💜',message:'a'.repeat(501)}),false);
});
test('recipient evaluation accepts only whole stars from one to five', () => {
  for (const rating of [1,5]) assert.equal(validGiftResponse({emoji:'💜',message:'',rating}),true);
  for (const rating of [0,6,2.5]) assert.equal(validGiftResponse({emoji:'💜',message:'',rating}),false);
});
test('sender email contains emoji and personal response and uses the private owner tracking page', () => {
  const email=giftResponseEmail('Ana','💜','Obrigada!',5,'123');
  assert(email.text.includes('💜 Obrigada!'));
  assert(email.text.includes('/presentes/123#respostas'));
  assert(!email.text.includes('/presente.html'));
});