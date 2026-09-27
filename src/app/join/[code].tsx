import { Redirect, useLocalSearchParams } from 'expo-router';

// Shared links: imposter://join/K7QX (or the web URL) → the join screen, code filled in.
export default function JoinLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <Redirect href={{ pathname: '/online/join', params: { code } }} />;
}
