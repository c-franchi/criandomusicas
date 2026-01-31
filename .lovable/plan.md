

# Plan: Performance Optimization for Briefing & Quick Creation

## Objective
Make the Briefing and Quick Creation pages load instantly with smooth, lightweight interactions.

---

## Changes Overview

### 1. Optimize ImageCardGrid Animations
**File:** `src/components/briefing/ImageCardGrid.tsx`
- Remove staggered animation delays (`delay: index * 0.02` → `delay: 0`)
- Reduce animation duration from 150ms to 100ms
- Remove artificial 150ms loading state after drag interactions
- Use simpler CSS transitions instead of framer-motion for card appearance

### 2. Add Native Image Preloading
**File:** `src/components/briefing/ImageCard.tsx`
- Add `fetchpriority="high"` for first 6 visible cards
- Keep `loading="lazy"` for off-screen cards
- Add `decoding="async"` to prevent blocking main thread

### 3. Optimize QuickCreation Component
**File:** `src/components/briefing/QuickCreation.tsx`
- Preload critical genre and voice images on component mount
- Add proper dependencies to useMemo hooks
- Remove unnecessary re-renders with React.memo wrapper

### 4. Reduce Briefing Initial Load
**File:** `src/pages/Briefing.tsx`
- Lazy load non-critical image sets (children, soundtrack, gospel)
- Defer celebration check until after initial render
- Use `startTransition` for non-urgent state updates

---

## Technical Details

### ImageCardGrid Changes
```typescript
// Before: Staggered delays
transition={{ delay: index * 0.02, duration: 0.15 }}

// After: Instant appearance
transition={{ duration: 0.1 }}
```

```typescript
// Remove artificial loading delay
const handleMouseUp = () => {
  setIsDragging(false);
  // Remove: setIsLoading(true); setTimeout(...)
};
```

### ImageCard Preloading
```typescript
<img
  src={imageSrc}
  loading={priority ? "eager" : "lazy"}
  decoding="async"
  fetchPriority={priority ? "high" : "auto"}
/>
```

### QuickCreation Optimizations
```typescript
// Preload critical images on mount
useEffect(() => {
  const criticalImages = [
    genreImages.pop, genreImages.rock, genreImages.sertanejo,
    voiceImages.masculina, voiceImages.feminina
  ];
  criticalImages.forEach(src => {
    const img = new Image();
    img.src = src;
  });
}, []);
```

---

## Expected Results
- Page opens 200-300ms faster
- Smoother scrolling through options
- No visual jank during image loading
- Instant response to user interactions

---

## Files to Modify
1. `src/components/briefing/ImageCardGrid.tsx`
2. `src/components/briefing/ImageCard.tsx`
3. `src/components/briefing/QuickCreation.tsx`
4. `src/pages/Briefing.tsx`

