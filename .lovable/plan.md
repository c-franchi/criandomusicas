
# Tour Guiado para Novos Usuários

## Objetivo

Criar um tour interativo que guie usuários novos pela plataforma no primeiro acesso, destacando os principais recursos e funcionalidades.

## Biblioteca Recomendada

**driver.js** - Escolhida por ser:
- Leve (~5KB gzipped)
- Sem dependências React específicas
- Efeito de spotlight elegante
- Fácil customização com CSS
- Suporte a temas dark/light

## Fluxo do Tour

```text
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DO TOUR                            │
├─────────────────────────────────────────────────────────────┤
│  1. Usuário faz login pela primeira vez                     │
│  2. Sistema detecta `tour_completed = false` no perfil      │
│  3. Tour inicia automaticamente após 1s                     │
│  4. Passos guiados com spotlight nos elementos              │
│  5. Ao finalizar, marca `tour_completed = true`             │
│  6. Botão "Ver Tour" no menu para repetir                   │
└─────────────────────────────────────────────────────────────┘
```

## Passos do Tour (Sugestão)

| Passo | Elemento | Título | Descrição |
|-------|----------|--------|-----------|
| 1 | Logo/Header | Bem-vindo! | Apresentação da plataforma |
| 2 | Botão "Criar Música" | Comece Aqui | Como iniciar uma nova música |
| 3 | Seção Exemplos | Ouça Exemplos | Amostras de músicas criadas |
| 4 | Planos | Escolha seu Plano | Explicação dos planos disponíveis |
| 5 | Dashboard (se logado) | Seus Pedidos | Onde acompanhar suas músicas |
| 6 | Perfil | Seu Perfil | Configurações e créditos |

## Implementação Técnica

### 1. Instalar Dependência
```bash
npm install driver.js
```

### 2. Criar Hook `useTour.tsx`
```typescript
// src/hooks/useTour.tsx
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const useTour = () => {
  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      steps: [
        { element: '#hero-cta', popover: { title: 'Crie sua Música', description: '...' }},
        { element: '#exemplos', popover: { title: 'Ouça Exemplos', description: '...' }},
        // ... mais passos
      ]
    });
    driverObj.drive();
  };
  
  return { startTour };
};
```

### 3. Criar Wrapper `TourWrapper.tsx`
- Verifica se é primeiro acesso via campo `tour_completed` no perfil
- Inicia tour automaticamente
- Salva status ao completar

### 4. Adicionar IDs nos Elementos
- Adicionar `id="tour-*"` nos elementos que serão destacados
- Hero CTA, seção exemplos, planos, header, etc.

### 5. Customizar Estilos
- Adaptar cores do popover ao tema da aplicação
- Suporte a dark mode

### 6. Migração do Banco
```sql
ALTER TABLE profiles 
ADD COLUMN tour_completed BOOLEAN DEFAULT false;
```

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/hooks/useTour.tsx` | Criar - hook principal do tour |
| `src/components/TourWrapper.tsx` | Criar - wrapper de controle |
| `src/components/Hero.tsx` | Modificar - adicionar IDs |
| `src/components/AppHeader.tsx` | Modificar - botão "Ver Tour" |
| `src/pages/Index.tsx` | Modificar - adicionar IDs nas seções |
| `src/index.css` | Modificar - estilos do driver.js |
| `package.json` | Modificar - adicionar driver.js |

## Recursos Adicionais

- **Botão "Repetir Tour"**: No menu do usuário para revisar
- **Traduções i18n**: Todos os textos do tour traduzidos
- **Mobile-friendly**: Tour adaptado para telas menores
- **Skip button**: Opção de pular o tour a qualquer momento

## Resultado Visual Esperado

O tour aparecerá como uma sobreposição escura com um spotlight no elemento atual, com um popover explicativo ao lado contendo:
- Título do passo
- Descrição
- Botões "Anterior", "Próximo", "Pular"
- Indicador de progresso
