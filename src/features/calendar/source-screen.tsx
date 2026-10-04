import { useLocalSearchParams } from 'expo-router';
import { sourceRequest } from '../source-navigation';
import { SourceScreen } from '../source-screen';

/** Launch the existing source screen and its existing adaptive editor/details, without duplicating actions. */
export function CalendarSourceScreen() {
  const params = useLocalSearchParams<{ source: string; recordId: string; date: string }>();
  return <SourceScreen request={sourceRequest(params, 'Calendar')} origin="Calendar" />;
}
