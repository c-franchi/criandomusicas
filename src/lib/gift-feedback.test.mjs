import { test } from 'node:test';
import assert from 'node:assert/strict';
import { giftFeedbackOrder } from './gift-feedback.ts';

test('new gift reviews use the production music order', () => {
  assert.equal(giftFeedbackOrder({music_source:'new', production_order_id:'music', source_order_id:'old'}), 'music');
});
test('existing music retains its original review rather than reviewing the card checkout', () => {
  assert.equal(giftFeedbackOrder({music_source:'existing', production_order_id:null, source_order_id:'original'}), 'original');
});
test('a gift without a music order cannot create feedback', () => {
  assert.equal(giftFeedbackOrder({music_source:'new', production_order_id:null, source_order_id:null}), null);
});