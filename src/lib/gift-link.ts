export const isGiftToken = (token: string) => /^[a-f0-9]{64}$/.test(token) || /^para-[a-z0-9-]{1,32}-[A-Za-z0-9_-]{22}$/.test(token);
/** Remove music-production annotations only in the recipient's presentation. */
export function giftLyricText(text: string) {
  return text.replace(/\r\n/g,'\n').replace(/\[[^\]\r\n]*\]/g,'').replace(/^[ \t]+$/gm,'').replace(/\n{3,}/g,'\n\n').trim();
}
