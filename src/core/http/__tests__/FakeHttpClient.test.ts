import { FakeHttpClient } from '../FakeHttpClient';

describe('FakeHttpClient', () => {
  it('registra solicitudes y devuelve la respuesta preparada', async () => {
    const client = new FakeHttpClient();
    client.enqueue({
      status: 200,
      headers: new Headers(),
      data: { ready: true },
    });

    await expect(client.request({ method: 'GET', path: '/health' })).resolves.toMatchObject({
      data: { ready: true },
    });
    expect(client.requests).toHaveLength(1);
  });
});
