import { Stack } from 'expo-router';

export default function InstructorLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="students/index" options={{ title: 'Alumnos' }} />
      <Stack.Screen name="students/[studentId]" options={{ title: 'Ficha del alumno' }} />
    </Stack>
  );
}
