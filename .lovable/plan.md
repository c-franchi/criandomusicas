

# Plano de Tradução i18n - Fase 2: Conteúdo Restante

## Resumo Executivo

O sistema i18n já está configurado com 9 namespaces e 4 idiomas (pt-BR, en, es, it). A fase inicial migrou os componentes principais da landing page. Esta fase 2 completará a tradução de todas as páginas e componentes restantes.

---

## Inventário do Estado Atual

### Já Traduzido
| Componente/Página | Namespace |
|-------------------|-----------|
| Hero.tsx | home |
| Footer.tsx | home |
| FAQ.tsx | home |
| ProcessSteps.tsx | home |
| WhyChooseUs.tsx | home |
| CTA.tsx | home/common |
| PricingPlans.tsx | pricing |
| Planos.tsx | pricing |
| Dashboard.tsx | dashboard |
| Auth.tsx | auth |
| Checkout.tsx | checkout |
| PaymentSuccess.tsx | checkout |

### Infraestrutura Pronta
- 9 namespaces criados: common, home, auth, dashboard, pricing, checkout, admin, legal, briefing
- LanguageSelector.tsx funcionando
- Funções de formatação (moeda/data) em i18n-format.ts

---

## O Que Falta Traduzir

### Fase 2A: Páginas com Conteúdo Hardcoded (Prioridade Alta)

#### 1. Briefing.tsx (~2800 linhas)
**Namespace**: briefing
**Status**: Arquivo JSON criado mas página não migrada
**Trabalho**:
- Substituir chatFlow array por chamadas t()
- Traduzir opções de instrumentos, estilos, emoções
- Traduzir mensagens de toast e modais
- ~50 strings hardcoded a substituir

#### 2. CreateSong.tsx (~1100 linhas)
**Namespace**: briefing (reutilizar)
**Trabalho**:
- Traduzir etapas de seleção de letra
- Traduzir botões de aprovação/edição
- Traduzir mensagens de toast
- ~30 strings hardcoded

#### 3. Profile.tsx (~380 linhas)
**Namespace**: dashboard
**Trabalho**:
- Tabs: Perfil, Assinatura, Créditos, Transferir
- Labels de formulário
- Mensagens de upload de avatar
- ~25 strings hardcoded

#### 4. OrderDetails.tsx (~700 linhas)
**Namespace**: dashboard
**Trabalho**:
- Status do pedido
- Botões de player
- Opções de compartilhamento
- Review form integration
- ~35 strings hardcoded

#### 5. OrderTracking.tsx (~180 linhas)
**Namespace**: dashboard
**Trabalho**:
- Timeline de progresso
- Descrições de status
- ~20 strings hardcoded

### Fase 2B: Páginas Legais (Prioridade Média)

#### 6. PrivacyPolicy.tsx (~150 linhas)
**Namespace**: legal
**Status**: JSON tem estrutura básica, página usa texto hardcoded
**Trabalho**:
- Criar conteúdo completo em legal.json para todos idiomas
- Migrar 12 seções de texto jurídico
- ~2000 palavras por idioma

#### 7. TermsOfUse.tsx (~190 linhas)
**Namespace**: legal
**Trabalho**:
- Migrar 14 seções de termos
- Incluir política de garantia e reembolso
- ~2500 palavras por idioma

#### 8. MusicRules.tsx (se existir)
**Namespace**: legal
**Trabalho**: Regras de conteúdo permitido/proibido

### Fase 2C: Páginas Utilitárias (Prioridade Média)

#### 9. NotFound.tsx (~25 linhas)
**Namespace**: common
**Trabalho**:
- Título 404
- Mensagem de erro
- Link para home
- 3 strings

#### 10. Install.tsx (~210 linhas)
**Namespace**: common (ou criar novo "app")
**Trabalho**:
- Instruções de instalação PWA
- Instruções iOS específicas
- Cards de recursos
- ~20 strings

#### 11. MusicShare.tsx (~240 linhas)
**Namespace**: common
**Trabalho**:
- Player público
- CTA para criar música
- Estados de erro
- ~10 strings

### Fase 2D: Componentes Landing Page (Prioridade Média)

#### 12. Testimonials.tsx (~300 linhas)
**Namespace**: home
**Trabalho**:
- Títulos e subtítulos
- Labels de estatísticas (500+, 5.0★, 100%, 48h)
- Tipos de música
- ~15 strings

#### 13. AudioSamples.tsx (~305 linhas)
**Namespace**: home
**Trabalho**:
- Título e subtítulo
- Badge "Exemplos Reais"
- Indicador mobile "Deslize para ver mais"
- ~10 strings

#### 14. InstrumentalShowcase.tsx (~335 linhas)
**Namespace**: home
**Trabalho**:
- Badge "100% Instrumental"
- CTA "20% de desconto"
- ~10 strings

#### 15. PlanComparison.tsx (~150 linhas)
**Namespace**: pricing
**Trabalho**:
- Comparação Pacotes vs Assinatura
- Lista de benefícios
- ~25 strings

#### 16. CreatorSection.tsx (~125 linhas)
**Namespace**: pricing
**Trabalho**:
- Seção para criadores de conteúdo
- Diferenciais
- ~30 strings

#### 17. CookieConsent.tsx (~245 linhas)
**Namespace**: legal
**Trabalho**:
- Banner LGPD
- Tipos de cookies
- Botões aceitar/recusar
- ~20 strings

### Fase 2E: Páginas Admin (Prioridade Baixa)

#### 18. AdminDashboard.tsx (~1650 linhas)
**Namespace**: admin
**Trabalho**:
- Status de pedidos
- Ações (confirmar PIX, gerar capa)
- Toasts de sucesso/erro
- ~80 strings

#### 19. AdminSettings.tsx
**Namespace**: admin
**Trabalho**:
- Configurações de vouchers
- Configurações PIX
- Gerenciamento de amostras
- ~40 strings

---

## Estrutura de Arquivos a Atualizar

```text
public/locales/
├── pt-BR/
│   ├── briefing.json    ← Adicionar chaves para CreateSong
│   ├── dashboard.json   ← Adicionar Profile, OrderDetails, OrderTracking
│   ├── home.json        ← Adicionar Testimonials, AudioSamples, Instrumental
│   ├── legal.json       ← Expandir com conteúdo completo
│   ├── pricing.json     ← Adicionar PlanComparison, CreatorSection
│   ├── common.json      ← Adicionar NotFound, Install, MusicShare
│   └── admin.json       ← Expandir com todas as strings do dashboard
├── en/
│   └── ... (mesmos arquivos)
├── es/
│   └── ... (mesmos arquivos)
└── it/
    └── ... (mesmos arquivos)
```

---

## Etapas de Implementação

### Etapa 1: Atualizar Arquivos de Tradução (Fase 2A-2D)

**1.1 Expandir briefing.json**
- Adicionar strings de CreateSong.tsx
- Adicionar labels de modais de crédito
- Adicionar mensagens de pronúncia

**1.2 Expandir dashboard.json**
- Adicionar seção "profile" com tabs e labels
- Adicionar seção "orderDetails" com player e compartilhamento
- Adicionar seção "orderTracking" com timeline

**1.3 Expandir home.json**
- Adicionar seção "testimonials" com estatísticas
- Adicionar seção "audioSamples"
- Adicionar seção "instrumental"

**1.4 Expandir legal.json**
- Adicionar conteúdo completo de PrivacyPolicy
- Adicionar conteúdo completo de TermsOfUse
- Adicionar seção "cookies" para CookieConsent

**1.5 Expandir pricing.json**
- Adicionar seção "comparison" para PlanComparison
- Adicionar seção "creator" para CreatorSection

**1.6 Expandir common.json**
- Adicionar seção "notFound"
- Adicionar seção "install"
- Adicionar seção "share"

### Etapa 2: Migrar Páginas Críticas

**2.1 Migrar Briefing.tsx**
```typescript
const { t } = useTranslation('briefing');

// Antes:
{ id: "cantada", label: "🎤 Música Cantada", description: "Com letra e vocal" }

// Depois:
{ id: "cantada", label: t('steps.isInstrumental.sung'), description: t('steps.isInstrumental.sungDesc') }
```

**2.2 Migrar CreateSong.tsx**
- Usar chaves de briefing.json para consistência
- Traduzir estados de loading e erros

**2.3 Migrar Profile.tsx**
- Traduzir labels de tabs
- Traduzir mensagens de upload

**2.4 Migrar OrderDetails.tsx e OrderTracking.tsx**
- Traduzir statusMap
- Traduzir botões de ação

### Etapa 3: Migrar Componentes Landing

**3.1 Testimonials.tsx**
**3.2 AudioSamples.tsx**
**3.3 InstrumentalShowcase.tsx**
**3.4 PlanComparison.tsx**
**3.5 CreatorSection.tsx**
**3.6 CookieConsent.tsx**

### Etapa 4: Migrar Páginas Utilitárias

**4.1 NotFound.tsx**
**4.2 Install.tsx**
**4.3 MusicShare.tsx**

### Etapa 5: Migrar Páginas Legais

**5.1 PrivacyPolicy.tsx**
**5.2 TermsOfUse.tsx**

### Etapa 6: Migrar Admin (Opcional)

**6.1 AdminDashboard.tsx**
**6.2 AdminSettings.tsx**

---

## Detalhes Técnicos

### Padrão de Migração

```typescript
// 1. Importar hook
import { useTranslation } from 'react-i18next';

// 2. Usar no componente
const { t } = useTranslation('namespace');

// 3. Para arrays dinâmicos
const items = t('section.items', { returnObjects: true }) as Array<{...}>;

// 4. Para interpolação
t('message', { count: 5, name: 'João' })
```

### Formatação de Moeda por Idioma

```typescript
import { formatCurrency } from '@/lib/i18n-format';
import { useTranslation } from 'react-i18next';

const { i18n } = useTranslation();
const price = formatCurrency(9990, i18n.language); // R$ 99,90 ou $23.00
```

### Formatação de Data por Idioma

```typescript
import { formatLocalizedDate } from '@/lib/i18n-format';

const date = formatLocalizedDate(new Date(), 'pt-BR'); // 27 de janeiro de 2026
```

---

## Contagem de Strings por Componente

| Componente | Strings Estimadas | Complexidade |
|------------|-------------------|--------------|
| Briefing.tsx | ~50 | Alta |
| CreateSong.tsx | ~30 | Média |
| Profile.tsx | ~25 | Baixa |
| OrderDetails.tsx | ~35 | Média |
| OrderTracking.tsx | ~20 | Baixa |
| PrivacyPolicy.tsx | ~40 (seções) | Média |
| TermsOfUse.tsx | ~50 (seções) | Média |
| Testimonials.tsx | ~15 | Baixa |
| AudioSamples.tsx | ~10 | Baixa |
| InstrumentalShowcase.tsx | ~10 | Baixa |
| PlanComparison.tsx | ~25 | Média |
| CreatorSection.tsx | ~30 | Média |
| CookieConsent.tsx | ~20 | Baixa |
| NotFound.tsx | ~3 | Baixa |
| Install.tsx | ~20 | Baixa |
| MusicShare.tsx | ~10 | Baixa |
| AdminDashboard.tsx | ~80 | Alta |
| AdminSettings.tsx | ~40 | Média |
| **TOTAL** | **~513 strings** | |

---

## Ordem de Execução Recomendada

1. **Atualizar JSONs de tradução** para todos os 4 idiomas
2. **Briefing.tsx** (página mais complexa, fluxo crítico)
3. **CreateSong.tsx** (complemento do briefing)
4. **Profile.tsx + OrderDetails.tsx + OrderTracking.tsx** (área logada)
5. **Testimonials + AudioSamples + InstrumentalShowcase** (landing page)
6. **PlanComparison + CreatorSection** (pricing)
7. **CookieConsent + NotFound + Install + MusicShare** (utilitários)
8. **PrivacyPolicy + TermsOfUse** (legal - conteúdo extenso)
9. **AdminDashboard + AdminSettings** (admin - baixa prioridade)

---

## Resultado Final

Após a conclusão desta fase:
- 100% das páginas públicas traduzidas
- 100% dos componentes da landing traduzidos
- Sistema de checkout completo em 4 idiomas
- Páginas legais com conteúdo localizado
- Admin Dashboard traduzido (opcional)
- Experiência consistente em pt-BR, en, es, it

