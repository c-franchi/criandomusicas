import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEffect, useState } from 'react';

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

const REGION_STORAGE_KEY = 'criandomusicas-region';

export const getStoredRegion = (): Region | null => {
  const stored = localStorage.getItem(REGION_STORAGE_KEY);
  if (stored) {
    return regions.find(r => r.code === stored) || null;
  }
  return null;
};

export const setStoredRegion = (regionCode: string) => {
  localStorage.setItem(REGION_STORAGE_KEY, regionCode);
};

export const detectRegionFromTimezone = (): Region | null => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
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
    console.warn('Could not detect timezone:', e);
  }
  return null;
};

interface RegionSelectorProps {
  variant?: 'compact' | 'full';
  showLabel?: boolean;
  className?: string;
  onRegionChange?: (region: Region) => void;
}

const RegionSelector = ({ 
  variant = 'compact', 
  showLabel = false,
  className = '',
  onRegionChange 
}: RegionSelectorProps) => {
  const { i18n, t } = useTranslation('common');
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);

  useEffect(() => {
    // Check for stored region first
    let region = getStoredRegion();
    
    // If no stored region, try to detect from timezone
    if (!region) {
      region = detectRegionFromTimezone();
    }
    
    // If still no region, default based on language
    if (!region) {
      const langToRegion: Record<string, string> = {
        'pt-BR': 'BR',
        'en': 'US',
        'es': 'ES',
        'it': 'IT',
      };
      const regionCode = langToRegion[i18n.language] || 'BR';
      region = regions.find(r => r.code === regionCode) || regions[0];
    }
    
    setCurrentRegion(region);
  }, [i18n.language]);

  const handleRegionChange = (regionCode: string) => {
    const region = regions.find(r => r.code === regionCode);
    if (region) {
      setCurrentRegion(region);
      setStoredRegion(regionCode);
      
      // Update language if different
      if (region.language !== i18n.language) {
        i18n.changeLanguage(region.language);
      }
      
      // Store currency preference
      localStorage.setItem('criandomusicas-currency', region.currency);
      
      onRegionChange?.(region);
    }
  };

  if (!currentRegion) return null;

  // Group regions by language for better UX
  const regionsByLanguage = regions.reduce((acc, region) => {
    const lang = region.language;
    if (!acc[lang]) acc[lang] = [];
    acc[lang].push(region);
    return acc;
  }, {} as Record<string, Region[]>);

  const languageLabels: Record<string, string> = {
    'pt-BR': 'Português',
    'en': 'English',
    'es': 'Español',
    'it': 'Italiano',
  };

  if (variant === 'compact') {
    return (
      <Select value={currentRegion.code} onValueChange={handleRegionChange}>
        <SelectTrigger className={`w-auto gap-2 ${className}`}>
          <MapPin className="h-4 w-4" />
          <SelectValue>
            <span className="flex items-center gap-2">
              <span>{currentRegion.flag}</span>
              <span className="hidden sm:inline">{currentRegion.code}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-background border-border z-50 max-h-80">
          {Object.entries(regionsByLanguage).map(([lang, langRegions]) => (
            <div key={lang}>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                {languageLabels[lang]}
              </div>
              {langRegions.map((region) => (
                <SelectItem key={region.code} value={region.code}>
                  <span className="flex items-center gap-2">
                    <span>{region.flag}</span>
                    <span>{region.name}</span>
                    <span className="text-muted-foreground text-xs">({region.currencySymbol})</span>
                  </span>
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {showLabel && (
        <label className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {t('region.label', 'País/Região')}
        </label>
      )}
      <Select value={currentRegion.code} onValueChange={handleRegionChange}>
        <SelectTrigger className="w-full">
          <SelectValue>
            <span className="flex items-center gap-2">
              <span>{currentRegion.flag}</span>
              <span>{currentRegion.name}</span>
              <span className="text-muted-foreground">({currentRegion.currencySymbol})</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-background border-border z-50 max-h-80">
          {Object.entries(regionsByLanguage).map(([lang, langRegions]) => (
            <div key={lang}>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t first:border-t-0">
                {languageLabels[lang]}
              </div>
              {langRegions.map((region) => (
                <SelectItem key={region.code} value={region.code}>
                  <span className="flex items-center gap-2">
                    <span>{region.flag}</span>
                    <span>{region.name}</span>
                    <span className="text-muted-foreground text-xs">({region.currencySymbol})</span>
                  </span>
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default RegionSelector;
