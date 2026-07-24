import type { ConfigContext, ExpoConfig } from 'expo/config';

const APP_ENVIRONMENTS = ['local', 'development', 'staging', 'production'] as const;
type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

function readEnvironment(): AppEnvironment {
  const value = process.env.APP_ENV ?? 'local';
  if (!APP_ENVIRONMENTS.includes(value as AppEnvironment)) {
    throw new Error(`APP_ENV inválido: ${value}`);
  }
  return value as AppEnvironment;
}

function readApiBaseUrl(environment: AppEnvironment): string {
  const value = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';
  const url = new URL(value);

  if (url.pathname.replace(/\/+$/, '').endsWith('/api/v1')) {
    throw new Error('EXPO_PUBLIC_API_URL debe terminar antes de /api/v1.');
  }
  if (
    (environment === 'staging' || environment === 'production') &&
    url.protocol !== 'https:'
  ) {
    throw new Error(`${environment} requiere una URL HTTPS.`);
  }
  return value.replace(/\/+$/, '');
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const environment = readEnvironment();
  const version = process.env.APP_VERSION ?? '0.1.0';

  return {
    ...config,
    name: 'GymBox',
    slug: 'escuela-de-box-rd',
    version,
    scheme: 'gymbox',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    icon: './assets/icon.png',
    runtimeVersion: { policy: 'appVersion' },
    experiments: { typedRoutes: true },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'mx.com.gymbox.mobile',
    },
    android: {
      package: 'mx.com.gymbox.mobile',
      predictiveBackGestureEnabled: true,
      adaptiveIcon: {
        backgroundColor: '#F8FAFC',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#F8FAFC',
          image: './assets/splash-icon.png',
          imageWidth: 160,
          resizeMode: 'contain',
        },
      ],
    ],
    extra: {
      eas: {
        projectId: 'd41e8f3e-a692-43e0-ab5b-fd53b06de939',
      },
      environment,
      apiBaseUrl: readApiBaseUrl(environment),
      appVersion: version,
      buildNumber: process.env.APP_BUILD ?? 'local',
      commit: process.env.APP_COMMIT ?? 'unknown',
      enableDemoSession: process.env.EXPO_PUBLIC_ENABLE_DEMO_SESSION ?? 'false',
    },
  };
};
