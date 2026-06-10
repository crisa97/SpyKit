export function detectGraphQL(body: string): boolean {
  if (!body) return false;
  const s = typeof body === 'string' ? body : JSON.stringify(body);
  return /(query|mutation)\s+\w/.test(s) || (s.indexOf('"query"') >= 0 && s.indexOf('"variables"') >= 0);
}
