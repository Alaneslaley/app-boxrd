import Constants from 'expo-constants';

import { parseEnvironment, type Environment } from './environment.schema';

let cachedEnvironment: Environment | undefined;

export function getEnvironment(): Environment {
  cachedEnvironment ??= parseEnvironment(Constants.expoConfig?.extra);
  return cachedEnvironment;
}
