/** Applied after every prompt mode, including short songs and revisions. */
export function lyricVoiceRules(context: {
  senderName?: string | null;
  recipientName?: string | null;
  perspective?: string | null;
} = {}): string {
  return `VOZ DE QUEM ENVIA — REGRA DE NARRAÇÃO:
- Em recados, declarações, presentes e homenagens pessoais, a voz padrão é a PRIMEIRA PESSOA de quem envia, falando diretamente com quem recebe. O cantor interpreta o remetente; não é um narrador externo.
- Identifique no briefing quem envia, quem recebe e a relação entre eles. "Eu" é o remetente; "você/tu" é o destinatário. Não inverta essas pessoas.
- Mesmo quando o briefing descreve "Claudinei quer dizer que ama Maria" ou "Claudinei te ama", transforme a intenção em "eu te amo", "quero te dizer", "sou grato por ter você". Nunca transforme o recado em uma apresentação do remetente na terceira pessoa.
- Para remetentes coletivos, use "nós te amamos" quando o contexto indicar família, amigos ou equipe. Não invente um remetente individual.
- Os nomes do formulário identificam as pessoas; não são uma obrigação de citar o nome do remetente na letra. Pode chamar o destinatário pelo nome, sem perder a voz em primeira pessoa.
- Respeite uma escolha EXPLÍCITA de narrador, terceira pessoa, perspectiva religiosa/motivacional, personagem ou outro ponto de vista. Uma história escrita na terceira pessoa para explicar os fatos, por si só, NÃO é uma escolha de narrador.
- Em músicas comerciais, infantis ou histórias sem recado pessoal, mantenha o ponto de vista apropriado ao pedido, sem forçar uma declaração pessoal. Preserve trechos marcados para reprodução literal e não reescreva letras fornecidas como texto exato.
- Mantenha a mesma voz nas duas opções e nas revisões, no idioma solicitado. Antes de responder, confira se a pessoa que fala e a pessoa a quem ela se dirige continuam corretas.
${context.perspective ? `Perspectiva explicitamente selecionada no formulário: ${JSON.stringify(context.perspective)}.` : ''}
${context.senderName ? `Remetente (voz da mensagem): ${JSON.stringify(context.senderName)}.` : ''}
${context.recipientName ? `Destinatário (quem ouve a mensagem): ${JSON.stringify(context.recipientName)}.` : ''}`;
}
