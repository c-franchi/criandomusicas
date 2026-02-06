
# Plano: Migrar Geração de Letras para GPT

✅ **IMPLEMENTADO**

---

# Plano: Modo Simples Automático para Letras

✅ **IMPLEMENTADO** (2026-02-05)

---

# Plano: Correção CORS e UX de Geração (2026-02-05)

✅ **IMPLEMENTADO**

---

# Plano: Modo Áudio — Criar Música por Áudio Cantado (2026-02-06)

🔄 **EM ANDAMENTO**

## Objetivo
Permitir que o usuário grave/envie um áudio cantando um trecho, o sistema transcreva via OpenAI, e gere uma letra completa no formato Suno usando o trecho como parte fixa.

## Fases de Implementação

### Fase 1 — Infraestrutura (Banco + Edge Functions) ⬜
**Objetivo**: Criar a base de dados e backend necessários.

#### 1.1 Tabelas no Banco
- `audio_inputs`: id, user_id, storage_path, mime_type, duration_sec, size_bytes, created_at
- `transcriptions`: id, audio_id, user_id, transcript_text, segments_json, model, created_at

#### 1.2 Storage Bucket
- Criar bucket `audio-inputs` (privado) para armazenar áudios enviados

#### 1.3 Edge Function: `transcribe-audio`
- Recebe `audio_id` + `language` (default pt-BR)
- Busca áudio do storage
- Envia para OpenAI Whisper (`gpt-4o-transcribe` ou `whisper-1`)
- Salva transcrição na tabela `transcriptions`
- Retorna transcript + segments

#### 1.4 Edge Function: `generate-lyrics-from-audio`
- Recebe: audio_id, theme, style, insert (section + mode + transcript)
- Usa o trecho transcrito como parte fixa na seção escolhida
- Gera restante da letra via fluxo existente (Lovable AI / OpenAI)
- Retorna letra final formatada para Suno

**Arquivos**:
- `supabase/functions/transcribe-audio/index.ts`
- `supabase/functions/generate-lyrics-from-audio/index.ts`
- `supabase/config.toml` (adicionar funções)
- Migration SQL para tabelas + bucket + RLS

---

### Fase 2 — Componente de Captura de Áudio ⬜
**Objetivo**: UI para gravar/enviar áudio no navegador.

#### 2.1 Hook: `useAudioRecorder`
- Gerenciar estados: idle → recording → recorded → uploading → uploaded
- Gravar via MediaRecorder API (output webm/wav)
- Controlar duração (min 3s, max 90s)
- Timer visual durante gravação
- Upload para storage bucket `audio-inputs`

#### 2.2 Componente: `AudioCapture`
- Botões: Gravar / Parar / Ouvir / Refazer
- Upload de arquivo (aceitar .wav, .mp3, .m4a)
- Exibir: tempo gravado, tamanho, formato
- Feedback de upload (progress bar)
- Tratamento de erros (microfone bloqueado, formato inválido, tamanho excedido)

**Arquivos**:
- `src/hooks/useAudioRecorder.tsx`
- `src/components/briefing/AudioCapture.tsx`

---

### Fase 3 — Wizard do Modo Áudio (Fluxo Completo) ⬜
**Objetivo**: Fluxo multi-etapas integrado ao briefing existente.

#### 3.1 Componente: `AudioModeWizard`
Wizard com 4 etapas:

**Etapa A — Captura do Áudio**
- Usa `AudioCapture` (Fase 2)
- Ao concluir upload → avança

**Etapa B — Transcrição**
- Chama edge function `transcribe-audio`
- Loading com "Transcrevendo..."
- Exibe resultado em textarea editável
- Botão "Re-transcrever"
- Tratar: falha, transcrição vazia

**Etapa C — Configuração**
- Onde inserir o trecho: Verso / Refrão / Intro falado / Ponte
- Como usar: Manter exatamente / Ajustar levemente
- Tema/dedicatória (opcional)
- Estilo musical + voz (reutilizar componentes existentes)

**Etapa D — Geração Final**
- Chama edge function `generate-lyrics-from-audio`
- Loading com "Criando a letra..."
- Exibe resultado em campo monoespaçado
- Botão "Copiar para Suno"
- Botão "Salvar" (persiste na tabela orders)

**Arquivos**:
- `src/components/briefing/AudioModeWizard.tsx`
- `src/components/briefing/AudioTranscriptionStep.tsx`
- `src/components/briefing/AudioConfigStep.tsx`
- `src/components/briefing/AudioResultStep.tsx`

---

### Fase 4 — Integração com Sistema Existente ⬜
**Objetivo**: Conectar Modo Áudio ao fluxo de criação, dashboard e admin.

#### 4.1 Briefing.tsx
- Remover placeholder "Em breve" do Modo Áudio
- Adicionar opção funcional no seletor de modo/pacote
- Roteamento para AudioModeWizard

#### 4.2 Dashboard
- Exibir pedidos do modo áudio com ícone 🎤
- Mostrar: data, tema, duração do áudio, botões ver transcrição/copiar letra

#### 4.3 Admin
- Visibilidade de pedidos áudio no painel admin
- Filtro por modo (texto/áudio)

#### 4.4 Homepage
- Remover/atualizar teaser "Em breve" para "Novo! 🎤"

**Arquivos**:
- `src/pages/Briefing.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/AdminDashboard.tsx`
- `src/components/ProcessSteps.tsx`

---

### Fase 5 — Polimento e Testes ⬜
**Objetivo**: Garantir qualidade, segurança e usabilidade.

- Rate limiting (10 transcrições/dia no MVP)
- Validação MIME type e tamanho (max 20MB)
- Sanitização de textos
- Logs de eventos (upload_success/fail, transcribe_success/fail, generate_success/fail)
- Testes E2E dos fluxos
- i18n para todas as novas strings (pt-BR, en, es, it)

---

## Modelo de Dados

```
audio_inputs
├── id (uuid, PK)
├── user_id (uuid, NOT NULL)
├── storage_path (text, NOT NULL)
├── mime_type (text, NOT NULL)
├── duration_sec (float)
├── size_bytes (integer)
├── source (text: 'recording' | 'upload')
└── created_at (timestamptz)

transcriptions
├── id (uuid, PK)
├── audio_id (uuid, FK → audio_inputs.id)
├── user_id (uuid, NOT NULL)
├── transcript_text (text, NOT NULL)
├── segments_json (jsonb)
├── model (text)
└── created_at (timestamptz)
```

## Regras de Inserção na Letra (Suno Format)
- VERSE → inserir como [Verse 1]
- CHORUS → inserir como [Chorus]
- INTRO_MONOLOGUE → inserir em [Intro] com tag [monologue]
- BRIDGE → inserir em [Bridge]
- keep_exact → manter texto fiel
- light_edit → ajustes leves (pontuação, rimas suaves)

## Stack Técnica
- **Transcrição**: OpenAI Whisper (OPENAI_API_KEY já configurado)
- **Geração de letras**: Lovable AI Gateway (openai/gpt-5)
- **Storage**: Supabase Storage (bucket audio-inputs)
- **Frontend**: React + Framer Motion + shadcn/ui
