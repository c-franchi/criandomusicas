
# Plan: Fix Re-engagement Email Logic, Audio Data Leak, and Unify Loading Overlay

## Problem Summary

1. **Re-engagement emails sent to users who already used their free credit**: The Edge Function only checks `has_created_music = false` and `email_24h_sent = false`, but ignores whether the user's preview credit (`preview_test`) has already been consumed (`used_credits >= total_credits`). Users who used their credit but whose `has_created_music` flag wasn't set (e.g., order stuck in DRAFT) still receive the "you have 1 free song" email.

2. **Audio recordings being attached to non-audio vocal orders**: The `audioInsertData` stored in `localStorage` persists across sessions. When a user creates a vocal order via the standard flow (not audio mode), the code still reads `localStorage.getItem('audioInsertData')` and attaches the stale `audio_input_id` to the new order, plus sends the `audioInsert` data to `generate-lyrics`.

3. **Inconsistent loading overlay**: There are 3 different loading overlays in `Briefing.tsx`:
   - Line 3174: Simple `Loader2` spinner (quick mode section)
   - Line 3497: Simple `Music` spinner (confirmation/detailed mode section)
   - Line 4428: `AudioModeLoadingOverlay` with progress bar and animated status messages (global)
   
   The user wants ONLY the `AudioModeLoadingOverlay` (with progress bar) used everywhere.

---

## Changes

### 1. Fix Re-engagement Email Logic

**File: `supabase/functions/send-reengagement-email/index.ts`**

After fetching inactive profiles (line 161-166), add a secondary check: for each user, verify their `preview_test` credit in `user_credits` table. Only send the email if `used_credits < total_credits` (i.e., the free credit is actually still available).

Current query only checks:
```
profiles.has_created_music = false
profiles.email_24h_sent = false
profiles.created_at <= 24h ago
```

Add for each profile before sending:
```sql
SELECT used_credits, total_credits FROM user_credits 
WHERE user_id = ? AND plan_id = 'preview_test' LIMIT 1
```

- If no preview credit record exists OR `used_credits >= total_credits`, skip the user (mark `email_24h_sent = true` to avoid re-checking).
- Only send email if the credit is genuinely available.

### 2. Fix Audio Data Leak to Non-Audio Orders

**File: `src/pages/Briefing.tsx`**

In both `finishBriefing()` (line 2269) and `finishBriefingWithData()` (line 2715):
- Only read `audioInsertData` from localStorage if the current order was created via audio mode (`creationMode === 'audio'`).
- Otherwise, set `audio_input_id` to `null`.

In `processOrderAfterCredit()` (line 2354-2362):
- Only read `audioInsertData` from localStorage if `creationMode === 'audio'`.
- Otherwise, set `audioInsert` to `null`.

Additionally, clear `audioInsertData` from localStorage at the START of non-audio creation flows (when `creationMode` is set to `'quick'` or `'detailed'`), to prevent stale data from leaking.

### 3. Unify Loading Overlay

**File: `src/pages/Briefing.tsx`**

- **Remove** the simple loading overlay at line 3174-3183 (quick mode section).
- **Remove** the simple loading overlay at line 3497-3508 (confirmation/detailed mode section).
- **Keep** the global `AudioModeLoadingOverlay` at line 4428-4431 -- this one already fires for all `isCreatingOrder` states and covers all flows.

This ensures all creation flows (quick, detailed, audio, instrumental) show the same progress bar with animated status messages.

---

## Technical Details

### Email query enhancement (pseudo-code)

```
for each profile in inactiveProfiles:
  // Check if preview credit is still available
  const { data: credit } = await supabase
    .from('user_credits')
    .select('used_credits, total_credits')
    .eq('user_id', profile.user_id)
    .eq('plan_id', 'preview_test')
    .maybeSingle();
  
  if (!credit || credit.used_credits >= credit.total_credits):
    // Mark as sent to avoid re-checking, but don't send email
    await supabase.from('profiles').update({ email_24h_sent: true }).eq('user_id', profile.user_id);
    continue;
```

### Audio data isolation (Briefing.tsx)

```
// In finishBriefing and finishBriefingWithData:
audio_input_id: creationMode === 'audio' ? (() => {
  // existing localStorage logic
})() : null,

// In processOrderAfterCredit:
let audioInsert = null;
if (creationMode === 'audio') {
  // existing localStorage logic
}
```

### Loading overlay cleanup

Remove the two simple spinner overlays; the global `AudioModeLoadingOverlay` at line 4428-4431 already handles all cases since it checks `isCreatingOrder`.
