

# Plano de Internacionalização (i18n) Completo

## Resumo

Implementação de sistema de tradução completo usando **react-i18next**, com detecção automática do idioma do navegador e troca manual. O sistema garantirá que nenhuma parte fique sem tradução através de fallback automático para português.

## Idiomas Suportados

| Idioma | Código | Bandeira |
|--------|--------|----------|
| Português (Brasil) | pt-BR | 🇧🇷 |
| Inglês | en | 🇺🇸 |
| Espanhol | es | 🇪🇸 |
| Italiano | it | 🇮🇹 |

## Estrutura de Arquivos de Tradução

```text
public/
└── locales/
    ├── pt-BR/
    │   ├── common.json      (navegação, botões, textos globais)
    │   ├── home.json        (página inicial)
    │   ├── auth.json        (login/cadastro)
    │   ├── dashboard.json   (painel do usuário)
    │   ├── pricing.json     (planos e preços)
    │   ├── checkout.json    (pagamento)
    │   ├── admin.json       (painel admin)
    │   └── legal.json       (termos, privacidade)
    ├── en/
    │   └── ... (mesmos 8 arquivos)
    ├── es/
    │   └── ... (mesmos 8 arquivos)
    └── it/
        └── ... (mesmos 8 arquivos)
```

## Escopo de Tradução

### Páginas (25 arquivos)
- Index, Auth, Dashboard, Profile
- Briefing, CreateSong, Planos, Checkout
- OrderDetails, OrderTracking, OrderLyricsPage
- AdminDashboard, AdminSettings
- PrivacyPolicy, TermsOfUse, MusicRules
- VideoCheckout, VideoUpload, CreatorCheckout
- Install, NotFound, PaymentSuccess, MusicShare

### Componentes Principais (38 arquivos)
- Hero, Footer, CTA, FAQ
- ProcessSteps, WhyChooseUs, PricingPlans
- AudioSamples, InstrumentalShowcase
- Testimonials, CreatorSection, PlanComparison
- CookieConsent, SEO, UpdateBanner
- Componentes de admin

## Etapas de Implementação

### Etapa 1: Configuração Base
1. Instalar dependências: `i18next`, `react-i18next`, `i18next-http-backend`, `i18next-browser-languagedetector`
2. Criar configuração `src/lib/i18n.ts` com suporte a pt-BR, en, es, it
3. Integrar no `main.tsx`

### Etapa 2: Arquivos de Tradução Português (Base)
1. Criar `public/locales/pt-BR/common.json` - textos globais
2. Criar `public/locales/pt-BR/home.json` - página inicial
3. Criar demais arquivos de namespace (auth, dashboard, pricing, checkout, admin, legal)
4. Extrair todos os textos hardcoded do código atual

### Etapa 3: Traduções para Outros Idiomas
1. Traduzir todos os 8 arquivos para inglês (en)
2. Traduzir todos os 8 arquivos para espanhol (es)
3. Traduzir todos os 8 arquivos para italiano (it)

### Etapa 4: Componente Seletor de Idioma
1. Criar `src/components/LanguageSelector.tsx`
2. Dropdown com bandeiras: 🇧🇷 🇺🇸 🇪🇸 🇮🇹
3. Salvar preferência no localStorage
4. Adicionar no Header ao lado do ThemeToggle

### Etapa 5: Migração dos Componentes
1. Converter textos hardcoded para usar hook `useTranslation`
2. Exemplo de conversão:
   ```tsx
   // Antes
   <h1>Conte sua história</h1>
   
   // Depois
   const { t } = useTranslation('home');
   <h1>{t('hero.title')}</h1>
   ```
3. Migrar todas as 25 páginas
4. Migrar todos os 38 componentes

### Etapa 6: Conteúdo Dinâmico
1. Configurar `date-fns` com locales para cada idioma
2. Adaptar formatação de moeda por região
3. Traduzir mensagens de toast/notificação
4. Traduzir conteúdo do FAQ e depoimentos

### Etapa 7: SEO Multilíngue
1. Atualizar componente SEO.tsx para meta tags por idioma
2. Adicionar tags `hreflang` para cada idioma
3. Meta description traduzida automaticamente

## Detalhes Técnicos

### Configuração i18n

```typescript
// src/lib/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'pt-BR',
    supportedLngs: ['pt-BR', 'en', 'es', 'it'],
    defaultNS: 'common',
    ns: ['common', 'home', 'auth', 'dashboard', 'pricing', 'checkout', 'admin', 'legal'],
    interpolation: { escapeValue: false },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
```

### Componente LanguageSelector

```typescript
// Dropdown no header com opções:
// 🇧🇷 Português
// 🇺🇸 English  
// 🇪🇸 Español
// 🇮🇹 Italiano
```

### Tipagem TypeScript para Autocompletar

```typescript
// src/types/i18n.d.ts
import 'i18next';
import common from '../../public/locales/pt-BR/common.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      // ... outros namespaces
    };
  }
}
```

## Garantias Contra Textos Não Traduzidos

| Mecanismo | Descrição |
|-----------|-----------|
| Fallback automático | Se tradução não existir, mostra em português |
| Tipagem TypeScript | Chaves tipadas garantem que existam em todos idiomas |
| Namespaces organizados | Facilita encontrar e manter traduções |
| Script de validação | Pode verificar chaves faltantes antes do deploy |

## Estimativa de Trabalho

| Etapa | Complexidade |
|-------|--------------|
| Configuração i18n | Baixa |
| Arquivos PT-BR (8) | Média |
| Arquivos EN (8) | Alta |
| Arquivos ES (8) | Alta |
| Arquivos IT (8) | Alta |
| Migração componentes | Média |
| LanguageSelector | Baixa |
| SEO multilíngue | Média |

## Resultado Final

- Seletor de idioma com 4 opções (🇧🇷 🇺🇸 🇪🇸 🇮🇹) no header
- Detecção automática do idioma do navegador
- Preferência salva no localStorage
- Todas as páginas e componentes traduzidos
- Fallback garantido para português
- Fácil adicionar novos idiomas no futuro

