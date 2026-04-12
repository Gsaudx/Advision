const BRAPI_BASE_URL = 'https://brapi.dev/api';

export function buildBrapiUrl(
  endpoint: string,
  params: Record<string, string> = {},
): string {
  const url = new URL(`${BRAPI_BASE_URL}${endpoint}`);
  const token = process.env.BRAPI_TOKEN;
  if (token) {
    url.searchParams.set('token', token);
  }
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}
