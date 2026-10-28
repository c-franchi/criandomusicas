import { useEffect } from 'react';
import { setFlowBusy } from '@/lib/flowGuard';
/** Balanced lifetime guard, including navigation and React StrictMode. */
export function useFlowBusy(active: boolean) {
 useEffect(() => { if (!active) return; setFlowBusy(true); return () => setFlowBusy(false); }, [active]);
}
