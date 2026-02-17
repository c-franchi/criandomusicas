
# Plan: Fix Instrumental Title, Cover Upload, Audio Mode Title, and Infantil Themes

## Problem Summary

1. **Instrumental title not preserved**: The `OrderProcessingService.processInstrumental()` doesn't pass `songTitle` to the `generate-style-prompt` Edge Function, so user-provided titles are lost
2. **Audio mode ("Criar por Áudio") has no title input**: The `AudioConfigStep` component lacks a song name field entirely
3. **Instrumental has no cover upload**: Instrumental orders skip `CreateSong.tsx` and go directly to dashboard, bypassing the cover upload UI
4. **Instrumental infantil uses generic flow**: When `musicType === 'infantil'` and `isInstrumental === true`, the briefing skips the specialized children's theme flow (age, objective, theme, mood, style) and uses the generic instrumental steps instead

---

## Changes

### 1. Fix Instrumental Title Passing

**File: `src/services/OrderProcessingService.ts`**

- In `processInstrumental()`, add `songTitle` and `coverMode`/`customCoverUrl` to the `generate-style-prompt` call body
- Read `song_title` from the order in `finishBriefing` where it's already being saved correctly

### 2. Add Title Input to Audio Mode

**File: `src/components/briefing/AudioConfigStep.tsx`**

- Add a new `songName` prop and `onSongNameChange` callback
- Add a "Nome da musica (opcional)" input field below the "Tema/Dedicatoria" section
- Same pattern as QuickCreation: optional field with placeholder "Deixe vazio para gerar automaticamente"

**File: `src/components/briefing/AudioModeWizard.tsx`**

- Add `songName` state
- Pass it to `AudioConfigStep`
- Include `songName` in the `AudioModeResult` interface

**File: `src/pages/Briefing.tsx`**

- In `handleAudioModeComplete`, use `audioResult.songName` to set `songName` and `autoGenerateName` correctly

### 3. Add Cover Upload for Instrumental

**File: `src/pages/Briefing.tsx`**

- Add cover upload state (file, preview, coverMode) to the Briefing page
- Show cover upload UI in the confirmation screen when `isInstrumental === true`
- Before calling `processOrderAfterCredit` for instrumental, upload the cover to Supabase Storage and save the public URL to `orders.cover_url`
- Pass `customCoverUrl` and `coverMode` through the briefing payload

**File: `src/services/OrderProcessingService.ts`**

- In `processInstrumental()`, pass `customCoverUrl` and `coverMode` to `generate-style-prompt`

### 4. Route Instrumental Infantil Through Children's Themes

**File: `src/pages/Briefing.tsx`**

- In `getNextStep()`, when `current === 1` and `data.musicType === 'infantil'` and `data.isInstrumental`:
  - Route to a subset of children steps: age (60) -> objective (61) -> theme (62) -> mood (63) -> style (64)
  - Then skip interaction (65), narrative (66), voiceType (68) (not needed for instrumental)
  - Go to story (67) -> then to instrumental name step (20)
- Add conditional logic in the children flow section to handle instrumental path:
  - After step 64 (childStyle), if instrumental, skip to step 67 (story)
  - After step 67 (story), if instrumental, skip to step 20 (autoGenerateName for instrumental)

---

## Technical Details

### getNextStep changes (Briefing.tsx)

```text
Step 1 (musicType):
  if infantil AND isInstrumental -> 60 (start children flow)

Children flow (60-69) additions:
  if isInstrumental:
    60 -> 61 -> 62 -> 63 -> 64 -> 67 (skip interaction, narrative, voice)
    67 -> 20 (instrumental name step)
```

### OrderProcessingService.processInstrumental changes

```text
Add to invoke body:
  songTitle: briefing.songName || null
  customCoverUrl: briefing.customCoverUrl || null
  coverMode: briefing.coverMode || 'auto'
  language: MusicCreationService.getActiveLanguage()
```

### AudioModeResult interface update

```text
Add: songName?: string
```

### Confirmation screen cover upload

The cover upload component already exists in `CreateSong.tsx`. We will replicate the same pattern (file input, preview, original/enhanced modes) in the Briefing confirmation screen, conditionally shown for instrumental orders.
