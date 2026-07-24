import { AccessDeniedState, AppButton, Screen } from '@/shared';

export function AccessDeniedDemoScreen({ onGoBack }: { onGoBack: () => void }) {
  return (
    <Screen scroll={false}>
      <AccessDeniedState
        action={<AppButton label="Volver a una ruta segura" onPress={onGoBack} />}
      />
    </Screen>
  );
}
