/** Production margin; the purchased option remains 15s/30s, not an exact runtime. */
export const giftAudioLimit = (seconds: number) => seconds <= 15 ? 20 : 40;
