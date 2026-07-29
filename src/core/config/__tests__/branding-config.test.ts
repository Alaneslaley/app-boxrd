import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { ConfigContext } from 'expo/config';

import appConfig from '../../../../app.config';

const brandingAssets = [
  'assets/branding/app-icon-square.png',
  'assets/branding/app-icon-legacy-android.png',
  'assets/branding/adaptive-icon-foreground.png',
  'assets/branding/splash-logo-light.png',
  'assets/branding/splash-logo-dark.png',
  'assets/branding/favicon.png',
] as const;

describe('branding configuration', () => {
  it('resuelve los assets PNG de branding y no configura ICO para plataformas nativas', () => {
    for (const asset of brandingAssets) {
      expect(existsSync(resolve(process.cwd(), asset))).toBe(true);
    }

    const config = appConfig({ config: {} } as ConfigContext);

    expect(config.icon).toBe('./assets/branding/app-icon-square.png');
    expect(config.ios?.icon).toBe('./assets/branding/app-icon-square.png');
    expect(config.android?.icon).toBe('./assets/branding/app-icon-legacy-android.png');
    expect(config.android?.adaptiveIcon?.foregroundImage).toBe(
      './assets/branding/adaptive-icon-foreground.png',
    );
    expect(config.android?.adaptiveIcon?.monochromeImage).toBeUndefined();
    expect(config.web?.favicon).toBe('./assets/branding/favicon.png');
  });
});
