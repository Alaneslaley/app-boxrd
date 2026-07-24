import type { SessionCredentials } from '@/core/session';

import type { Credentials } from '../model/Credentials';
import { credentialsSchema } from '../api/auth-schemas';

export type SignInAction = (credentials: SessionCredentials) => Promise<void>;

export class SignInService {
  constructor(private readonly signInAction: SignInAction) {}

  async execute(credentials: Credentials): Promise<void> {
    const normalized = credentialsSchema.parse(credentials);
    await this.signInAction(normalized);
  }
}
