/** Parse repeated or comma-separated query params into a deduped string array. */
export function parseMultiQuery(param?: string | string[]): string[] {
  if (param === undefined || param === null) return [];
  const raw = Array.isArray(param) ? param : [param];
  const out: string[] = [];
  for (const item of raw) {
    for (const part of String(item).split(',')) {
      const trimmed = part.trim();
      if (trimmed) out.push(trimmed);
    }
  }
  return [...new Set(out)];
}
