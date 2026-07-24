import type { HttpRequest } from './HttpRequest';
import type { HttpResponse } from './HttpResponse';

export interface HttpClient {
  request<TResponse>(request: HttpRequest): Promise<HttpResponse<TResponse>>;
}
