export type HttpResponse<TResponse> = Readonly<{
  status: number;
  headers: Headers;
  data: TResponse;
}>;
