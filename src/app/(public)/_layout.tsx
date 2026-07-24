import { Stack } from 'expo-router';

export default function PublicLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="sign-in"
        options={{ headerShown: false, title: 'Iniciar sesión' }}
      />
    </Stack>
  );
}
