
# Plano: Sistema de Preview (Credito Teste para Novos Usuarios)

## Visao Geral

Implementar um sistema completo de preview que permite novos usuarios testarem a plataforma com uma musica de ate 40 segundos, gerando expectativa e aumentando conversao para compra de creditos.

## Arquitetura do Sistema

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DO USUARIO NOVO                        │
├─────────────────────────────────────────────────────────────────┤
│  1. Cadastro → Gatilho cria credito preview automaticamente     │
│  2. Briefing → Aviso claro de preview (40s max)                 │
│  3. Geracao → Prompt especial com estrutura curta               │
│  4. Player → Marcacao visual "Preview de Teste"                 │
│  5. Pos-escuta → CTA forte para comprar creditos                │
└─────────────────────────────────────────────────────────────────┘
```

## Componentes a Implementar

### 1. Banco de Dados

**Tabela `user_credits` - Novo tipo de plano:**
| Campo | Valor |
|-------|-------|
| plan_id | `preview_test` |
| total_credits | 1 |
| is_active | true |

**Tabela `orders` - Novo campo:**
| Campo | Tipo | Descricao |
|-------|------|-----------|
| is_preview | boolean | Marca pedido como preview |

### 2. Edge Functions

**Criar: `grant-preview-credit/index.ts`**
- Executada via trigger no signup
- Verifica se usuario ja tem credito preview
- Cria registro em user_credits com plan_id='preview_test'

**Modificar: `check-credits/index.ts`**
- Identificar creditos preview separadamente
- Retornar campo `has_preview_credit` e `preview_credit_used`

**Modificar: `use-credit/index.ts`**
- Quando usar credito preview, marcar order como `is_preview=true`
- Priorizar creditos normais sobre preview (para nao "gastar" preview se tiver creditos pagos)

**Modificar: `generate-lyrics/index.ts`**
- Detectar se ordem e preview via `is_preview`
- Usar prompt especial com estrutura curta:
  - Apenas [Intro] + [Chorus]
  - Maximo 4 linhas no Chorus
  - Sem Verse 2, Bridge ou Outro

### 3. Frontend - Componentes

**Modificar: `src/pages/Briefing.tsx`**
- Detectar se usuario esta usando credito preview
- Mostrar aviso destacado antes de gerar:
  ```
  ⚠️ Atencao: Este e um PREVIEW DE TESTE (ate 40s)
  Para gerar a musica completa, adquira creditos.
  ```
- Botao "Gerar Preview" ao inves de "Criar Musica"

**Modificar: `src/components/briefing/QuickCreation.tsx`**
- Mostrar badge de preview se usando credito teste
- Texto explicativo sobre limitacoes

**Criar: `src/components/PreviewBanner.tsx`**
- Banner de aviso reutilizavel para preview
- Cores diferenciadas (amarelo/laranja)
- Icone de alerta

**Modificar: `src/pages/Dashboard.tsx`**
- Indicador visual para musicas preview
- Badge "Preview (40s)" nas cards de preview
- Bloquear download para preview

**Modificar: `src/pages/MusicShare.tsx`**
- Adicionar indicador se musica e preview
- Ajustar CTA conforme contexto (preview vs normal)

### 4. Fluxo de Pos-Escuta

**Criar: `src/components/PreviewCompletedModal.tsx`**
Modal exibido apos terminar de ouvir preview:

```text
┌────────────────────────────────────────┐
│  🎵 Gostou do que ouviu?              │
│                                        │
│  Essa foi apenas uma previa curta.    │
│                                        │
│  A versao completa inclui:            │
│  ✓ Letra completa                     │
│  ✓ Mais versos e refrao               │
│  ✓ Estrutura profissional             │
│  ✓ Qualidade final                    │
│                                        │
│  [🎵 Criar Musica Completa]          │
│  [💳 Comprar Creditos]                │
└────────────────────────────────────────┘
```

### 5. Hook para Gerenciamento

**Criar: `src/hooks/usePreviewCredit.tsx`**
```typescript
interface PreviewCreditState {
  hasPreviewCredit: boolean;
  previewCreditUsed: boolean;
  isUsingPreview: boolean;
}
```

## Detalhes Tecnicos

### Prompt Especial para Preview (Suno)

```text
[Style]
Genre: {{GENERO_ESCOLHIDO}},
Mood: {{HUMOR_ESCOLHIDO}},
BPM: moderado

[Lyrics]
[Intro]
[Instrumental curta, atmosferica]

[Chorus]
{{4 LINHAS MAXIMO}}

[End]
```

**Regras do Sistema para Preview:**
- Maximo 4 linhas no Chorus
- Sem Verse 2, Bridge, Outro
- Duracao esperada: 20-40 segundos
- Sem download
- Sem uso comercial

### Credito Preview vs Credito Normal

| Aspecto | Preview | Normal |
|---------|---------|--------|
| Duracao | 40s max | 2-3 min |
| Estrutura | Intro + Chorus | Completa |
| Download | Bloqueado | Permitido |
| Uso comercial | Nao | Sim |
| Quantidade | 1x por conta | Ilimitado |

### Trigger de Signup

```sql
CREATE OR REPLACE FUNCTION grant_preview_credit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_credits (user_id, plan_id, total_credits, is_active)
  VALUES (NEW.id, 'preview_test', 1, true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION grant_preview_credit();
```

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/grant-preview-credit/index.ts` | Criar |
| `supabase/functions/check-credits/index.ts` | Modificar |
| `supabase/functions/use-credit/index.ts` | Modificar |
| `supabase/functions/generate-lyrics/index.ts` | Modificar |
| `src/hooks/usePreviewCredit.tsx` | Criar |
| `src/hooks/useCredits.tsx` | Modificar |
| `src/components/PreviewBanner.tsx` | Criar |
| `src/components/PreviewCompletedModal.tsx` | Criar |
| `src/pages/Briefing.tsx` | Modificar |
| `src/pages/Dashboard.tsx` | Modificar |
| `src/pages/MusicShare.tsx` | Modificar |
| `src/components/briefing/QuickCreation.tsx` | Modificar |
| Migracao SQL | Adicionar coluna is_preview em orders |

## Migracoes SQL Necessarias

```sql
-- 1. Adicionar coluna is_preview na tabela orders
ALTER TABLE orders ADD COLUMN is_preview BOOLEAN DEFAULT FALSE;

-- 2. Criar funcao para conceder credito preview
CREATE OR REPLACE FUNCTION public.grant_preview_credit()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar se usuario ja tem credito preview
  IF NOT EXISTS (
    SELECT 1 FROM user_credits 
    WHERE user_id = NEW.id AND plan_id = 'preview_test'
  ) THEN
    INSERT INTO user_credits (user_id, plan_id, total_credits, is_active)
    VALUES (NEW.id, 'preview_test', 1, true);
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Criar trigger para novos usuarios
DROP TRIGGER IF EXISTS on_auth_user_created_grant_preview ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_preview
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_preview_credit();
```

## Textos e i18n

**Novos textos para adicionar em `public/locales/pt-BR/briefing.json`:**

```json
{
  "preview": {
    "warning": "⚠️ Atencao: Este e um PREVIEW DE TESTE com duracao maxima de 40 segundos, criado apenas para demonstrar o estilo e a atmosfera da musica.",
    "fullVersionNote": "Para gerar a musica completa, sera necessario adquirir creditos.",
    "generateButton": "Gerar Preview",
    "playingLabel": "Preview em reproducao",
    "playingDescription": "Voce esta ouvindo uma versao de teste para conhecer o estilo da musica.",
    "completedTitle": "Gostou do que ouviu?",
    "completedDescription": "Essa foi apenas uma previa curta.",
    "fullVersionFeatures": "A versao completa pode ter:",
    "featureFullLyrics": "Letra completa",
    "featureMoreVerses": "Mais versos e refrao",
    "featureProStructure": "Estrutura profissional",
    "featureFinalQuality": "Qualidade final para uso real",
    "createFullButton": "Criar musica completa",
    "buyCreditsButton": "Comprar creditos",
    "usedNotice": "Seu credito de preview foi utilizado. Para continuar criando musicas, adquira creditos.",
    "badge": "Preview (ate 40s)",
    "freePreviewBadge": "🎁 Preview gratis"
  }
}
```

## Estrategia de Conversao

1. **Expectativa**: Usuario ouve algo real e cria conexao emocional
2. **Clareza**: Limitacoes explicadas desde o inicio (sem frustracao)
3. **CTA Forte**: Botao destacado para comprar apos ouvir
4. **Urgencia suave**: "Versao completa" como upgrade natural

## Testes Necessarios

1. Cadastrar novo usuario e verificar credito preview criado
2. Gerar preview e confirmar duracao <= 40s
3. Verificar que download esta bloqueado para preview
4. Testar modal pos-escuta e fluxo para checkout
5. Verificar que usuarios existentes NAO recebem preview retroativo
6. Testar pagina de compartilhamento com musica preview
7. Verificar priorizacao de creditos (normais antes de preview)
