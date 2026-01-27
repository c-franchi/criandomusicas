
# Corrigir Fluxo de Créditos: Gerar Letras Automaticamente Após Uso de Crédito

## Problema Identificado

Quando o usuário usa créditos (seja de pacote ou de assinatura Creator):

1. O usuário clica "Confirmar e Criar" no briefing
2. O sistema mostra o modal de créditos
3. O usuário clica "Usar 1 crédito"
4. O crédito é consumido e o pedido é marcado como PAGO
5. O usuário é redirecionado para `/criar-musica?orderId=...`
6. **BUG**: A tela fica carregando indefinidamente porque as letras nunca foram geradas!

O `handleUseCredit()` no `Briefing.tsx` não chama a edge function `generate-lyrics` (para músicas cantadas) nem `generate-style-prompt` (para instrumentais) após usar o crédito.

No fluxo normal de pagamento via Checkout, essas funções são chamadas automaticamente após o pagamento ser confirmado.

## Solução

Modificar o `handleUseCredit()` em `Briefing.tsx` para:

1. Usar o crédito (já faz isso)
2. **NOVO**: Buscar os dados do pedido do banco
3. **NOVO**: Chamar `generate-lyrics` para músicas cantadas/letra própria
4. **NOVO**: Chamar `generate-style-prompt` para músicas instrumentais
5. Redirecionar para a página de criação

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Briefing.tsx` | Modificar `handleUseCredit()` para gerar letras/prompts após usar crédito |

## Fluxo Corrigido

```text
Usuario clica "Usar 1 credito"
        |
        v
   handleUseCredit()
        |
        v
+-------------------+
| use-credit        | -> Marca pedido como PAGO
+-------------------+
        |
        v
+-------------------+
| Busca dados da    |
| order do banco    |
+-------------------+
        |
    +---+---+
    |       |
    v       v
+--------+ +---------+
| Vocal  | | Instru- |
| ?      | | mental? |
+--------+ +---------+
    |           |
    v           v
generate-    generate-
lyrics       style-prompt
    |           |
    +-----+-----+
          |
          v
   Redireciona para
   /criar-musica
```

## Secao Tecnica

### Modificacao em `handleUseCredit()` (Briefing.tsx)

A funcao atual termina assim:

```typescript
// Crédito usado com sucesso!
toast({
  title: '✨ Crédito utilizado!',
  description: `Você usou 1 crédito...`,
});

clearSavedBriefing();
navigate(`/criar-musica?orderId=${pendingOrderId}`);
```

Sera modificada para:

```typescript
// Crédito usado com sucesso!
toast({
  title: '✨ Crédito utilizado!',
  description: `Gerando sua música...`,
});

// Buscar dados do pedido para gerar conteúdo
const { data: orderData } = await supabase
  .from('orders')
  .select('*')
  .eq('id', pendingOrderId)
  .single();

if (orderData) {
  const briefing = {
    musicType: orderData.music_type || 'homenagem',
    emotion: orderData.emotion || 'alegria',
    emotionIntensity: orderData.emotion_intensity || 3,
    style: orderData.music_style || 'pop',
    rhythm: orderData.rhythm || 'moderado',
    atmosphere: orderData.atmosphere || 'festivo',
    structure: orderData.music_structure?.split(',') || ['verse', 'chorus'],
    hasMonologue: orderData.has_monologue || false,
    monologuePosition: orderData.monologue_position || 'bridge',
    mandatoryWords: orderData.mandatory_words || '',
    restrictedWords: orderData.restricted_words || '',
    voiceType: orderData.voice_type || 'feminina',
    songName: orderData.song_title || '',
    autoGenerateName: !orderData.song_title
  };

  try {
    if (orderData.is_instrumental) {
      // Instrumental: gerar style prompt diretamente
      await supabase.functions.invoke('generate-style-prompt', {
        body: {
          orderId: pendingOrderId,
          isInstrumental: true,
          briefing: {
            ...briefing,
            instruments: orderData.instruments || [],
            soloInstrument: orderData.solo_instrument || null,
            soloMoment: orderData.solo_moment || null,
            instrumentationNotes: orderData.instrumentation_notes || ''
          }
        }
      });
      toast.success('Sua música instrumental está em produção!');
      navigate('/dashboard');
    } else {
      // Vocal ou letra própria: gerar letras
      await supabase.functions.invoke('generate-lyrics', {
        body: {
          orderId: pendingOrderId,
          story: orderData.story,
          briefing
        }
      });
      clearSavedBriefing();
      navigate(`/criar-musica?orderId=${pendingOrderId}`);
    }
  } catch (genError) {
    console.error('Generation error:', genError);
    // Ainda redireciona, CreateSong vai fazer polling
    clearSavedBriefing();
    navigate(`/criar-musica?orderId=${pendingOrderId}`);
  }
}
```

### Tratamento para Letra Propria

Para pedidos com `has_custom_lyric = true`, o fluxo eh diferente:
- Nao precisa gerar letras (o usuario ja forneceu)
- Vai direto para a tela de edicao/aprovacao

O codigo acima cobre isso porque `generate-lyrics` para letra propria apenas prepara os dados, e o `CreateSong.tsx` ja tem logica para detectar `has_custom_lyric` e pular para o step de edicao.

## Resultado Esperado

1. Usuario com creditos (pacote ou Creator) clica "Confirmar e Criar"
2. Modal de creditos aparece
3. Usuario clica "Usar 1 credito"
4. **NOVO**: Sistema mostra toast "Gerando sua música..."
5. **NOVO**: Sistema chama generate-lyrics (vocal) ou generate-style-prompt (instrumental)
6. Usuario eh redirecionado:
   - Vocal/Letra propria: para `/criar-musica` onde vera as letras geradas
   - Instrumental: para `/dashboard` onde vera o pedido em producao
7. A tela nao trava mais esperando infinitamente por letras que nunca serao geradas
