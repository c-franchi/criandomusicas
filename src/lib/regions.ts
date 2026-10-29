export interface Region {
  code: string;
  name: string;
  flag: string;
  language: string;
  currency: string;
  currencySymbol: string;
}

export const regions: Region[] = [
  // Portuguese-speaking
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', language: 'pt-BR', currency: 'BRL', currencySymbol: 'R$' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', language: 'pt-BR', currency: 'EUR', currencySymbol: '€' },
  
  // English-speaking
  { code: 'US', name: 'United States', flag: '🇺🇸', language: 'en', currency: 'USD', currencySymbol: '$' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', language: 'en', currency: 'GBP', currencySymbol: '£' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', language: 'en', currency: 'CAD', currencySymbol: 'CA$' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', language: 'en', currency: 'AUD', currencySymbol: 'A$' },
  
  // Spanish-speaking
  { code: 'ES', name: 'España', flag: '🇪🇸', language: 'es', currency: 'EUR', currencySymbol: '€' },
  { code: 'MX', name: 'México', flag: '🇲🇽', language: 'es', currency: 'MXN', currencySymbol: 'MX$' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', language: 'es', currency: 'ARS', currencySymbol: 'AR$' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', language: 'es', currency: 'COP', currencySymbol: 'CO$' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', language: 'es', currency: 'CLP', currencySymbol: 'CL$' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪', language: 'es', currency: 'PEN', currencySymbol: 'S/' },
  
  // Italian-speaking
  { code: 'IT', name: 'Italia', flag: '🇮🇹', language: 'it', currency: 'EUR', currencySymbol: '€' },
  { code: 'CH', name: 'Svizzera', flag: '🇨🇭', language: 'it', currency: 'CHF', currencySymbol: 'CHF' },
];

export const detectRegionFromTimezone = (timezone?: string): Region | null => {
  try {
    timezone ??= Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Map timezones to regions
    const timezoneToRegion: Record<string, string> = {
      // Brazil
      'America/Sao_Paulo': 'BR',
      'America/Rio_Branco': 'BR',
      'America/Manaus': 'BR',
      'America/Cuiaba': 'BR',
      'America/Fortaleza': 'BR',
      'America/Recife': 'BR',
      'America/Bahia': 'BR',
      
      // Portugal
      'Europe/Lisbon': 'PT',
      
      // US
      'America/New_York': 'US',
      'America/Chicago': 'US',
      'America/Denver': 'US',
      'America/Los_Angeles': 'US',
      'America/Phoenix': 'US',
      'America/Anchorage': 'US',
      'Pacific/Honolulu': 'US',
      
      // UK
      'Europe/London': 'GB',
      
      // Canada
      'America/Toronto': 'CA',
      'America/Vancouver': 'CA',
      'America/Edmonton': 'CA',
      'America/Winnipeg': 'CA',
      'America/Halifax': 'CA',
      
      // Australia
      'Australia/Sydney': 'AU',
      'Australia/Melbourne': 'AU',
      'Australia/Brisbane': 'AU',
      'Australia/Perth': 'AU',
      'Australia/Adelaide': 'AU',
      
      // Spain
      'Europe/Madrid': 'ES',
      
      // Mexico
      'America/Mexico_City': 'MX',
      'America/Cancun': 'MX',
      'America/Tijuana': 'MX',
      
      // Argentina
      'America/Buenos_Aires': 'AR',
      'America/Argentina/Buenos_Aires': 'AR',
      
      // Colombia
      'America/Bogota': 'CO',
      
      // Chile
      'America/Santiago': 'CL',
      
      // Peru
      'America/Lima': 'PE',
      
      // Italy
      'Europe/Rome': 'IT',
      
      // Switzerland
      'Europe/Zurich': 'CH',
    };
    
    const regionCode = timezoneToRegion[timezone];
    if (regionCode) {
      return regions.find(r => r.code === regionCode) || null;
    }
  } catch (e) {
    // A missing timezone falls back to browser language.
  }
  return null;
};

