
# Correção: Sistema de Créditos Creator não Gera Letras

## Problema Identificado

O usuário com assinatura Creator (ex: Creator Start com 50 créditos) consegue usar créditos, mas **a música fica presa em "Aguardando Pagamento"** e as letras nunca são geradas.

### Causa Raiz

Existem **DOIS fluxos** para usar créditos que funcionam de forma diferente:

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     FLUXO VIA BRIEFING (FUNCIONA)                   │
├─────────────────────────────────────────────────────────────────────┤
│  1. Completa briefing                                               │
│  2. Modal de créditos aparece                                       │
│  3. Usuário clica "Usar crédito"                                    │
│  4. ✅ Chama use-credit (marca como PAID)                           │
│  5. ✅ Chama generate-lyrics (gera as letras)                       │
│  6. ✅ Redireciona para /criar-musica                               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                   FLUXO VIA CHECKOUT (QUEBRADO)                     │
├─────────────────────────────────────────────────────────────────────┤
│  1. Usuário chega no checkout (modal não apareceu ou fechou)        │
│  2. Vê que tem créditos disponíveis                                 │
│  3. Clica "Usar crédito"                                            │
│  4. ✅ Chama use-credit (marca como PAID)                           │
│  5. ❌ NÃO chama generate-lyrics (letras NUNCA geradas)             │
│  6. Redireciona para /criar-musica                                  │
│  7. Página fica esperando letras eternamente                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Evidência nos Logs

Os logs mostram que `check-credits` está funcionando e detectando os créditos Creator:
```
[CHECK-CREDITS] Creator subscription credits calculated - {"planId":"creator_start","creditsTotal":50,"creditsUsed":0}
[CHECK-CREDITS] Credits calculated - {"totalAvailable":50,"totalVocal":50}
```

Porém, **NÃO há logs de `use-credit`** - confirmando que ou a função não está sendo chamada, ou está falhando antes de logar.

---

## Solução

### 1. Corrigir handleUseCredit no Checkout.tsx

Adicionar a lógica de geração automática de letras igual ao Briefing:

**Arquivo:** `src/pages/Checkout.tsx`
**Linhas:** 641-682

```typescript
const handleUseCredit = async () => {
  if (!order) return;

  setProcessingCredit(true);

  try {
    const { data, error } = await supabase.functions.invoke('use-credit', {
      body: { orderId: order.id },
    });

    if (error) throw error;

    if (!data.success) {
      if (data.wrong_type) {
        toast.error(data.error);
      } else if (data.needs_purchase) {
        toast.error(t('errors.incompatibleCredits'));
      } else {
        toast.error(data.error || t('errors.creditUse'));
      }
      setProcessingCredit(false);
      return;
    }

    toast.success(t('toast.creditUsed'));

    // NOVO: Buscar dados completos do pedido para geração
    const { data: orderData } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order.id)
      .single();

    const isInstrumental = order.is_instrumental === true;
    const hasCustomLyric = order.has_custom_lyric === true;

    // NOVO: Gerar conteúdo baseado no tipo de pedido
    if (orderData) {
      const briefing = {
        musicType: orderData.music_type || 'homenagem',
        emotion: orderData.emotion || 'alegria',
        emotionIntensity: orderData.emotion_intensity || 3,
        style: orderData.music_style || 'pop',
        rhythm: orderData.rhythm || 'moderado',
        atmosphere: orderData.atmosphere || 'festivo',
        hasMonologue: orderData.has_monologue || false,
        monologuePosition: orderData.monologue_position || 'bridge',
        mandatoryWords: orderData.mandatory_words || '',
        restrictedWords: orderData.restricted_words || '',
        voiceType: orderData.voice_type || 'feminina',
        instruments: orderData.instruments || [],
        soloInstrument: orderData.solo_instrument || null,
        soloMoment: orderData.solo_moment || null,
        instrumentationNotes: orderData.instrumentation_notes || ''
      };

      try {
        if (isInstrumental) {
          // Instrumental: gerar style prompt diretamente
          toast.info(t('toast.preparingInstrumental'));
          await supabase.functions.invoke('generate-style-prompt', {
            body: { orderId: order.id, isInstrumental: true, briefing }
          });
          navigate('/dashboard');
          return;
        } else if (hasCustomLyric) {
          // Letra própria: já tem texto, vai para aprovação
          navigate(`/criar-musica?orderId=${order.id}`);
          return;
        } else {
          // Vocal: GERAR LETRAS VIA IA
          toast.info(t('toast.generatingLyrics'));
          await supabase.functions.invoke('generate-lyrics', {
            body: { orderId: order.id, story: orderData.story, briefing }
          });
        }
      } catch (genError) {
        console.error('Generation error:', genError);
        // Continua para redirect mesmo se falhar
      }
    }

    // Redirect
    if (isInstrumental) {
      navigate('/dashboard');
    } else {
      navigate(`/criar-musica?orderId=${order.id}`);
    }
  } catch (error) {
    console.error('Error using credit:', error);
    toast.error(t('errors.creditUse'));
    setProcessingCredit(false);
  }
};
```

### 2. Melhorar Verificação de Compatibilidade de Créditos

A função `isCreditsCompatible()` pode falhar se `activePackage` for nulo (mesmo com créditos de assinatura). Ajustar para usar `totalVocal` e `totalInstrumental` também:

**Arquivo:** `src/pages/Checkout.tsx`
**Linhas:** 692-701

```typescript
const isCreditsCompatible = (): boolean => {
  if (!order) return false;
  const orderType = getOrderType();
  
  // Verificar por tipo de crédito disponível (não apenas activePackage)
  if (orderType === 'instrumental') {
    return totalInstrumental > 0;
  }
  // Vocal e custom_lyric usam créditos vocais
  return totalVocal > 0;
};
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Checkout.tsx` | Corrigir `handleUseCredit` para gerar letras e melhorar `isCreditsCompatible` |

---

## Resultado Esperado

Após a correção:
1. Usuário Creator completa briefing
2. Se modal aparecer no Briefing → funciona como antes
3. Se for para Checkout e usar crédito lá → **agora também gera letras**
4. Ordem é marcada como PAID + letras geradas
5. Usuário é redirecionado e vê suas letras normalmente
