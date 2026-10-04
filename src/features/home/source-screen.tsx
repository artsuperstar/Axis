import { useLocalSearchParams } from 'expo-router';
import { sourceRequest } from '../source-navigation';
import { SourceScreen } from '../source-screen';

export function HomeSourceScreen() {
  const params = useLocalSearchParams<{ source: string; recordId?: string; date?: string }>();
  return <SourceScreen request={sourceRequest(params, 'Home')} origin="Home" />;
}
