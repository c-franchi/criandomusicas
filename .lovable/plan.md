
# Plano de Correção: Sistema de Créditos Incompatíveis

## Problema Identificado

O usuário possui **4 créditos instrumentais** mas tentou criar uma música de **Letra Própria** (que requer créditos vocais). O sistema funcionou tecnicamente correto (não permitiu usar créditos incompatíveis), porém a comunicação visual foi confusa:

- O banner mostra "4 músicas disponíveis" sem indicar que são **instrumentais**
- O usuário não entendeu por que teve que pagar tendo créditos disponíveis
- Não há nenhum aviso explicando a incompatibilidade

---

## Alterações Necessárias

### 1. Atualizar CreditsBanner para mostrar tipo de crédito

**Arquivo:** `src/components/CreditsBanner.tsx`

**Mudanças:**
- Mostrar separadamente créditos vocais e instrumentais quando ambos existem
- Adicionar ícones distintos (🎤 vocal, 🎹 instrumental)
- Exibir badges coloridos por tipo

**De:**
```tsx
<p className="font-medium text-foreground">
  {totalAvailable} música{totalAvailable !== 1 ? 's' : ''} disponível{totalAvailable !== 1 ? 'is' : ''}
</p>
```

**Para:**
```tsx
<div className="font-medium text-foreground">
  {totalVocal > 0 && (
    <span className="mr-2">🎤 {totalVocal} vocal{totalVocal !== 1 ? 'is' : ''}</span>
  )}
  {totalInstrumental > 0 && (
    <span>🎹 {totalInstrumental} instrumental{totalInstrumental !== 1 ? 'is' : ''}</span>
  )}
</div>
```

---

### 2. Adicionar aviso no Checkout para créditos incompatíveis

**Arquivo:** `src/pages/Checkout.tsx`

**Mudanças:**
- Quando o usuário tem créditos mas são de tipo incompatível, exibir um card de aviso explicando
- Mostrar qual tipo de crédito ele tem vs qual precisa

**Adicionar novo componente de aviso:**
```tsx
{/* Incompatible Credits Warning */}
{!showPixSection && hasCredits && !isCreditsCompatible() && (
  <Card className="border-amber-500/50 bg-amber-500/10">
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
        <div>
          <p className="font-medium text-amber-600">Créditos não compatíveis</p>
          <p className="text-sm text-muted-foreground">
            Você tem {totalAvailable} crédito{totalAvailable !== 1 ? 's' : ''} 
            {activePackage?.plan_id.includes('instrumental') ? ' instrumental' : ' vocal'}
            {totalAvailable !== 1 ? 'is' : ''}, 
            mas este pedido requer crédito 
            {order?.is_instrumental ? ' instrumental' : ' vocal'}.
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

---

### 3. Atualizar Briefing para avisar sobre incompatibilidade

**Arquivo:** `src/pages/Briefing.tsx`

**Mudanças:**
- Na tela de seleção de plano, indicar quais opções são compatíveis com os créditos existentes
- Adicionar badge "✓ Você tem créditos" nas opções compatíveis
- Adicionar aviso "Requer pagamento" nas opções incompatíveis

**Exemplo na seleção de plano:**
```tsx
<Button
  variant="outline"
  className={`h-auto py-4 px-4 justify-start text-left ${
    hasVocalCredits ? 'border-green-500/50 hover:border-green-500' : ''
  }`}
  onClick={() => handlePlanSelection('single')}
>
  <div className="flex items-center gap-3 w-full">
    <span className="text-2xl">🎤</span>
    <div className="flex-1">
      <p className="font-semibold">Música Cantada</p>
      <p className="text-sm text-muted-foreground">Com letra e vocal profissional</p>
    </div>
    {hasVocalCredits ? (
      <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
        ✓ Usar crédito
      </Badge>
    ) : (
      <Badge variant="secondary">1 música</Badge>
    )}
  </div>
</Button>
```

---

### 4. Atualizar hook useCredits para expor totais por tipo

**Arquivo:** `src/hooks/useCredits.tsx`

O hook já retorna `totalVocal` e `totalInstrumental`, só precisa garantir que os componentes usem esses valores.

---

### 5. Atualizar modal de confirmação de uso de crédito no Briefing

**Arquivo:** `src/pages/Briefing.tsx`

**Mudanças no modal de créditos (linhas ~2172-2198):**
- Mostrar claramente o tipo de crédito que será usado
- Adicionar ícone e cor correspondente ao tipo

---

## Resumo de Arquivos a Modificar

| Arquivo | Tipo de Mudança |
|---------|----------------|
| `src/components/CreditsBanner.tsx` | Mostrar tipos separados (vocal/instrumental) |
| `src/pages/Checkout.tsx` | Adicionar aviso de créditos incompatíveis |
| `src/pages/Briefing.tsx` | Indicar compatibilidade na seleção de plano |

---

## Resultado Esperado

Após a correção:
1. O usuário verá "🎹 4 instrumentais" em vez de "4 músicas disponíveis"
2. Ao escolher "Letra Própria", verá aviso de que precisa de crédito vocal
3. No Checkout, verá explicação clara de por que não pode usar seus créditos
4. Menos confusão e melhor experiência do usuário
