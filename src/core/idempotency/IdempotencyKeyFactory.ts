import type { IdempotencyKey } from './IdempotencyKey';

export interface IdempotencyKeyFactory {
  create(): IdempotencyKey;
}
