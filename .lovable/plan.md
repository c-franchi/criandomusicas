

# Plan: Button Colors, Carousel Animation Fix, and Audio Tab Order Filtering

## 1. Add colors to Hero buttons following the site's color palette

The Hero section has buttons for "Criar por Audio" and "Modo Completo" that currently both use the `glass` variant (transparent). Changes:

- **"Criar por Audio" button** -- make it stand out with a gradient using the primary purple-to-accent pink palette (`bg-gradient-to-r from-primary to-accent text-white`), matching the site's premium design tokens
- **"Modo Completo" button** -- use the `outline` variant with a subtle primary border to differentiate it while keeping the hierarchy clear
- Apply the same pattern for both logged-in and non-logged-in states

**File: `src/components/Hero.tsx`**
- Lines 202-211 (logged-in "Criar por Audio"): Change from `variant="glass"` to `variant="hero"` with `bg-gradient-to-r from-primary to-accent` classes
- Lines 212-221 (logged-in "Modo Completo"): Keep `variant="glass"` or change to `outline` for secondary hierarchy
- Lines 235-240 (non-logged "Criar por Audio"): Same gradient treatment
- Lines 241-245 (non-logged "Modo Completo"): Same outline treatment

## 2. Fix carousel (Marquee) animation not running

The Marquee component in `src/components/ui/marquee.tsx` stops animation when `isPaused` is true. The issue is that the animation class is conditionally removed when `isPaused` is true (line: `!isPaused && animationClass`). The animations are defined correctly in `tailwind.config.ts` (`marquee-left 40s linear infinite`).

The likely cause: the Marquee component sets `isPaused` to `true` on mouse enter and removes the animation class entirely. This is correct behavior for hover-pause. However, it also sets `animationPlayState: isPaused ? "paused" : "running"` -- but since the class is removed, the animation never runs again properly.

**Fix in `src/components/ui/marquee.tsx`:**
- Keep the animation class always applied (don't conditionally remove it)
- Use only `animationPlayState` CSS property to pause/resume
- This ensures the marquee scrolls continuously and pauses smoothly on hover
- The drag-to-scroll behavior on hover is already implemented and should continue working

## 3. Audio-mode orders should appear in the Audio tab

Currently, the Dashboard filters orders into tabs by `is_instrumental` and `has_custom_lyric`, but audio-mode orders have `audio_input_id` set. These orders currently fall into the "Vocal" tab since they're not instrumental or custom lyric.

**File: `src/pages/Dashboard.tsx`**

- Add `audio_input_id` to the `Order` interface (line 32-49)
- Add `audio_input_id` to the `select` query (line 188)
- Create a new `audioOrders` memo: `orders.filter(o => !!o.audio_input_id && !o.is_instrumental)`
- Update `vocalOrders` memo to exclude audio orders: `orders.filter(o => !o.is_instrumental && !o.has_custom_lyric && !o.audio_input_id)`
- Replace the static "Modo Audio" card in the Audio tab (lines 725-745) with an `OrderAccordion` showing `audioOrders`, with the existing empty state as fallback
- Update the Audio tab badge to show `audioOrders.length` instead of "Novo"

---

## Technical Details

### Hero button classes

```text
Criar por Audio (highlight):
  className="text-lg px-8 py-7 rounded-xl group bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 shadow-lg"

Modo Completo (secondary):
  variant="outline" (keeps the glass/border look but clearly secondary)
```

### Marquee fix

```text
// Current (broken when paused):
className={cn("flex w-max gap-6", !isPaused && animationClass)}

// Fixed:
className={cn("flex w-max gap-6", animationClass)}
style={{ 
  willChange: isPaused ? "auto" : "transform",
  animationPlayState: isPaused ? "paused" : "running"
}}
```

### Dashboard audio tab filtering

```text
// Add to Order interface:
audio_input_id?: string | null;

// Add to select query:
.select('id, status, ..., audio_input_id')

// New memo:
const audioOrders = useMemo(() => 
  orders.filter(o => !!o.audio_input_id && !o.is_instrumental), [orders]);

// Update vocal filter:
const vocalOrders = useMemo(() => 
  orders.filter(o => !o.is_instrumental && !o.has_custom_lyric && !o.audio_input_id), [orders]);
```
