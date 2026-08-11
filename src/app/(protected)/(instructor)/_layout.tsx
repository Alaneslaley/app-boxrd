import { Stack } from 'expo-router';
import { usePreventScreenCapture } from 'expo-screen-capture';

export default function InstructorLayout() {
  usePreventScreenCapture('gymbox-internal');
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="students/index" options={{ title: 'Alumnos' }} />
      <Stack.Screen name="students/[studentId]" options={{ title: 'Ficha del alumno' }} />
      <Stack.Screen name="attendance/index" options={{ title: 'Asistencia de hoy' }} />
      <Stack.Screen name="attendance/check-in" options={{ title: 'Registrar check-in' }} />
      <Stack.Screen name="attendance/student/[studentId]" options={{ title: 'Historial de asistencia' }} />
      <Stack.Screen name="cash/index" options={{ title: 'Caja' }} />
      <Stack.Screen name="cash/open" options={{ title: 'Abrir caja' }} />
      <Stack.Screen name="cash/close" options={{ title: 'Cerrar caja' }} />
      <Stack.Screen name="payments/register" options={{ title: 'Registrar pago' }} />
      <Stack.Screen name="payments/[paymentId]" options={{ title: 'Pago' }} />
    </Stack>
  );
}
