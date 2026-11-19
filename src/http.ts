/** Minimal response contract shared by browser/server adapters and their test doubles. */
export interface HttpResponse {
  ok: boolean;
  status?: number;
  json?: () => Promise<unknown>;
}
export type Fetcher = (url: string, options: RequestInit) => Promise<HttpResponse>;
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
