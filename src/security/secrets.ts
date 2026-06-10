import { SECRET_PATTERNS } from '../state';

export function scanForSecrets(text: string): Array<{ type: string; match: string }> {
  if (!text) return [];
  const found: Array<{ type: string; match: string }> = [];
  for (const p of SECRET_PATTERNS) {
    p.regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = p.regex.exec(text)) !== null) {
      found.push({ type: p.name, match: m[0].substring(0, 40) });
    }
  }
  return found;
}
