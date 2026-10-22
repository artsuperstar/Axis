import { useDesignColors } from '@/components/design-system';
import { useTheme } from '@/hooks/use-theme';

/** Neutral v2 surfaces; existing selected-day and source marker colors stay scoped/provisional. */
export function useCalendarColors() { return { ...useTheme(), ...useDesignColors() }; }
