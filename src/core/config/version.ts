import type { Environment } from './environment.schema';

export function formatBuildIdentifier(environment: Environment): string {
  return `${environment.appVersion} (${environment.buildNumber}) · ${environment.environment} · ${environment.commit.slice(0, 8)}`;
}
