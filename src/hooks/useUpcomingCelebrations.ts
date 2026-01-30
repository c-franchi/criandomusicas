import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { addDays, differenceInDays, isAfter, isBefore, startOfDay } from 'date-fns';

export interface CommemorativeDate {
  id: string;
  name: string;
  name_en: string | null;
  name_es: string | null;
  name_it: string | null;
  emoji: string;
  month: number;
  day: number | null;
  calculation_rule: string | null;
  suggested_music_type: string | null;
  suggested_atmosphere: string | null;
  suggested_emotion: string | null;
  description: string | null;
  description_en: string | null;
  description_es: string | null;
  description_it: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface UpcomingCelebration extends CommemorativeDate {
  calculatedDate: Date;
  daysUntil: number;
  localizedName: string;
  localizedDescription: string;
}

// Easter calculation using Meeus/Jones/Butcher algorithm
function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
}

// Carnival is 47 days before Easter
function calculateCarnival(year: number): Date {
  const easter = calculateEaster(year);
  return addDays(easter, -47);
}

// Get the Nth occurrence of a weekday in a month
function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const firstDay = new Date(year, month - 1, 1);
  const firstWeekday = firstDay.getDay();
  
  // Calculate days until first occurrence of desired weekday
  let daysUntilFirst = weekday - firstWeekday;
  if (daysUntilFirst < 0) daysUntilFirst += 7;
  
  // Add weeks to get to Nth occurrence
  const targetDay = 1 + daysUntilFirst + (n - 1) * 7;
  
  return new Date(year, month - 1, targetDay);
}

// Calculate variable date based on rule
function calculateVariableDate(rule: string, year: number): Date | null {
  switch (rule) {
    case 'carnival':
      return calculateCarnival(year);
    case 'easter':
      return calculateEaster(year);
    case 'second_sunday_may':
      return getNthWeekdayOfMonth(year, 5, 0, 2); // 2nd Sunday of May
    case 'second_sunday_august':
      return getNthWeekdayOfMonth(year, 8, 0, 2); // 2nd Sunday of August
    default:
      return null;
  }
}

// Get the next occurrence of a date (this year or next year)
function getNextOccurrence(month: number, day: number | null, rule: string | null, today: Date): Date {
  const currentYear = today.getFullYear();
  
  let thisYearDate: Date;
  let nextYearDate: Date;
  
  if (rule) {
    thisYearDate = calculateVariableDate(rule, currentYear) || new Date(currentYear, month - 1, 1);
    nextYearDate = calculateVariableDate(rule, currentYear + 1) || new Date(currentYear + 1, month - 1, 1);
  } else if (day) {
    thisYearDate = new Date(currentYear, month - 1, day);
    nextYearDate = new Date(currentYear + 1, month - 1, day);
  } else {
    return new Date(currentYear, month - 1, 1); // Fallback
  }
  
  // If this year's date has passed, use next year's
  if (isBefore(startOfDay(thisYearDate), startOfDay(today))) {
    return nextYearDate;
  }
  
  return thisYearDate;
}

export const useUpcomingCelebrations = (daysAhead = 30) => {
  const { i18n } = useTranslation();
  const [dates, setDates] = useState<CommemorativeDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDates = async () => {
      try {
        const { data, error } = await supabase
          .from('commemorative_dates')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) throw error;
        setDates((data || []) as CommemorativeDate[]);
      } catch (err) {
        console.error('Error fetching commemorative dates:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDates();
  }, []);

  const upcomingDates = useMemo(() => {
    const today = startOfDay(new Date());
    const limitDate = addDays(today, daysAhead);
    const language = i18n.language;

    return dates
      .map((date): UpcomingCelebration | null => {
        const calculatedDate = getNextOccurrence(date.month, date.day, date.calculation_rule, today);
        const daysUntil = differenceInDays(calculatedDate, today);

        // Only include dates within the specified range
        if (daysUntil < 0 || isAfter(calculatedDate, limitDate)) {
          return null;
        }

        // Get localized name
        let localizedName = date.name;
        if (language === 'en' && date.name_en) localizedName = date.name_en;
        if (language === 'es' && date.name_es) localizedName = date.name_es;
        if (language === 'it' && date.name_it) localizedName = date.name_it;

        // Get localized description
        let localizedDescription = date.description || '';
        if (language === 'en' && date.description_en) localizedDescription = date.description_en;
        if (language === 'es' && date.description_es) localizedDescription = date.description_es;
        if (language === 'it' && date.description_it) localizedDescription = date.description_it;

        return {
          ...date,
          calculatedDate,
          daysUntil,
          localizedName,
          localizedDescription,
        };
      })
      .filter((date): date is UpcomingCelebration => date !== null)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [dates, daysAhead, i18n.language]);

  const closestDate = upcomingDates[0] || null;

  return {
    upcomingDates,
    closestDate,
    isLoading,
    error,
  };
};
