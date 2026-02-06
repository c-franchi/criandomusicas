
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

✅ **IMPLEMENTADO**

## Objetivo
Permitir que o usuário grave/envie um áudio cantando um trecho, o sistema transcreva via OpenAI, e gere uma letra completa no formato Suno usando o trecho como parte fixa.

## Fases Implementadas

### Fase 1 — Infraestrutura ✅
- Tabelas `audio_inputs` e `transcriptions` criadas com RLS
- Bucket `audio-inputs` (privado) criado
- Edge Function `transcribe-audio` implementada (OpenAI Whisper)

### Fase 2 — Componente de Captura de Áudio ✅
- Hook `useAudioRecorder` com MediaRecorder API
- Componente `AudioCapture` com gravação/upload/preview
- Limite 3s-90s, formatos .wav/.mp3/.m4a

### Fase 3 — Wizard do Modo Áudio ✅
- `AudioModeWizard` com 4 etapas (Captura → Transcrição → Config → Resultado)
- Subcomponentes: `AudioTranscriptionStep`, `AudioConfigStep`, `AudioResultStep`
- Transcrição editável, seleção de seção/modo, geração via `generate-lyrics`

### Fase 4 — Integração com Sistema ✅
- Homepage: Badge "Novo!" com botão "Experimentar" (ProcessSteps)
- Dashboard: Aba "Áudio" com explicação e CTA
- Briefing: Card "Criar por Áudio" funcional no seletor de modo
- Admin: Badges de tipo já mostram categorização por pedido

### Fase 5 — Polimento ✅
- Refatoração do AudioModeWizard em subcomponentes menores
- UX com loading, retry, edição de transcrição
- Validação MIME type e tamanho no upload

## Stack Técnica
- **Transcrição**: OpenAI Whisper (OPENAI_API_KEY)
- **Geração de letras**: Lovable AI Gateway (openai/gpt-5)
- **Storage**: Supabase Storage (bucket audio-inputs)
- **Frontend**: React + Framer Motion + shadcn/ui
