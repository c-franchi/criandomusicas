import { useEffect, useState } from 'react';
import { canOfferPix, canStartBrazilCard, resolvePaymentAccessCountry } from '@/lib/access-payment';

export function usePaymentAccess() {
  const [country, setCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void resolvePaymentAccessCountry().then(value => {
      if (!active) return;
      setCountry(value);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);
  return {
    country, loading, pixAvailable: canOfferPix(country),
    brazilCardAvailable: canStartBrazilCard(country),
    unavailableReason: loading ? 'payment.countryLoading' : country ? 'payment.euroUnavailable' : 'payment.countryUnavailable',
  };
}