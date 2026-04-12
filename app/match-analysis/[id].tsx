import { useLocalSearchParams } from 'expo-router';

import { MatchAnalysisScreen } from '@features/matches';

export default function MatchAnalysisRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <MatchAnalysisScreen matchId={id} />;
}
