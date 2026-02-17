
## Plano: Opcao de capa personalizada na tela de musica recebida

### O que sera feito

Quando o usuario receber a musica (status MUSIC_READY ou COMPLETED), ele vera a capa atual (gerada por IA) com duas opcoes:
1. **Manter a capa atual** (gerada por IA)
2. **Fazer upload de uma imagem propria** para usar como capa

### Mudancas tecnicas

#### 1. OrderDetails.tsx - Adicionar UI de troca de capa

Na secao do player de musica (apos a imagem da capa, linha ~510-526), adicionar:
- Um botao de camera/editar sobre a imagem da capa
- Ao clicar, abre um menu com duas opcoes:
  - "Manter capa atual" (fecha o menu)
  - "Enviar minha imagem" (abre seletor de arquivo)
- Ao selecionar arquivo:
  - Faz upload para o bucket `covers` (ja existe e e publico)
  - Atualiza `orders.cover_url` com a nova URL publica
  - Atualiza a UI otimisticamente
- Input de arquivo aceita apenas imagens (jpg, png, webp) com limite de 5MB
- Mostra loading durante o upload

#### 2. Traducoes - Adicionar chaves nos 4 idiomas

Adicionar em `public/locales/{pt-BR,en,es,it}/dashboard.json`:

```text
orderDetails.cover.change = "Alterar capa / Change cover / Cambiar portada / Cambia copertina"
orderDetails.cover.upload = "Enviar minha imagem / Upload my image / Subir mi imagen / Carica la mia immagine"  
orderDetails.cover.keep = "Manter capa atual / Keep current cover / Mantener portada actual / Mantieni copertina attuale"
orderDetails.cover.uploading = "Enviando... / Uploading... / Subiendo... / Caricamento..."
orderDetails.cover.success = "Capa atualizada! / Cover updated! / Portada actualizada! / Copertina aggiornata!"
orderDetails.cover.error = "Erro ao atualizar capa / Error updating cover / Error al actualizar portada / Errore nell'aggiornamento"
orderDetails.cover.sizeError = "Imagem muito grande (max 5MB) / Image too large (max 5MB) / ..."
```

#### 3. Arquivos a modificar

- `src/pages/OrderDetails.tsx` - Adicionar botao de troca de capa e logica de upload
- `public/locales/pt-BR/dashboard.json` - Novas chaves
- `public/locales/en/dashboard.json` - Novas chaves
- `public/locales/es/dashboard.json` - Novas chaves
- `public/locales/it/dashboard.json` - Novas chaves

#### 4. Fluxo do usuario

```text
[Musica pronta] 
  -> Ve a capa com icone de camera/editar
  -> Clica no icone
  -> Popover com "Manter capa" ou "Enviar imagem"
  -> Seleciona arquivo
  -> Upload para bucket 'covers'
  -> cover_url atualizado no pedido
  -> Capa nova exibida imediatamente
```

### Observacoes

- O bucket `covers` ja existe e e publico, nao precisa criar
- O campo `cover_url` ja existe na tabela `orders`
- Usuarios ja podem fazer UPDATE nos proprios pedidos (RLS ja permite)
- O upload usa um nome unico baseado no orderId para evitar conflitos
