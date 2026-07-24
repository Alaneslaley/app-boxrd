import { z } from 'zod';

export const appEnvironmentSchema = z.enum([
  'local',
  'development',
  'staging',
  'production',
]);

const publicBooleanSchema = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

export const environmentSchema = z
  .object({
    environment: appEnvironmentSchema,
    apiBaseUrl: z.string().url(),
    appVersion: z.string().min(1),
    buildNumber: z.string().min(1),
    commit: z.string().min(1),
    enableDemoSession: publicBooleanSchema,
  })
  .superRefine((value, context) => {
    const url = new URL(value.apiBaseUrl);
    if (url.pathname.replace(/\/+$/, '').endsWith('/api/v1')) {
      context.addIssue({
        code: 'custom',
        path: ['apiBaseUrl'],
        message: 'La URL base debe terminar antes de /api/v1.',
      });
    }
    if (
      (value.environment === 'staging' || value.environment === 'production') &&
      url.protocol !== 'https:'
    ) {
      context.addIssue({
        code: 'custom',
        path: ['apiBaseUrl'],
        message: `${value.environment} requiere HTTPS.`,
      });
    }
  });

export type Environment = Readonly<z.infer<typeof environmentSchema>>;

export function parseEnvironment(input: unknown): Environment {
  return environmentSchema.parse(input);
}
