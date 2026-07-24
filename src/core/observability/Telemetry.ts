export interface Telemetry {
  captureException(error: unknown, context?: Readonly<Record<string, unknown>>): void;
  track(
    event: string,
    properties?: Readonly<Record<string, string | number | boolean>>,
  ): void;
}
