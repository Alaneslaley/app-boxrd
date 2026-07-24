import type { HttpClient } from './HttpClient';
import type { HttpRequest } from './HttpRequest';
import type { HttpResponse } from './HttpResponse';

type FakeResponder = (request: HttpRequest) => Promise<HttpResponse<unknown>>;

export class FakeHttpClient implements HttpClient {
  readonly requests: HttpRequest[] = [];
  private readonly responders: FakeResponder[] = [];

  enqueue<TResponse>(response: HttpResponse<TResponse>): void {
    this.responders.push(async () => response);
  }

  enqueueError(error: unknown): void {
    this.responders.push(async () => Promise.reject(error));
  }

  async request<TResponse>(request: HttpRequest): Promise<HttpResponse<TResponse>> {
    this.requests.push(request);
    const responder = this.responders.shift();
    if (!responder) throw new Error('FakeHttpClient no tiene una respuesta preparada.');
    return (await responder(request)) as HttpResponse<TResponse>;
  }
}
