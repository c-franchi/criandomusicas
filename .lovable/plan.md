
## Plano: Corrigir falhas de traducao em todo o site

### Problema Identificado

Quando o usuario muda o idioma (ex: italiano), varios textos permanecem em portugues porque estao escritos diretamente no codigo (hardcoded) em vez de usar o sistema de traducao (i18next).

### Falhas Encontradas

#### 1. MobileMenu.tsx (menu lateral mobile) - PRIORIDADE ALTA
O arquivo com mais problemas. Textos hardcoded:
- **Linha 146**: `'creditos' / 'credito'` - deveria usar `tCommon('credits.credits')` / `tCommon('credits.credit')`
- **Linha 172**: `"Criar Rapido"` - deveria usar chave de traducao
- **Linha 183**: `"Navegar"` - deveria usar chave de traducao
- **Linha 204**: `"Menu"` - deveria usar chave de traducao
- **Linha 258**: `"Legal"` - deveria usar chave de traducao
- **Linha 267**: `"Termos de Uso"` - deveria usar chave de traducao
- **Linha 274**: `"Politica de Privacidade"` - deveria usar chave de traducao

#### 2. CreditsBanner.tsx - creditos hardcoded
- **Linha 58**: `'1 preview gratis'` e `'credito' / 'creditos'`
- **Linha 83**: `'1 preview gratis'`
- **Linha 90**: `'credito' / 'creditos'`
- **Linha 97**: `"Criar"` (botao)

#### 3. CreditsManagement.tsx - painel de creditos inteiro em portugues
- **Linha 43**: `"Meus Creditos de Musica"`
- **Linha 45**: `"Gerencie seus pacotes e creditos disponiveis"`
- **Linha 53**: `"Creditos disponiveis"`
- **Linha 55**: `'Preview Gratis'`, `'Ativo'`, `'Sem creditos'`
- **Linha 87**: `'Ativo'`
- **Linha 164**: `'Ativo'` / `'Inativo'`
- **Linha 198**: `"Ver Pacotes Disponiveis"`
- **Linha 209**: `'Comprar Mais Creditos'` / `'Comprar Pacote de Musicas'`

#### 4. VideoServiceSection.tsx - aviso em portugues
- **Linha 122**: `"Em breve: use seus creditos para criar videos!"`
- **Linha 126**: `"Estamos implementando o sistema de creditos para videos."`

#### 5. Auth.tsx - termos legais hardcoded
- **Linha 646-653**: `"Ao continuar, voce concorda com os Termos de Uso e a Politica de Privacidade"` - tudo em portugues

#### 6. Order.tsx / VideoCheckout.tsx - navegacao
- **Linha 219**: `"Meus Pedidos"` (Order.tsx)
- **Linha 340**: `"Ir para Meus Pedidos"` (VideoCheckout.tsx)

#### 7. SEO.tsx - meta description padrao em portugues
- **Linha 20**: Description padrao hardcoded em portugues

#### 8. AdminSettings.tsx / PricingManager.tsx - painel admin
- Varios `'Ativo'` / `'Inativo'` hardcoded (menor prioridade pois e area admin)

### Solucao

#### Etapa 1: Adicionar chaves de traducao faltantes nos 4 idiomas

Adicionar novas chaves nos arquivos `common.json` de cada idioma:

```text
"mobileMenu": {
  "navigate": "Navegar / Navigate / Navegar / Navigare",
  "menu": "Menu",
  "quickCreate": "Criar Rapido / Quick Create / Crear Rapido / Crea Veloce",
  "legal": "Legal / Legal / Legal / Legale",
  "termsOfUse": "Termos de Uso / Terms of Use / Terminos de Uso / Termini di Utilizzo",
  "privacyPolicy": "Politica de Privacidade / Privacy Policy / Politica de Privacidad / Informativa sulla Privacy"
}

"credits": {
  (adicionar chaves faltantes)
  "previewFree": "1 preview gratis / 1 free preview / 1 preview gratis / 1 anteprima gratuita",
  "active": "Ativo / Active / Activo / Attivo",
  "inactive": "Inativo / Inactive / Inactivo / Inattivo",
  "noCredits": (ja existe, reutilizar),
  "myCredits": "Meus Creditos / My Credits / Mis Creditos / I Miei Crediti",
  "manageCredits": "Gerencie seus creditos / Manage your credits / ...",
  "availableCredits": "Creditos disponiveis / Available credits / ...",
  "buyMore": "Comprar Mais / Buy More / ...",
  "buyPackage": (ja existe, reutilizar),
  "viewAvailable": "Ver Pacotes / View Packages / ..."
}

"legal": {
  "agreementText": "Ao continuar... / By continuing... / Al continuar... / Continuando...",
  "termsOfUse": "Termos de Uso / ...",
  "privacyPolicy": "Politica de Privacidade / ..."
}

"video": {
  "comingSoon": "Em breve: creditos para videos / Coming soon: credits for videos / ...",
  "implementing": "Estamos implementando... / We are implementing... / ..."
}
```

#### Etapa 2: Substituir textos hardcoded nos componentes

Substituir cada string portuguesa por chamadas `t()` com a chave correspondente, mantendo o fallback em portugues como defaultValue.

**Arquivos a modificar:**
1. `src/components/MobileMenu.tsx` - 7 substituicoes
2. `src/components/CreditsBanner.tsx` - 5 substituicoes
3. `src/components/CreditsManagement.tsx` - ~10 substituicoes
4. `src/components/VideoServiceSection.tsx` - 2 substituicoes
5. `src/pages/Auth.tsx` - 1 bloco (termos legais)
6. `src/pages/Order.tsx` - 1 substituicao
7. `src/pages/VideoCheckout.tsx` - 1 substituicao

**Arquivos de traducao a modificar:**
1. `public/locales/pt-BR/common.json` - adicionar novas chaves
2. `public/locales/en/common.json` - adicionar novas chaves
3. `public/locales/es/common.json` - adicionar novas chaves
4. `public/locales/it/common.json` - adicionar novas chaves

### Escopo

- Foco nos componentes voltados ao usuario (nao admin)
- Admin (`AdminSettings`, `PricingManager`) ficara para uma fase futura se necessario, pois so admins acessam
- SEO description sera mantido em portugues como fallback (Google indexa por pagina/idioma)
