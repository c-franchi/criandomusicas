export const giftResponseEmojis = ['💜', '😍', '🥹', '😂', '👏', '🎉'] as const;
export const giftResponseMessageLimit = 500;
export function validGiftResponse(input: { emoji: string; message: string; rating?: number | null }) {
  return giftResponseEmojis.some(e => e === input.emoji) && input.message.length <= giftResponseMessageLimit &&
    (input.rating == null || (Number.isInteger(input.rating) && input.rating >= 1 && input.rating <= 5));
}
export function giftResponseEmail(recipient: string, emoji: string, message: string, rating: number | null, giftId: string) {
  return { subject: '💌 Seu presente recebeu uma resposta!', text: `${recipient} respondeu ao seu presente musical.\n\n${emoji} ${message}${rating ? `\nAvaliação: ${rating}/5` : ''}\n\nVer resposta: https://criandomusicas.com.br/presentes/${giftId}#respostas\n\nCriando Músicas` };
}