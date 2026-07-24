import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Ingresa un correo electrónico válido.'));

export const credentialsSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, 'Ingresa tu contraseña.')
    .max(200, 'La contraseña supera la longitud permitida.'),
});

export const authTokensSchema = z.object({
  tokenType: z
    .string()
    .refine(
      (value) => value.toLowerCase() === 'bearer',
      'El esquema de token no es compatible.',
    ),
  accessToken: z.string().min(1),
  expiresIn: z.number().int().nonnegative(),
  refreshToken: z.string().min(1),
});

export const userSnapshotSchema = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
  email: z.string().min(1),
  firstName: z.string(),
  lastName: z.string(),
  status: z.string().min(1),
  mustChangePassword: z.boolean(),
  authzVersion: z.number().int().nonnegative(),
  roles: z.array(z.string().min(1)),
  permissions: z.array(z.string().min(1)),
  branchName: z.string(),
});

export type CredentialsInput = z.input<typeof credentialsSchema>;
export type NormalizedCredentials = z.output<typeof credentialsSchema>;
