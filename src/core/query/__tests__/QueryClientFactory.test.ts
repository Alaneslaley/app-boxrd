import { ApiError } from '@/core/http';

import { createQueryClient, shouldRetryQuery } from '../QueryClientFactory';

describe('QueryClientFactory', () => {
  it.each([401, 403, 409, 422])('no reintenta HTTP %i', (status) => {
    const error = new ApiError(status, 'ERROR', 'Error', undefined, undefined, undefined);
    expect(shouldRetryQuery(0, error)).toBe(false);
  });

  it('permite sólo un reintento para un 5xx', () => {
    const error = new ApiError(503, 'TEMPORARY', 'Temporal', undefined, undefined, undefined);
    expect(shouldRetryQuery(0, error)).toBe(true);
    expect(shouldRetryQuery(1, error)).toBe(false);
  });

  it('configura todas las mutaciones con retry cero', () => {
    const options = createQueryClient().getDefaultOptions();
    expect(options.mutations?.retry).toBe(0);
  });
});
