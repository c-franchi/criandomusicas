import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSyncExternalStore } from 'react';

import { regions, type Region } from '@/lib/regions';
import { localeController } from '@/lib/locale-selection';
export { regions, type Region } from '@/lib/regions';

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
  const locale = useSyncExternalStore(localeController.subscribe, localeController.getSnapshot, localeController.getSnapshot);
  const currentRegion = locale.region || regions.find(r => r.language === i18n.language) || regions[0];
  const automatic = locale.mode === 'auto';

  const handleRegionChange = (regionCode: string) => {
    if (regionCode === 'auto') {
      void localeController.automatic().then(next => i18n.changeLanguage(next.language));
      return;
    }
    const region = regions.find(r => r.code === regionCode);
    if (!region) return;
    localeController.selectRegion(regionCode);
    void i18n.changeLanguage(region.language);
    onRegionChange?.(region);
  };

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
      <Select value={automatic ? 'auto' : currentRegion.code} onValueChange={handleRegionChange}>
        <SelectTrigger className={`w-auto gap-2 ${className}`}>
          <MapPin className="h-4 w-4" />
          <SelectValue>
            <span className="flex items-center gap-2">
              <span>{automatic ? "🌐" : currentRegion.flag}</span>
              <span className="hidden sm:inline">{automatic ? t("region.automaticShort") : currentRegion.code}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-background border-border z-50 max-h-80">
          <SelectItem value="auto">🌐 {t("region.automatic")}</SelectItem>
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
      <Select value={automatic ? 'auto' : currentRegion.code} onValueChange={handleRegionChange}>
        <SelectTrigger className="w-full">
          <SelectValue>
            <span className="flex items-center gap-2">
              <span>{automatic ? "🌐" : currentRegion.flag}</span>
              <span>{automatic ? t("region.automatic") : currentRegion.name}</span>
              {!automatic && <span className="text-muted-foreground">({currentRegion.currencySymbol})</span>}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-background border-border z-50 max-h-80">
          <SelectItem value="auto">🌐 {t("region.automatic")}</SelectItem>
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
