import { randomUUID } from 'expo-crypto';

import type { IdempotencyKey } from './IdempotencyKey';
import type { IdempotencyKeyFactory } from './IdempotencyKeyFactory';

export class ExpoIdempotencyKeyFactory implements IdempotencyKeyFactory {
  create(): IdempotencyKey {
    return randomUUID() as IdempotencyKey;
  }
}
