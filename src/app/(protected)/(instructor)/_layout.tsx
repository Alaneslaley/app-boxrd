import { Stack } from 'expo-router';

export default function InstructorLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="students/index" options={{ title: 'Alumnos' }} />
      <Stack.Screen name="students/[studentId]" options={{ title: 'Ficha del alumno' }} />
      <Stack.Screen name="cash/index" options={{ title: 'Caja' }} />
      <Stack.Screen name="cash/open" options={{ title: 'Abrir caja' }} />
      <Stack.Screen name="cash/close" options={{ title: 'Cerrar caja' }} />
      <Stack.Screen name="payments/register" options={{ title: 'Registrar pago' }} />
      <Stack.Screen name="payments/[paymentId]" options={{ title: 'Pago' }} />
    </Stack>
  );
}
