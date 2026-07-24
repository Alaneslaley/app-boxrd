import {
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from 'expo-router/testing-library';
import {
  Stack,
  router,
  type Href,
} from 'expo-router';
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  Pressable,
  Text,
  View,
} from 'react-native';

type TestAuthContextValue = Readonly<{
  authenticated: boolean;
  setAuthenticated(authenticated: boolean): void;
}>;

const TestAuthContext = createContext<TestAuthContextValue | undefined>(
  undefined,
);

let initiallyAuthenticated = false;

function useTestAuth(): TestAuthContextValue {
  const context = useContext(TestAuthContext);
  if (!context) throw new Error('Falta TestAuthContext.');
  return context;
}

function TestAuthProvider({ children }: PropsWithChildren) {
  const [authenticated, setAuthenticated] = useState(
    initiallyAuthenticated,
  );
  const value = useMemo(
    () => ({ authenticated, setAuthenticated }),
    [authenticated],
  );

  return (
    <TestAuthContext.Provider value={value}>
      {children}
    </TestAuthContext.Provider>
  );
}

function RootLayout() {
  const { authenticated } = useTestAuth();

  return (
    <Stack screenOptions={{ animation: 'none', headerShown: false }}>
      <Stack.Protected guard={!authenticated}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={authenticated}>
        <Stack.Screen name="protected" />
      </Stack.Protected>
    </Stack>
  );
}

function RootLayoutWithProvider() {
  return (
    <TestAuthProvider>
      <RootLayout />
    </TestAuthProvider>
  );
}

function ProtectedLayout() {
  return (
    <Stack screenOptions={{ animation: 'none', headerShown: false }} />
  );
}

function SignInRoute() {
  return (
    <View>
      <Text>Inicio de sesión de prueba</Text>
    </View>
  );
}

function ProtectedHomeRoute() {
  return (
    <View>
      <Text>Inicio protegido de prueba</Text>
      <Pressable
        accessibilityLabel="Abrir detalle protegido"
        accessibilityRole="button"
        onPress={() => router.push('/protected/details' as Href)}
      >
        <Text>Abrir detalle protegido</Text>
      </Pressable>
    </View>
  );
}

function ProtectedDetailsRoute() {
  const { setAuthenticated } = useTestAuth();

  return (
    <View>
      <Text>Detalle protegido de prueba</Text>
      <Pressable
        accessibilityLabel="Cambiar a sesión anónima"
        accessibilityRole="button"
        onPress={() => setAuthenticated(false)}
      >
        <Text>Cambiar a sesión anónima</Text>
      </Pressable>
    </View>
  );
}

const routes = {
  _layout: RootLayoutWithProvider,
  'sign-in': SignInRoute,
  'protected/_layout': ProtectedLayout,
  'protected/index': ProtectedHomeRoute,
  'protected/details': ProtectedDetailsRoute,
} as const;

async function mountRouter(
  initialUrl: string,
  authenticated: boolean,
) {
  initiallyAuthenticated = authenticated;

  /*
   * Expo Router 57.0.8 agrega getPathname() al resultado de render(), mientras
   * RNTL 14 devuelve una Promise. Conservamos el thenable original para no
   * perder esos helpers al hacer await.
   */
  const result = renderRouter(routes, { initialUrl });
  await result;

  return { result };
}

describe('Stack.Protected', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('redirige un deep link protegido a login sin sesión', async () => {
    const { result } = await mountRouter('/protected/details', false);

    await waitFor(() => expect(result.getPathname()).toBe('/sign-in'));
    expect(
      screen.getByText('Inicio de sesión de prueba'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText('Detalle protegido de prueba'),
    ).toBeNull();
  });

  it('permite abrir la ruta protegida con sesión', async () => {
    const { result } = await mountRouter('/protected', true);

    await waitFor(() => expect(result.getPathname()).toBe('/protected'));
    expect(
      screen.getByText('Inicio protegido de prueba'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText('Inicio de sesión de prueba'),
    ).toBeNull();
  });

  it('elimina el historial protegido cuando la sesión pasa a anonymous', async () => {
    const { result } = await mountRouter('/protected', true);

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Abrir detalle protegido',
      }),
    );
    await waitFor(() =>
      expect(result.getPathname()).toBe('/protected/details'),
    );
    expect(router.canGoBack()).toBe(true);

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Cambiar a sesión anónima',
      }),
    );

    await waitFor(() => expect(result.getPathname()).toBe('/sign-in'));
    expect(router.canGoBack()).toBe(false);
    expect(
      screen.queryByText('Inicio protegido de prueba'),
    ).toBeNull();
    expect(
      screen.queryByText('Detalle protegido de prueba'),
    ).toBeNull();
  });
});
