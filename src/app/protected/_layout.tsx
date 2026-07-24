import { Stack } from 'expo-router';

export default function ProtectedLayout() {
  return <Stack screenOptions={{ headerBackTitle: 'Atrás', title: 'Área protegida' }} />;
}
